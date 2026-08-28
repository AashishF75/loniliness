import { useState, useEffect, useRef } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Geolocation, type PermissionStatus } from '@capacitor/geolocation';
import { socketService } from '../services/socketService';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  timestamp: number;
  serverTimestamp?: number;
}

export type GPSPermissionState = 
  | 'idle'
  | 'checking'
  | 'prompt'
  | 'granted'
  | 'denied'
  | 'unavailable'
  | 'error';

export type SharingStatus = 
  | 'stopped'
  | 'waiting_for_consent'
  | 'requesting_permission'
  | 'permission_denied'
  | 'waiting_for_gps'
  | 'active'
  | 'unavailable'
  | 'error';

interface BackgroundLocationPluginInterface {
  startBackgroundLocation(): Promise<{ success: boolean }>;
  stopBackgroundLocation(): Promise<{ success: boolean }>;
  isBackgroundLocationActive(): Promise<{ active: boolean }>;
  addListener(
    eventName: 'onLocationUpdate',
    listenerFunc: (data: LocationData) => void
  ): Promise<{ remove: () => void }>;
}

const BackgroundLocation = registerPlugin<BackgroundLocationPluginInterface>('BackgroundLocation');

interface UseLiveLocationProps {
  isParent: boolean;
  shareLiveLocation: boolean;
  isLocationSharingActive: boolean;
  targetParentId?: string; // For family members watching a parent
}

