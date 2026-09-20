import { Request, Response } from 'express';
import { prisma } from '../db';
import { isValidObjectId } from '../utils/validation';
import { evictUnauthorizedSockets } from '../socket';

const VALID_RELATIONSHIPS = [
  'DAUGHTER',
  'SON',
  'SPOUSE',
  'FRIEND',
  'NEIGHBOR',
  'CAREGIVER',
  'OTHER'
];

/**
 * GET /api/circle
 * Retrieve the authenticated Senior's Saathi Circle members and available accepted connections
 */
export const getCircleMembers = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const seniorId = req.user?.id;
    const userRole = req.user?.role;

    if (!seniorId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (userRole !== 'SENIOR') {
      res.status(403).json({ success: false, message: 'Only Senior Citizen accounts can manage a Saathi Circle' });
      return;
    }

    // 1. Fetch all CircleMember records for this Senior
    const circleEntries = await prisma.circleMember.findMany({
      where: { seniorId },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
            role: true,
            city: true,
            locality: true,
            verificationStatus: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 2. Fetch all accepted connections for this Senior to verify active status & find new candidates
    const acceptedConnections = await prisma.connection.findMany({
      where: {
        OR: [
          { userId: seniorId, status: 'ACCEPTED' },
          { connectedId: seniorId, status: 'ACCEPTED' }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
            city: true,
            locality: true,
            verificationStatus: true,
            status: true
          }
        },
        connected: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
            city: true,
            locality: true,
            verificationStatus: true,
            status: true
          }
        }
      }
    });

    // Extract set of accepted partner user IDs
    const acceptedPartnerIds = new Set<string>();
    const partnerMap = new Map<string, any>();

    for (const conn of acceptedConnections) {
      const partner = conn.userId === seniorId ? conn.connected : conn.user;
      if (partner && partner.status === 'ACTIVE') {
        acceptedPartnerIds.add(partner.id);
        partnerMap.set(partner.id, {
          connectionId: conn.id,
          partner
        });
      }
    }

    // Check for any blocked users
    const blocks = await prisma.block.findMany({
      where: {
        OR: [
          { blockerId: seniorId },
          { blockedId: seniorId }
        ]
      }
    });
    const blockedUserIds = new Set(
      blocks.map(b => (b.blockerId === seniorId ? b.blockedId : b.blockerId))
    );

    // Filter and format circle members, flagging if connection was broken/blocked
    const circleMembers = circleEntries.map(entry => {
      const isConnectionActive =
        acceptedPartnerIds.has(entry.memberId) && !blockedUserIds.has(entry.memberId);

      return {
        id: entry.id,
        memberId: entry.memberId,
        member: entry.member,
        relationshipType: entry.relationshipType,
        allowChat: entry.allowChat,
        allowEvents: entry.allowEvents,
        allowLocation: entry.allowLocation,
        allowEmergency: entry.allowEmergency,
        isConnectionActive,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt
      };
    });

    // 3. Determine available connections eligible to be added to Circle
    const existingCircleMemberIds = new Set(circleEntries.map(e => e.memberId));
    const availableConnections: any[] = [];

    for (const [partnerId, data] of partnerMap.entries()) {
      if (!existingCircleMemberIds.has(partnerId) && !blockedUserIds.has(partnerId)) {
        availableConnections.push({
          connectionId: data.connectionId,
          user: data.partner
        });
      }
    }

    res.json({
      success: true,
      circleMembers,
      availableConnections
    });
  } catch (error: any) {
    console.error('getCircleMembers error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving Saathi Circle' });
  }
};

/**
 * POST /api/circle
 * Add an accepted connection to the Senior's Saathi Circle with initial permissions
 */
