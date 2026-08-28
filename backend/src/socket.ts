import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from './db';
import { canViewParentLocation, canParentShareLocation } from './controllers/family.controller';

export interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    name: string;
    phone?: string | null;
    role: string;
    status: string;
  };
}

export function initializeSocket(server: HttpServer): Server {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // JWT Authentication Middleware for Socket.IO
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      let token: string | undefined = undefined;

      const authHandshake = socket.handshake.auth?.token;
      const headerAuth = socket.handshake.headers?.authorization;

      if (authHandshake && typeof authHandshake === 'string') {
        token = authHandshake;
      } else if (headerAuth && typeof headerAuth === 'string') {
        token = headerAuth;
      }

      if (!token) {
        return next(new Error('Authentication failed: Missing token'));
      }

      if (token.startsWith('Bearer ')) {
        token = token.slice(7).trim();
      }

      if (!token) {
        return next(new Error('Authentication failed: Malformed authentication data'));
      }

      let decoded: any;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      } catch (err) {
        return next(new Error('Authentication failed: Invalid or expired token'));
      }

      if (!decoded || !decoded.id) {
        return next(new Error('Authentication failed: Malformed authentication data'));
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, name: true, phone: true, role: true, status: true }
      });

      if (!user) {
        return next(new Error('Authentication failed: User not found'));
      }

      if (user.status === 'SUSPENDED') {
        return next(new Error('Authentication failed: Account suspended'));
      }

      // Attach authenticated user to socket
      socket.data.user = user;
      socket.user = user;

      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      return next(new Error('Authentication failed: Internal server error'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const user = socket.data.user || socket.user;

    // Handle joining location room (e.g. location:<parentId>)
    const handleJoinLocation = async (
      data: any,
      callback?: (response: { success: boolean; message?: string; error?: string }) => void
    ) => {
      const parentId = typeof data === 'string' ? data : data?.parentId;

      if (!user) {
        const errorMsg = 'Unauthorized: Unauthenticated socket connection';
        socket.emit('location:error', { error: errorMsg });
        if (callback) callback({ success: false, error: errorMsg });
        return;
      }

      if (!parentId || typeof parentId !== 'string') {
        const errorMsg = 'Invalid request: Parent ID is required';
        socket.emit('location:error', { error: errorMsg });
        if (callback) callback({ success: false, error: errorMsg });
        return;
      }

      // Security Checks
      if (user.role === 'SENIOR') {
        // Prevent SENIOR A -> SENIOR B location (TEST 10)
        if (user.id !== parentId) {
          const errorMsg = 'Forbidden: Senior accounts cannot access other seniors\' location rooms';
          socket.emit('location:error', { error: errorMsg });
          if (callback) callback({ success: false, error: errorMsg });
          return;
        }

        // Check if senior has location sharing enabled & active on at least one relationship
        const canShare = await canParentShareLocation(user.id);
        if (!canShare) {
          const errorMsg = 'Forbidden: Location sharing is disabled or inactive';
          socket.emit('location:error', { error: errorMsg });
          if (callback) callback({ success: false, error: errorMsg });
          return;
        }

        socket.join(`location:${parentId}`);
        socket.emit('location:joined', { room: `location:${parentId}` });

        // Hydrate with last known location if available in database
        try {
          const parentUser = await prisma.user.findUnique({
            where: { id: parentId },
            select: { latitude: true, longitude: true, updatedAt: true }
          });
          if (parentUser && parentUser.latitude !== null && parentUser.longitude !== null) {
            socket.emit('parent:location:update', {
              parentId,
              latitude: parentUser.latitude,
              longitude: parentUser.longitude,
              accuracy: 15,
              timestamp: parentUser.updatedAt ? new Date(parentUser.updatedAt).getTime() : Date.now(),
              serverTimestamp: Date.now()
            });
          }
        } catch (hErr) {
          console.warn('Location hydration error:', hErr);
        }

        if (callback) callback({ success: true, message: `Joined location room for ${parentId}` });
        return;
      } else if (user.role === 'FAMILY') {
        // Prevent IDOR & unauthorized FAMILY access
        const canView = await canViewParentLocation(parentId, user.id);
        if (!canView) {
          const errorMsg = 'Forbidden: Location room access denied';
          socket.emit('location:error', { error: errorMsg });
          if (callback) callback({ success: false, error: errorMsg });
          return;
        }

        socket.join(`location:${parentId}`);
        socket.emit('location:joined', { room: `location:${parentId}` });

        // Hydrate Family Member with last known location if available in database
        try {
          const parentUser = await prisma.user.findUnique({
            where: { id: parentId },
            select: { latitude: true, longitude: true, updatedAt: true }
          });
          if (parentUser && parentUser.latitude !== null && parentUser.longitude !== null) {
            socket.emit('parent:location:update', {
              parentId,
              latitude: parentUser.latitude,
              longitude: parentUser.longitude,
              accuracy: 15,
              timestamp: parentUser.updatedAt ? new Date(parentUser.updatedAt).getTime() : Date.now(),
              serverTimestamp: Date.now()
            });
          }
        } catch (hErr) {
          console.warn('Location hydration error:', hErr);
        }

        if (callback) callback({ success: true, message: `Joined location room for ${parentId}` });
        return;
      } else {
        const errorMsg = 'Forbidden: Role not authorized for location rooms';
        socket.emit('location:error', { error: errorMsg });
        if (callback) callback({ success: false, error: errorMsg });
        return;
      }
    };

function isValidCoordinate(data: any): boolean {
  if (!data || typeof data !== 'object') return false;
  const { latitude, longitude, accuracy, timestamp } = data;

  if (typeof latitude !== 'number' || isNaN(latitude) || latitude < -90 || latitude > 90) {
    return false;
  }
  if (typeof longitude !== 'number' || isNaN(longitude) || longitude < -180 || longitude > 180) {
    return false;
  }
  if (accuracy !== undefined && accuracy !== null && (typeof accuracy !== 'number' || isNaN(accuracy) || accuracy < 0)) {
    return false;
  }
  if (timestamp !== undefined && timestamp !== null && (typeof timestamp !== 'number' || isNaN(timestamp) || timestamp <= 0)) {
    return false;
  }
  return true;
}

    // Support multiple alias event names for joining location room
    socket.on('join:location', handleJoinLocation);
    socket.on('location:subscribe', handleJoinLocation);
    socket.on('join_room', handleJoinLocation);

    // Handle parent location update event
    socket.on(
      'parent:location:update',
      async (
        data: any,
        callback?: (response: { success: boolean; message?: string; error?: string }) => void
      ) => {
        if (!user || user.role !== 'SENIOR') {
          const errorMsg = 'Forbidden: Only authenticated SENIOR accounts can send location updates';
          socket.emit('location:error', { error: errorMsg });
          if (callback) callback({ success: false, error: errorMsg });
          return;
        }

        // Derive parentId directly from JWT authenticated user (NEVER trust client-supplied parentId)
        const parentId = user.id;

        // Check if parent location sharing is enabled & active in DB
        const canShare = await canParentShareLocation(parentId);
        if (!canShare) {
          const errorMsg = 'Forbidden: Location sharing is disabled or inactive';
          socket.emit('location:error', { error: errorMsg });
          if (callback) callback({ success: false, error: errorMsg });
          return;
        }

        // If coordinates are provided in data, perform validation & recipient broadcasting
        if (data && (data.latitude !== undefined || data.longitude !== undefined)) {
          if (!isValidCoordinate(data)) {
            const errorMsg = 'Invalid request: Malformed location coordinates';
            socket.emit('location:error', { error: errorMsg });
            if (callback) callback({ success: false, error: errorMsg });
            return;
          }

          // Persist Senior location in DB
          try {
            await prisma.user.update({
              where: { id: parentId },
              data: {
                latitude: data.latitude,
                longitude: data.longitude,
                updatedAt: new Date()
              }
            });
          } catch (dbErr) {
            console.warn('Failed to update parent user location in DB:', dbErr);
          }

          // Build in-memory payload for authorized stream
          const locationPayload = {
            parentId,
            latitude: data.latitude,
            longitude: data.longitude,
            accuracy: data.accuracy ?? null,
            speed: data.speed ?? null,
            heading: data.heading ?? null,
            timestamp: data.timestamp || Date.now(),
            serverTimestamp: Date.now()
          };

          // Authoritative delivery: Fetch all connected sockets in location:<parentId> room
          const roomName = `location:${parentId}`;
          const sockets = await io.in(roomName).fetchSockets();

          for (const recipientSocket of sockets) {
            const recipientUser = recipientSocket.data?.user;
            if (!recipientUser) continue;

            if (recipientUser.id === parentId) {
              recipientSocket.emit('parent:location:update', locationPayload);
            } else if (recipientUser.role === 'FAMILY') {
              const authorized = await canViewParentLocation(parentId, recipientUser.id);
              if (authorized) {
                recipientSocket.emit('parent:location:update', locationPayload);
              } else {
                recipientSocket.leave(roomName);
                recipientSocket.emit('location:error', { error: 'Forbidden: Location permission revoked' });
              }
            }
          }
        }

        if (callback) {
          callback({
            success: true,
            message: 'Parent location update processed successfully'
          });
        }
      }
    );
  });

  return io;
}
