import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from './index';
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
        if (callback) callback({ success: true, message: `Joined location room for ${parentId}` });
        return;
      } else {
        const errorMsg = 'Forbidden: Role not authorized for location rooms';
        socket.emit('location:error', { error: errorMsg });
        if (callback) callback({ success: false, error: errorMsg });
        return;
      }
    };

    // Support multiple alias event names for joining location room
    socket.on('join:location', handleJoinLocation);
    socket.on('location:subscribe', handleJoinLocation);
    socket.on('join_room', handleJoinLocation);

    // Handle parent location update authorization test event
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

        const canShare = await canParentShareLocation(parentId);
        if (!canShare) {
          const errorMsg = 'Forbidden: Location sharing is disabled or inactive';
          socket.emit('location:error', { error: errorMsg });
          if (callback) callback({ success: false, error: errorMsg });
          return;
        }

        // DO NOT store latitude/longitude or broadcast real GPS coordinates yet in Phase 3A
        if (callback) {
          callback({
            success: true,
            message: 'Parent location authorization verified. GPS transmission ready for Phase 3.'
          });
        }
      }
    );
  });

  return io;
}