export const addCircleMember = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const seniorId = req.user?.id;
    const userRole = req.user?.role;

    if (!seniorId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (userRole !== 'SENIOR') {
      res.status(403).json({ success: false, message: 'Only Senior Citizen accounts can manage a Saathi Circle' });
      return;
    }

    const { memberId, relationshipType, allowChat, allowEvents, allowLocation, allowEmergency } = req.body;

    if (!memberId || !isValidObjectId(memberId)) {
      res.status(400).json({ success: false, message: 'Valid member user ID is required' });
      return;
    }

    if (memberId === seniorId) {
      res.status(400).json({ success: false, message: 'Cannot add yourself to your Saathi Circle' });
      return;
    }

    const upperRel = (relationshipType || 'OTHER').toUpperCase();
    if (!VALID_RELATIONSHIPS.includes(upperRel)) {
      res.status(400).json({
        success: false,
        message: `Invalid relationship. Must be one of: ${VALID_RELATIONSHIPS.join(', ')}`
      });
      return;
    }

    // Verify member user exists and is active
    const targetUser = await prisma.user.findUnique({
      where: { id: memberId },
      select: { id: true, name: true, status: true, avatar: true, role: true, city: true, locality: true, verificationStatus: true }
    });

    if (!targetUser || targetUser.status !== 'ACTIVE') {
      res.status(404).json({ success: false, message: 'Target user not found or account is inactive' });
      return;
    }

    // Verify block status
    const block = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: seniorId, blockedId: memberId },
          { blockerId: memberId, blockedId: seniorId }
        ]
      }
    });

    if (block) {
      res.status(403).json({ success: false, message: 'Cannot add this user due to safety restrictions' });
      return;
    }

    // Verify existing ACCEPTED connection
    const connection = await prisma.connection.findFirst({
      where: {
        OR: [
          { userId: seniorId, connectedId: memberId },
          { userId: memberId, connectedId: seniorId }
        ],
        status: 'ACCEPTED'
      }
    });

    if (!connection) {
      res.status(400).json({
        success: false,
        message: 'You can only add users with whom you have an active, accepted connection'
      });
      return;
    }

    // Check if already in circle
    const existingEntry = await prisma.circleMember.findUnique({
      where: {
        seniorId_memberId: { seniorId, memberId }
      }
    });

    if (existingEntry) {
      res.status(409).json({ success: false, message: 'This user is already in your Saathi Circle' });
      return;
    }

    // Create Circle Member
    const circleMember = await prisma.circleMember.create({
      data: {
        seniorId,
        memberId,
        relationshipType: upperRel,
        allowChat: allowChat !== undefined ? Boolean(allowChat) : true,
        allowEvents: allowEvents !== undefined ? Boolean(allowEvents) : false,
        allowLocation: allowLocation !== undefined ? Boolean(allowLocation) : false,
        allowEmergency: allowEmergency !== undefined ? Boolean(allowEmergency) : false
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            avatar: true,
            role: true,
            city: true,
            locality: true,
            verificationStatus: true
          }
        }
      }
    });

    // Notify member (without exposing private data)
    try {
      const seniorUser = await prisma.user.findUnique({
        where: { id: seniorId },
        select: { name: true }
      });
      await prisma.notification.create({
        data: {
          userId: memberId,
          type: 'CIRCLE_ADDED',
          title: 'Added to Saathi Circle',
          message: `${seniorUser?.name || 'A senior'} added you to their trusted Saathi Circle.`,
          relatedUserId: seniorId
        }
      });
    } catch (notifErr) {
      console.warn('Failed to send circle notification:', notifErr);
    }

    res.status(201).json({
      success: true,
      message: 'Added to Saathi Circle successfully',
      member: {
        ...circleMember,
        isConnectionActive: true
      }
    });
  } catch (error: any) {
    console.error('addCircleMember error:', error);
    res.status(500).json({ success: false, message: 'Server error adding to Saathi Circle' });
  }
};

/**
 * PATCH /api/circle/:memberId/permissions
 * Update independent permissions for a Saathi Circle member
 */
