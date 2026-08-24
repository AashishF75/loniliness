import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, Radio, X, AlertTriangle } from 'lucide-react';
import { Button } from './ui/Button';
import { StatusPill } from './ui/StatusPill';
import { Avatar } from './ui/Avatar';
import { socketService } from '../services/socketService';
import type { LocationData } from '../hooks/useLiveLocation';

interface FamilyMapProps {
  parentId: string;
  parentName: string;
  isSharingActive: boolean;
  onClose?: () => void;
}

export function FamilyMap({ parentId, parentName, isSharingActive, onClose }: FamilyMapProps) {
  const { t } = useTranslation();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [isStale, setIsStale] = useState<boolean>(false);
  const [statusState, setStatusState] = useState<'live' | 'updating' | 'outdated' | 'offline'>('updating');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [initialCentered, setInitialCentered] = useState<boolean>(false);

  // Validate coordinates
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

  // Helper to create parent marker DivIcon
  const createParentMarkerIcon = (name: string, stale: boolean) => {
    const initial = name ? name[0].toUpperCase() : 'P';
    const bgClass = stale ? 'bg-amber-500 border-amber-200' : 'bg-brand-600 border-white';
    const pingClass = stale ? 'bg-amber-400/20' : 'bg-brand-500/30 animate-ping';

    return L.divIcon({
      className: 'custom-parent-marker-wrapper',
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px;">
          <div class="${pingClass}" style="position: absolute; width: 44px; height: 44px; borderRadius: 50%;"></div>
          <div class="${bgClass}" style="width: 40px; height: 40px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 18px; position: relative; z-index: 10;">
            ${initial}
          </div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22]
    });
  };

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || leafletMapRef.current) return;

    // Default view set to New Delhi center initially until GPS fix
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: true
    }).setView([28.6139, 77.209], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    leafletMapRef.current = map;

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // 2. Connect Socket & Join Parent Room
  useEffect(() => {
    if (!parentId || !isSharingActive) return;

    let isMounted = true;
    const socket = socketService.connect();

    socketService.joinLocationRoom(parentId).then((res) => {
      if (!isMounted) return;
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to join location room');
        setStatusState('offline');
      }
    });

    const handleIncomingLocation = (data: LocationData & { parentId?: string }) => {
      if (!isMounted) return;
      if (data.parentId && data.parentId !== parentId) return;

      if (isValidLocation(data.latitude, data.longitude)) {
        const now = Date.now();
        setCurrentLocation(data);
        setLastUpdated(now);
        setIsStale(false);
        setStatusState('live');
        setErrorMessage(null);
      }
    };

    const handleLocationError = (data: { error?: string }) => {
      if (!isMounted) return;
      setErrorMessage(data.error || 'Location error');
      setStatusState('offline');
    };

    const handleDisconnect = () => {
      if (!isMounted) return;
      setStatusState('offline');
    };

    socket.on('parent:location:update', handleIncomingLocation);
    socket.on('location:error', handleLocationError);
    socket.on('disconnect', handleDisconnect);

    return () => {
      isMounted = false;
      socket.off('parent:location:update', handleIncomingLocation);
      socket.off('location:error', handleLocationError);
      socket.off('disconnect', handleDisconnect);
    };
  }, [parentId, isSharingActive]);

  // 3. Update Parent Marker & Accuracy Circle with Smooth Animation
  useEffect(() => {
    if (!currentLocation || !leafletMapRef.current) return;

    const map = leafletMapRef.current;
    const targetLat = currentLocation.latitude;
    const targetLng = currentLocation.longitude;
    const accuracy = currentLocation.accuracy;

    // First location fix: Center camera automatically
    if (!initialCentered) {
      map.setView([targetLat, targetLng], 16);
      setInitialCentered(true);
    }

    const icon = createParentMarkerIcon(parentName, isStale);

    // If marker doesn't exist yet, create it
    if (!markerRef.current) {
      const marker = L.marker([targetLat, targetLng], { icon }).addTo(map);
      marker.bindPopup(`<b>${parentName}</b><br/>${isStale ? t('family.statusOutdated') : t('family.statusLive')}`);
      markerRef.current = marker;

      // Accuracy Circle
      if (accuracy && accuracy > 0) {
        const circle = L.circle([targetLat, targetLng], {
          radius: accuracy,
          color: isStale ? '#f59e0b' : '#2563eb',
          fillColor: isStale ? '#fcd34d' : '#60a5fa',
          fillOpacity: 0.15,
          weight: 1.5
        }).addTo(map);
        circleRef.current = circle;
      }
    } else {
      // Smooth Marker Movement Interpolation
      const startPos = markerRef.current.getLatLng();
      const startLat = startPos.lat;
      const startLng = startPos.lng;
      const startTime = performance.now();
      const duration = 800; // 800ms smooth transition

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 2); // Ease-out

        const currentLat = startLat + (targetLat - startLat) * ease;
        const currentLng = startLng + (targetLng - startLng) * ease;

        if (markerRef.current) {
          markerRef.current.setLatLng([currentLat, currentLng]);
          markerRef.current.setIcon(icon);
        }

        if (circleRef.current) {
          circleRef.current.setLatLng([currentLat, currentLng]);
          if (accuracy && accuracy > 0) {
            circleRef.current.setRadius(accuracy);
            circleRef.current.setStyle({
              color: isStale ? '#f59e0b' : '#2563eb',
              fillColor: isStale ? '#fcd34d' : '#60a5fa'
            });
          }
        }

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(animate);
        }
      };

      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(animate);

      // Handle accuracy circle creation/update
      if (circleRef.current && (!accuracy || accuracy <= 0)) {
        circleRef.current.remove();
        circleRef.current = null;
      } else if (!circleRef.current && accuracy && accuracy > 0) {
        const circle = L.circle([targetLat, targetLng], {
          radius: accuracy,
          color: isStale ? '#f59e0b' : '#2563eb',
          fillColor: isStale ? '#fcd34d' : '#60a5fa',
          fillOpacity: 0.15,
          weight: 1.5
        }).addTo(map);
        circleRef.current = circle;
      }
    }
  }, [currentLocation, isStale, parentName]);

  // 4. Stale Location Monitor (30-second threshold)
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastUpdated) {
        const diff = Date.now() - lastUpdated;
        if (diff > 30000) {
          setIsStale(true);
          setStatusState('outdated');
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [lastUpdated]);

  // Handler to center camera on parent
  const handleCenterOnParent = () => {
    if (currentLocation && leafletMapRef.current) {
      leafletMapRef.current.flyTo([currentLocation.latitude, currentLocation.longitude], 16, {
        duration: 1
      });
    }
  };

  return (
    <div className="flex flex-col gap-4 bg-white p-4 md:p-6 rounded-3xl border border-gray-200 shadow-md">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <Avatar name={parentName} size="md" colorScheme="brand" />
          <div>
            <h3 className="text-xl md:text-2xl font-extrabold text-gray-900">{parentName}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <StatusPill
                status={
                  statusState === 'live' ? 'live' :
                  statusState === 'updating' ? 'pending' :
                  statusState === 'outdated' ? 'outdated' : 'offline'
                }
                label={
                  statusState === 'live' ? t('family.statusLive') :
                  statusState === 'updating' ? t('family.statusUpdating') :
                  statusState === 'outdated' ? t('family.statusOutdated') : t('family.statusOffline')
                }
                size="sm"
              />
              {lastUpdated && (
                <span className="text-xs text-gray-400 font-medium hidden sm:inline">
                  • {t('family.lastUpdated', { time: new Date(lastUpdated).toLocaleTimeString() })}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentLocation && (
            <Button
              onClick={handleCenterOnParent}
              variant="outline"
              className="px-3 py-2 text-sm font-bold border-brand-200 text-brand-700 hover:bg-brand-50 rounded-xl flex items-center gap-1.5"
            >
              <Navigation className="w-4 h-4" /> {t('family.centerOnParent')}
            </Button>
          )}
          {onClose && (
            <Button
              onClick={onClose}
              variant="outline"
              className="p-2 border-gray-200 text-gray-500 hover:bg-gray-100 rounded-xl"
            >
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Stale location warning banner */}
      {isStale && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>{t('family.statusOutdated')}</span>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-2.5 rounded-xl text-sm font-bold">
          {errorMessage}
        </div>
      )}

      {/* Map Container */}
      <div className="relative w-full h-[360px] md:h-[480px] rounded-2xl overflow-hidden border border-gray-200 shadow-inner">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Overlay loading state until first location */}
        {!currentLocation && (
          <div className="absolute inset-0 bg-gray-50/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6 text-center">
            <Radio className="w-12 h-12 text-brand-600 animate-pulse mb-3" />
            <p className="text-xl font-extrabold text-gray-900 mb-1">{t('family.locationUpdatingDesc')}</p>
            <p className="text-sm text-gray-500">{t('family.statusUpdating')}</p>
          </div>
        )}
      </div>

      {/* GPS Info Footer Bar (Dev/Testing & Accuracy Details) */}
      {currentLocation && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-100 text-xs md:text-sm font-medium text-gray-600">
          <div>
            <span className="text-gray-400 block text-[11px]">Latitude</span>
            <span className="font-mono font-bold text-gray-900">{currentLocation.latitude.toFixed(6)}</span>
          </div>
          <div>
            <span className="text-gray-400 block text-[11px]">Longitude</span>
            <span className="font-mono font-bold text-gray-900">{currentLocation.longitude.toFixed(6)}</span>
          </div>
          <div>
            <span className="text-gray-400 block text-[11px]">GPS Accuracy</span>
            <span className="font-bold text-gray-900">
              {currentLocation.accuracy ? `±${Math.round(currentLocation.accuracy)}m` : 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-gray-400 block text-[11px]">Status</span>
            <span className={`font-bold ${isStale ? 'text-amber-600' : 'text-green-600'}`}>
              {isStale ? 'Outdated' : 'Live Stream Active'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
