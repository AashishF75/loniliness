import { Request, Response } from 'express';
import { prisma } from '../db';

export const sendConnectionRequest = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const senderId = req.user?.id;
    const { targetUserId } = req.body;

    if (!senderId || !targetUserId) {
      res.status(400).json({ success: false, message: 'Missing user IDs' });
      return;
    }

    if (senderId === targetUserId) {
      res.status(400).json({ success: false, message: 'Cannot connect with yourself' });
      return;
    }

    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      res.status(404).json({ success: false, message: 'Target user not found' });
      return;
    }

    // Check if there is a block
    const existingBlock = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: senderId, blockedId: targetUserId },
          { blockerId: targetUserId, blockedId: senderId }
        ]
      }
    });

    if (existingBlock) {
      res.status(403).json({ success: false, message: 'Cannot connect with this user' });
      return;
    }

    const existingConnection = await prisma.connection.findFirst({
      where: {
        OR: [
          { userId: senderId, connectedId: targetUserId },
          { userId: targetUserId, connectedId: senderId }
        ]
      }
    });

    if (existingConnection) {
      res.status(400).json({ success: false, message: 'Connection or request already exists' });
      return;
    }

    const newConnection = await prisma.connection.create({
      data: {
        userId: senderId,
        connectedId: targetUserId,
        status: 'PENDING'
      }
    });

    // Dual Sync: If connecting a SENIOR and a FAMILY user, sync FamilyRelationship table
    const senderUser = await prisma.user.findUnique({ where: { id: senderId } });
    if (senderUser && targetUser) {
      if ((senderUser.role === 'SENIOR' && targetUser.role === 'FAMILY') || (senderUser.role === 'FAMILY' && targetUser.role === 'SENIOR')) {
        const parentId = senderUser.role === 'SENIOR' ? senderUser.id : targetUser.id;
        const memberId = senderUser.role === 'FAMILY' ? senderUser.id : targetUser.id;

        const rel = await prisma.familyRelationship.upsert({
          where: {
            parentId_memberId: { parentId, memberId }
          },
          update: { status: 'PENDING' },
          create: { parentId, memberId, status: 'PENDING' }
        });

        await prisma.familyPermissions.upsert({
          where: { relationshipId: rel.id },
          update: { shareActivities: true, shareLiveLocation: true, isLocationSharingActive: true },
          create: { relationshipId: rel.id, shareActivities: true, shareLiveLocation: true, isLocationSharingActive: true }
        });
      }

      await prisma.notification.create({
        data: {
          userId: targetUserId,
          type: 'NEW_CONNECTION_REQUEST',
          title: 'New connection request',
          message: `${senderUser.name} wants to connect with you.`,
          relatedUserId: senderId,
          relatedConnectionId: newConnection.id
        }
      });
    }

    res.json({ success: true, connection: newConnection });
  } catch (error: any) {
    console.error('Send connection error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getIncomingRequests = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const requests = await prisma.connection.findMany({
      where: {
        connectedId: userId,
        status: 'PENDING'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            city: true,
            locality: true,
            avatar: true,
            hobbies: true
          }
        }
      }
    });

    res.json({ success: true, requests });
  } catch (error: any) {
    console.error('Get incoming requests error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateConnectionStatus = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { status } = req.body;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (!['ACCEPTED', 'REJECTED'].includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid status' });
      return;
    }

    const connection = await prisma.connection.findUnique({ where: { id } });

    if (!connection) {
      res.status(404).json({ success: false, message: 'Connection not found' });
      return;
    }

    // Ensure only the receiver can accept or reject
    if (connection.connectedId !== userId) {
      res.status(403).json({ success: false, message: 'Not authorized to modify this connection' });
      return;
    }

    if (status === 'REJECTED') {
      await prisma.connection.delete({ where: { id } });
      // Sync FamilyRelationship if exists
      const rel = await prisma.familyRelationship.findFirst({
        where: {
          OR: [
            { parentId: connection.userId, memberId: connection.connectedId },
            { parentId: connection.connectedId, memberId: connection.userId }
          ]
        }
      });
      if (rel) {
        await prisma.familyRelationship.update({
          where: { id: rel.id },
          data: { status: 'REJECTED' }
        });
      }
    } else {
      await prisma.connection.update({
        where: { id },
        data: { status }
      });

      // Dual Sync: Sync matching FamilyRelationship to ACCEPTED
      const userA = await prisma.user.findUnique({ where: { id: connection.userId } });
      const userB = await prisma.user.findUnique({ where: { id: connection.connectedId } });

      if (userA && userB) {
        if ((userA.role === 'SENIOR' && userB.role === 'FAMILY') || (userA.role === 'FAMILY' && userB.role === 'SENIOR')) {
          const parentId = userA.role === 'SENIOR' ? userA.id : userB.id;
          const memberId = userA.role === 'FAMILY' ? userA.id : userB.id;

          const rel = await prisma.familyRelationship.upsert({
            where: {
              parentId_memberId: { parentId, memberId }
            },
            update: { status: 'ACCEPTED' },
            create: { parentId, memberId, status: 'ACCEPTED' }
          });

          await prisma.familyPermissions.upsert({
            where: { relationshipId: rel.id },
            update: { shareActivities: true, shareLiveLocation: true, isLocationSharingActive: true },
            create: { relationshipId: rel.id, shareActivities: true, shareLiveLocation: true, isLocationSharingActive: true }
          });
        }
      }

      if (status === 'ACCEPTED') {
        const receiverUser = await prisma.user.findUnique({ where: { id: userId } });
        if (receiverUser) {
          await prisma.notification.create({
            data: {
              userId: connection.userId, // Send notification to the original sender
              type: 'CONNECTION_ACCEPTED',
              title: 'Connection accepted',
              message: `${receiverUser.name} accepted your connection request.`,
              relatedUserId: userId,
              relatedConnectionId: connection.id
            }
          });
        }
      }
    }

    res.json({ success: true, message: `Connection ${status.toLowerCase()}` });
  } catch (error: any) {
    console.error('Update connection error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getConnections = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const connections = await prisma.connection.findMany({
      where: {
        OR: [
          { userId: userId, status: 'ACCEPTED' },
          { connectedId: userId, status: 'ACCEPTED' }
        ]
      },
      include: {
        user: {
          select: { id: true, name: true, city: true, locality: true, avatar: true, hobbies: true }
        },
        connected: {
          select: { id: true, name: true, city: true, locality: true, avatar: true, hobbies: true }
        }
      }
    });

    const formattedConnections = connections.map((conn: any) => {
      // Determine the "other" user
      const otherUser = conn.userId === userId ? conn.connected : conn.user;
      return {
        id: conn.id,
        status: conn.status,
        createdAt: conn.createdAt,
        user: otherUser
      };
    });

    res.json({ success: true, connections: formattedConnections });
  } catch (error: any) {
    console.error('Get connections error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Also endpoint to get pending requests sent by current user (useful for disabling connect button)
export const getOutgoingRequests = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const requests = await prisma.connection.findMany({
      where: { userId, status: 'PENDING' },
      select: { connectedId: true }
    });
    res.json({ success: true, requestedUserIds: requests.map((r: any) => r.connectedId) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const removeConnection = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const connection = await prisma.connection.findUnique({ where: { id } });

    if (!connection) {
      res.status(404).json({ success: false, message: 'Connection not found' });
      return;
    }

    if (connection.userId !== userId && connection.connectedId !== userId) {
      res.status(403).json({ success: false, message: 'Not authorized to modify this connection' });
      return;
    }

    await prisma.connection.delete({ where: { id } });

    res.json({ success: true, message: 'Connection removed' });
  } catch (error: any) {
    console.error('Remove connection error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