export const updateCirclePermissions = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const seniorId = req.user?.id;
    const userRole = req.user?.role;
    const { memberId } = req.params;

    if (!seniorId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (userRole !== 'SENIOR') {
      res.status(403).json({ success: false, message: 'Only Senior Citizen accounts can manage a Saathi Circle' });
      return;
    }

    if (!memberId || !isValidObjectId(memberId)) {
      res.status(400).json({ success: false, message: 'Valid member user ID is required' });
      return;
    }

    // IDOR Protection: Locate entry specifically belonging to this Senior
    const existingEntry = await prisma.circleMember.findUnique({
      where: {
        seniorId_memberId: { seniorId, memberId }
      }
    });

    if (!existingEntry) {
      res.status(404).json({ success: false, message: 'Circle member not found' });
      return;
    }

    const { allowChat, allowEvents, allowLocation, allowEmergency, relationshipType } = req.body;

    const updateData: any = {};
    if (allowChat !== undefined) updateData.allowChat = Boolean(allowChat);
    if (allowEvents !== undefined) updateData.allowEvents = Boolean(allowEvents);
    if (allowLocation !== undefined) updateData.allowLocation = Boolean(allowLocation);
    if (allowEmergency !== undefined) updateData.allowEmergency = Boolean(allowEmergency);

    if (relationshipType !== undefined) {
      const upperRel = relationshipType.toUpperCase();
      if (VALID_RELATIONSHIPS.includes(upperRel)) {
        updateData.relationshipType = upperRel;
      }
    }

    const updated = await prisma.circleMember.update({
      where: {
        seniorId_memberId: { seniorId, memberId }
      },
      data: updateData,
      include: {
        member: {
          select: {
            id: true,
            name: true,
            avatar: true,
            role: true,
            city: true,
            locality: true,
            verificationStatus: true
          }
        }
      }
    });

    // If location permission was switched to false, immediately evict socket from location room
    if (updateData.allowLocation === false) {
      await evictUnauthorizedSockets(seniorId);
    }

    res.json({
      success: true,
      message: 'Permissions updated successfully',
      member: updated
    });
  } catch (error: any) {
    console.error('updateCirclePermissions error:', error);
    res.status(500).json({ success: false, message: 'Server error updating circle permissions' });
  }
};

/**
 * DELETE /api/circle/:memberId
 * Remove member from Saathi Circle while PRESERVING the underlying connection
 */
export const removeCircleMember = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const seniorId = req.user?.id;
    const userRole = req.user?.role;
    const { memberId } = req.params;

    if (!seniorId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (userRole !== 'SENIOR') {
      res.status(403).json({ success: false, message: 'Only Senior Citizen accounts can manage a Saathi Circle' });
      return;
    }

    if (!memberId || !isValidObjectId(memberId)) {
      res.status(400).json({ success: false, message: 'Valid member user ID is required' });
      return;
    }

    // IDOR Protection: Locate entry specifically belonging to this Senior
    const existingEntry = await prisma.circleMember.findUnique({
      where: {
        seniorId_memberId: { seniorId, memberId }
      }
    });

    if (!existingEntry) {
      res.status(404).json({ success: false, message: 'Circle member not found' });
      return;
    }

    // Delete ONLY Circle membership — DO NOT delete Connection!
    await prisma.circleMember.delete({
      where: {
        seniorId_memberId: { seniorId, memberId }
      }
    });

    // Evict any socket from location room if member had location access
    await evictUnauthorizedSockets(seniorId);

    res.json({
      success: true,
      message: 'Member removed from Saathi Circle (connection remains intact)'
    });
  } catch (error: any) {
    console.error('removeCircleMember error:', error);
    res.status(500).json({ success: false, message: 'Server error removing circle member' });
  }
};

/**
 * GET /api/circle/permissions/:seniorId
 * Member checks what permissions the Senior has granted them in their Circle
 */
export const getMyPermissions = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const memberId = req.user?.id;
    const { seniorId } = req.params;

    if (!memberId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (!seniorId || !isValidObjectId(seniorId)) {
      res.status(400).json({ success: false, message: 'Valid Senior ID is required' });
      return;
    }

    const entry = await prisma.circleMember.findUnique({
      where: {
        seniorId_memberId: { seniorId, memberId }
      }
    });

    if (!entry) {
      res.status(404).json({ success: false, message: 'Not a member of this user\'s Saathi Circle' });
      return;
    }

    res.json({
      success: true,
      permissions: {
        relationshipType: entry.relationshipType,
        allowChat: entry.allowChat,
        allowEvents: entry.allowEvents,
        allowLocation: entry.allowLocation,
        allowEmergency: entry.allowEmergency
      }
    });
  } catch (error: any) {
    console.error('getMyPermissions error:', error);
    res.status(500).json({ success: false, message: 'Server error checking permissions' });
  }
};