export function useLiveLocation({
  isParent,
  shareLiveLocation,
  isLocationSharingActive,
  targetParentId
}: UseLiveLocationProps) {
  const [permissionState, setPermissionState] = useState<GPSPermissionState>('idle');
  const [sharingStatus, setSharingStatus] = useState<SharingStatus>('stopped');
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isStale, setIsStale] = useState<boolean>(false);

  const watchIdRef = useRef<string | number | null>(null);
  const isWatchingRef = useRef<boolean>(false);
  const bgListenerRef = useRef<{ remove: () => void } | null>(null);

  // Validate location coordinates
  const isValidLocation = (lat: number, lng: number): boolean => {
    return (
      typeof lat === 'number' &&
      !isNaN(lat) &&
      lat >= -90 &&
      lat <= 90 &&
      typeof lng === 'number' &&
      !isNaN(lng) &&
      lng >= -180 &&
      lng <= 180
    );
  };

  // Stop position watching helper
  const stopWatching = async () => {
    if (bgListenerRef.current) {
      try {
        bgListenerRef.current.remove();
      } catch (e) {
        console.warn('Error removing bg listener:', e);
      }
      bgListenerRef.current = null;
    }

    if (Capacitor.getPlatform() === 'android') {
      try {
        await BackgroundLocation.stopBackgroundLocation();
      } catch (e) {
        console.warn('Error stopping Android background location service:', e);
      }
    }

    if (watchIdRef.current !== null) {
      try {
        if (typeof watchIdRef.current === 'string') {
          await Geolocation.clearWatch({ id: watchIdRef.current });
        } else if (typeof watchIdRef.current === 'number' && typeof window !== 'undefined' && 'geolocation' in navigator) {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }
      } catch (err) {
        console.warn('Error clearing position watch:', err);
      }
      watchIdRef.current = null;
    }
    isWatchingRef.current = false;
  };

  // -------------------------------------------------------------
  // SENIOR / PARENT GPS WATCHER (FOREGROUND & BACKGROUND SERVICE)
  // -------------------------------------------------------------
  useEffect(() => {
    if (!isParent) return;

    // Consent Rule: BOTH shareLiveLocation and isLocationSharingActive must be true
    const shouldShare = shareLiveLocation === true && isLocationSharingActive === true;

    if (!shouldShare) {
      stopWatching();
      setSharingStatus('stopped');
      setErrorMessage(null);
      return;
    }

    let isMounted = true;

    const startParentLocationWatcher = async () => {
      setSharingStatus('requesting_permission');
      setErrorMessage(null);

      try {
        let hasPermission = false;

        // 1. Check & Request Permissions
        try {
          const permStatus: PermissionStatus = await Geolocation.checkPermissions();
          if (permStatus.location === 'granted' || permStatus.coarseLocation === 'granted') {
            hasPermission = true;
          } else if (permStatus.location === 'prompt' || permStatus.location === 'prompt-with-rationale') {
            const reqStatus = await Geolocation.requestPermissions();
            if (reqStatus.location === 'granted' || reqStatus.coarseLocation === 'granted') {
              hasPermission = true;
            }
          }
        } catch (capErr) {
          console.log('Capacitor check unavailable, checking browser API', capErr);
        }

        // 2. Browser fallback permission check
        if (!hasPermission && typeof window !== 'undefined' && 'geolocation' in navigator) {
          hasPermission = true;
        }

        if (!hasPermission) {
          if (isMounted) {
            setPermissionState('denied');
            setSharingStatus('permission_denied');
            setErrorMessage('Location permission denied');
          }
          return;
        }

        if (isMounted) {
          setPermissionState('granted');
          setSharingStatus('waiting_for_gps');
        }

        await stopWatching();

        const handlePosition = (pos: any) => {
          if (!isMounted) return;

          const lat = pos?.latitude !== undefined ? pos.latitude : pos?.coords?.latitude;
          const lng = pos?.longitude !== undefined ? pos.longitude : pos?.coords?.longitude;
          const accuracy = pos?.accuracy !== undefined ? pos.accuracy : (pos?.coords?.accuracy ?? null);
          const speed = pos?.speed !== undefined ? pos.speed : (pos?.coords?.speed ?? null);
          const heading = pos?.heading !== undefined ? pos.heading : (pos?.coords?.heading ?? null);
          const timestamp = pos?.timestamp || pos?.time || Date.now();

          if (!isValidLocation(lat, lng)) {
            console.warn('Invalid GPS coordinates');
            return;
          }

          const locData: LocationData = {
            latitude: lat,
            longitude: lng,
            accuracy,
            speed,
            heading,
            timestamp
          };

          setCurrentLocation(locData);
          setLastUpdated(Date.now());
          setSharingStatus('active');
          setErrorMessage(null);

          // Transmit location update via Socket.IO
          socketService.sendParentLocationUpdate(locData).catch((err) => {
            console.warn('Socket transmission error:', err);
          });
        };

        const handleError = (err: any) => {
          if (!isMounted) return;
          setSharingStatus('unavailable');
          setErrorMessage(err?.message || 'GPS location unavailable');
        };

        // Platform-specific execution
        if (Capacitor.getPlatform() === 'android') {
          // Android Native Foreground Location Service
          try {
            await BackgroundLocation.startBackgroundLocation();
            const listenerHandle = await BackgroundLocation.addListener('onLocationUpdate', (data: LocationData) => {
              handlePosition(data);
            });
            bgListenerRef.current = listenerHandle;
            isWatchingRef.current = true;
          } catch (androidErr) {
            console.warn('Android background location failed, falling back to Geolocation plugin:', androidErr);
            const watchId = await Geolocation.watchPosition(
              { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 },
              (position, err) => {
                if (err) handleError(err);
                else if (position) handlePosition(position);
              }
            );
            watchIdRef.current = watchId;
            isWatchingRef.current = true;
          }
        } else {
          // Standard Browser / Web execution
          try {
            const watchId = await Geolocation.watchPosition(
              { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 },
              (position, err) => {
                if (err) handleError(err);
                else if (position) handlePosition(position);
              }
            );
            watchIdRef.current = watchId;
            isWatchingRef.current = true;
          } catch (capWatchErr) {
            if (typeof window !== 'undefined' && 'geolocation' in navigator) {
              const navWatchId = navigator.geolocation.watchPosition(
                handlePosition,
                handleError,
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 }
              );
              watchIdRef.current = navWatchId;
              isWatchingRef.current = true;
            } else {
              setSharingStatus('unavailable');
              setErrorMessage('Geolocation API not supported on this device');
            }
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setSharingStatus('error');
          setErrorMessage(err?.message || 'Failed to start location sharing');
        }
      }
    };

    startParentLocationWatcher();

    return () => {
      isMounted = false;
      stopWatching();
    };
  }, [isParent, shareLiveLocation, isLocationSharingActive]);

  // -------------------------------------------------------------
  // FAMILY MEMBER RECIPIENT LISTENER
  // -------------------------------------------------------------
  useEffect(() => {
    if (isParent || !targetParentId) return;

    let isMounted = true;

    const socket = socketService.connect();

    socketService.joinLocationRoom(targetParentId).then((res) => {
      if (!isMounted) return;
      if (!res.success) {
        setErrorMessage(res.error || 'Unable to join location room');
      }
    });

    const handleIncomingLocation = (data: LocationData & { parentId?: string }) => {
      if (!isMounted) return;
      if (data.parentId && data.parentId !== targetParentId) return;

      if (isValidLocation(data.latitude, data.longitude)) {
        setCurrentLocation(data);
        setLastUpdated(Date.now());
        setIsStale(false);
      }
    };

    const handleLocationError = (data: { error?: string }) => {
      if (!isMounted) return;
      setErrorMessage(data.error || 'Location stream error');
    };

    socket.on('parent:location:update', handleIncomingLocation);
    socket.on('location:error', handleLocationError);

    return () => {
      isMounted = false;
      socket.off('parent:location:update', handleIncomingLocation);
      socket.off('location:error', handleLocationError);
    };
  }, [isParent, targetParentId]);

  // -------------------------------------------------------------
  // STALE DATA MONITOR
  // -------------------------------------------------------------
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastUpdated) {
        const timeDiff = Date.now() - lastUpdated;
        setIsStale(timeDiff > 30000);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [lastUpdated]);

  return {
    permissionState,
    sharingStatus,
    currentLocation,
    lastUpdated,
    errorMessage,
    isStale,
    stopWatching
  };
}
