import { Request, Response } from 'express';
import { prisma } from '../db';

/**
 * Authorization helper: Checks if a family member is allowed to view parent's activities.
 */
export const canViewParentActivities = async (parentId: string, memberId: string): Promise<boolean> => {
  try {
    const rel = await prisma.familyRelationship.findUnique({
      where: {
        parentId_memberId: { parentId, memberId }
      },
      include: { permissions: true }
    });

    if (!rel || rel.status !== 'ACCEPTED') return false;
    return rel.permissions?.shareActivities === true;
  } catch (error) {
    return false;
  }
};

/**
 * Authorization helper: Checks if a family member is allowed to view parent's live location.
 */
export const canViewParentLocation = async (parentId: string, memberId: string): Promise<boolean> => {
  try {
    const rel = await prisma.familyRelationship.findUnique({
      where: {
        parentId_memberId: { parentId, memberId }
      },
      include: { permissions: true }
    });

    if (!rel || rel.status !== 'ACCEPTED') return false;
    return (
      rel.permissions?.shareLiveLocation === true &&
      rel.permissions?.isLocationSharingActive === true
    );
  } catch (error) {
    return false;
  }
};

/**
 * Authorization helper: Checks if a parent has at least one active family relationship
 * with live location sharing enabled and active.
 */
export const canParentShareLocation = async (parentId: string): Promise<boolean> => {
  try {
    const activeRel = await prisma.familyRelationship.findFirst({
      where: {
        parentId,
        status: 'ACCEPTED',
        permissions: {
          shareLiveLocation: true,
          isLocationSharingActive: true
        }
      }
    });
    return !!activeRel;
  } catch (error) {
    return false;
  }
};


/**
 * POST /api/family/invite
 * Send a family connection request / invitation (Bidirectional: Senior -> Family or Family -> Senior).
 */
export const sendFamilyInvitation = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const senderId = req.user?.id;
    const senderRole = req.user?.role;

    if (!senderId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { identifier } = req.body;
    if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
      res.status(400).json({ success: false, message: 'Target identifier (email, phone, or User ID) is required' });
      return;
    }

    const trimmed = identifier.trim();

    // Find target user by email, phone, or id
    const targetUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: trimmed.toLowerCase() },
          { phone: trimmed },
          { id: trimmed.length === 24 ? trimmed : undefined }
        ].filter(Boolean) as any
      }
    });

    if (!targetUser) {
      res.status(404).json({ success: false, message: 'User account not found' });
      return;
    }

    if (targetUser.id === senderId) {
      res.status(400).json({ success: false, message: 'You cannot connect with yourself' });
      return;
    }

    // Role Security Check: Must be SENIOR <-> FAMILY pair
    if (senderRole === 'SENIOR' && targetUser.role !== 'FAMILY') {
      res.status(400).json({ success: false, message: 'Senior accounts can only connect with Family Member accounts' });
      return;
    }
    if (senderRole === 'FAMILY' && targetUser.role !== 'SENIOR') {
      res.status(400).json({ success: false, message: 'Family Member accounts can only connect with Senior Citizen accounts' });
      return;
    }

    // Determine parentId (Senior) and memberId (Family)
    const parentId = senderRole === 'SENIOR' ? senderId : targetUser.id;
    const memberId = senderRole === 'FAMILY' ? senderId : targetUser.id;

    // Check existing relationship
    const existing = await prisma.familyRelationship.findUnique({
      where: {
        parentId_memberId: { parentId, memberId }
      },
      include: { permissions: true }
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        res.status(409).json({ success: false, message: 'This family connection is already active and accepted' });
        return;
      }
      if (existing.status === 'PENDING') {
        res.status(409).json({ success: false, message: 'A connection request is already pending between these accounts' });
        return;
      }
    }

    // Upsert relationship to PENDING
    const relationship = await prisma.familyRelationship.upsert({
      where: {
        parentId_memberId: { parentId, memberId }
      },
      update: {
        status: 'PENDING'
      },
      create: {
        parentId,
        memberId,
        status: 'PENDING'
      }
    });

    // Ensure permissions record exists with default active values on acceptance
    await prisma.familyPermissions.upsert({
      where: { relationshipId: relationship.id },
      update: {
        shareActivities: true,
        shareLiveLocation: true,
        isLocationSharingActive: true
      },
      create: {
        relationshipId: relationship.id,
        shareActivities: true,
        shareLiveLocation: true,
        isLocationSharingActive: true
      }
    });

    // Also sync peer Connection table record to PENDING
    const existingConn = await prisma.connection.findFirst({
      where: {
        OR: [
          { userId: senderId, connectedId: targetUser.id },
          { userId: targetUser.id, connectedId: senderId }
        ]
      }
    });
    if (existingConn) {
      await prisma.connection.update({
        where: { id: existingConn.id },
        data: { status: 'PENDING' }
      });
    } else {
      await prisma.connection.create({
        data: { userId: senderId, connectedId: targetUser.id, status: 'PENDING' }
      });
    }

    // Create notification for target user
    try {
      await prisma.notification.create({
        data: {
          userId: targetUser.id,
          type: 'FAMILY_INVITATION',
          title: senderRole === 'FAMILY' ? 'Family Access Request' : 'Family Access Invitation',
          message: senderRole === 'FAMILY'
            ? `${req.user.name} sent you a request to connect as your family member.`
            : `${req.user.name} invited you to connect as a family member.`,
          relatedUserId: senderId,
          relatedConnectionId: relationship.id
        }
      });
    } catch (notifErr) {
      console.error('Failed to create invitation notification:', notifErr);
    }

    res.status(201).json({
      success: true,
      message: 'Family connection request sent successfully',
      relationship
    });
  } catch (error: any) {
    console.error('Send family invitation error:', error);
    res.status(500).json({ success: false, message: 'Server error sending request' });
  }
};

/**
 * GET /api/family/invitations
 * Get incoming and outgoing pending family invitations for the logged-in user.
 */
export const getFamilyInvitations = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Incoming invitations: Where current user is target of pending request
    let incomingWhere: any = {};
    let outgoingWhere: any = {};

    if (userRole === 'SENIOR') {
      // Incoming for Senior: Requests sent by Family Members to this Senior (where parentId = userId)
      incomingWhere = { parentId: userId, status: 'PENDING' };
      // Outgoing for Senior: Invites sent by Senior to Family Members (where parentId = userId)
      outgoingWhere = { parentId: userId, status: 'PENDING' };
    } else {
      // Incoming for Family: Invites sent by Seniors to this Family Member (where memberId = userId)
      incomingWhere = { memberId: userId, status: 'PENDING' };
      // Outgoing for Family: Requests sent by Family Member to Seniors (where memberId = userId)
      outgoingWhere = { memberId: userId, status: 'PENDING' };
    }

    const incoming = await prisma.familyRelationship.findMany({
      where: incomingWhere,
      include: {
        parent: {
          select: { id: true, name: true, email: true, phone: true, avatar: true, city: true, role: true }
        },
        member: {
          select: { id: true, name: true, email: true, phone: true, avatar: true, city: true, role: true }
        },
        permissions: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const outgoing = await prisma.familyRelationship.findMany({
      where: outgoingWhere,
      include: {
        parent: {
          select: { id: true, name: true, email: true, phone: true, avatar: true, city: true, role: true }
        },
        member: {
          select: { id: true, name: true, email: true, phone: true, avatar: true, city: true, role: true }
        },
        permissions: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, incoming, outgoing });
  } catch (error: any) {
    console.error('Get family invitations error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * POST /api/family/invitations/:id/accept
 * Recipient accepts a pending family invitation / request.
 */
export const acceptFamilyInvitation = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const relationship = await prisma.familyRelationship.findUnique({
      where: { id },
      include: { parent: true, member: true }
    });

    if (!relationship) {
      res.status(404).json({ success: false, message: 'Invitation not found' });
      return;
    }

    // IDOR Security check: Only designated participant (memberId or parentId) can accept
    if (relationship.memberId !== userId && relationship.parentId !== userId) {
      res.status(403).json({ success: false, message: 'Not authorized to accept this invitation' });
      return;
    }

    if (relationship.status !== 'PENDING') {
      res.status(400).json({ success: false, message: `Invitation is already ${relationship.status.toLowerCase()}` });
      return;
    }

    const updated = await prisma.familyRelationship.update({
      where: { id },
      data: { status: 'ACCEPTED' },
      include: { permissions: true }
    });

    // Ensure permissions exist with default ACTIVE values upon acceptance
    await prisma.familyPermissions.upsert({
      where: { relationshipId: id },
      update: {
        shareActivities: true,
        shareLiveLocation: true,
        isLocationSharingActive: true
      },
      create: {
        relationshipId: id,
        shareActivities: true,
        shareLiveLocation: true,
        isLocationSharingActive: true
      }
    });

    // Also sync peer Connection table records to ACCEPTED
    const existingConn = await prisma.connection.findFirst({
      where: {
        OR: [
          { userId: relationship.parentId, connectedId: relationship.memberId },
          { userId: relationship.memberId, connectedId: relationship.parentId }
        ]
      }
    });
    if (existingConn) {
      await prisma.connection.update({
        where: { id: existingConn.id },
        data: { status: 'ACCEPTED' }
      });
    } else {
      await prisma.connection.create({
        data: { userId: relationship.parentId, connectedId: relationship.memberId, status: 'ACCEPTED' }
      });
    }

    // Notify the other party
    const targetUserId = relationship.parentId === userId ? relationship.memberId : relationship.parentId;
    try {
      await prisma.notification.create({
        data: {
          userId: targetUserId,
          type: 'FAMILY_INVITATION_ACCEPTED',
          title: 'Family Connection Accepted',
          message: `${req.user.name} accepted your family connection request.`,
          relatedUserId: userId,
          relatedConnectionId: id
        }
      });
    } catch (notifErr) {
      console.error('Failed to send accept notification:', notifErr);
    }

    res.json({ success: true, message: 'Family connection request accepted successfully', relationship: updated });
  } catch (error: any) {
    console.error('Accept family invitation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * POST /api/family/invitations/:id/reject
 * Reject a pending family invitation / request.
 */
export const rejectFamilyInvitation = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const relationship = await prisma.familyRelationship.findUnique({ where: { id } });

    if (!relationship) {
      res.status(404).json({ success: false, message: 'Invitation not found' });
      return;
    }

    // IDOR Security check: Only participant can reject
    if (relationship.memberId !== userId && relationship.parentId !== userId) {
      res.status(403).json({ success: false, message: 'Not authorized to reject this invitation' });
      return;
    }

    if (relationship.status !== 'PENDING') {
      res.status(400).json({ success: false, message: `Invitation is already ${relationship.status.toLowerCase()}` });
      return;
    }

    const updated = await prisma.familyRelationship.update({
      where: { id },
      data: { status: 'REJECTED' }
    });

    res.json({ success: true, message: 'Family invitation rejected', relationship: updated });
  } catch (error: any) {
    console.error('Reject family invitation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * GET /api/family/members
 * Get accepted family members connected to the logged-in parent.
 */
export const getFamilyMembers = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const parentId = req.user?.id;
    if (!parentId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const members = await prisma.familyRelationship.findMany({
      where: { parentId, status: 'ACCEPTED' },
      include: {
        member: {
          select: { id: true, name: true, email: true, phone: true, avatar: true, city: true }
        },
        permissions: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, members });
  } catch (error: any) {
    console.error('Get family members error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * GET /api/family/parents
 * Get accepted parents connected to the logged-in family member.
 */
export const getConnectedParents = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const memberId = req.user?.id;
    if (!memberId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const parents = await prisma.familyRelationship.findMany({
      where: { memberId, status: 'ACCEPTED' },
      include: {
        parent: {
          select: { id: true, name: true, email: true, phone: true, avatar: true, city: true, locality: true }
        },
        permissions: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, parents });
  } catch (error: any) {
    console.error('Get connected parents error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * DELETE /api/family/members/:relationshipId
 * Remove/revoke a family relationship.
 */
export const removeFamilyMember = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { relationshipId } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const relationship = await prisma.familyRelationship.findUnique({
      where: { id: relationshipId },
      include: { permissions: true }
    });

    if (!relationship) {
      res.status(404).json({ success: false, message: 'Family relationship not found' });
      return;
    }

    // IDOR Security check: Must be either parent or member of this relationship
    if (relationship.parentId !== userId && relationship.memberId !== userId) {
      res.status(403).json({ success: false, message: 'Not authorized to remove this family relationship' });
      return;
    }

    // Reset permissions to false reliably via upsert
    await prisma.familyPermissions.upsert({
      where: { relationshipId: relationship.id },
      update: {
        shareActivities: false,
        shareLiveLocation: false,
        isLocationSharingActive: false
      },
      create: {
        relationshipId: relationship.id,
        shareActivities: false,
        shareLiveLocation: false,
        isLocationSharingActive: false
      }
    });

    // Update status to REVOKED
    const updated = await prisma.familyRelationship.update({
      where: { id: relationshipId },
      data: { status: 'REVOKED' }
    });

    res.json({ success: true, message: 'Family relationship removed successfully', relationship: updated });
  } catch (error: any) {
    console.error('Remove family member error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * GET /api/family/permissions/:relationshipId
 * Get permissions for a specific relationship.
 */
export const getFamilyPermissions = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { relationshipId } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const relationship = await prisma.familyRelationship.findUnique({
      where: { id: relationshipId },
      include: { permissions: true }
    });

    if (!relationship) {
      res.status(404).json({ success: false, message: 'Relationship not found' });
      return;
    }

    if (relationship.parentId !== userId && relationship.memberId !== userId) {
      res.status(403).json({ success: false, message: 'Not authorized to view permissions for this relationship' });
      return;
    }

    if (relationship.status !== 'ACCEPTED') {
      res.status(400).json({ success: false, message: 'Permissions are only available for active accepted relationships' });
      return;
    }

    res.json({ success: true, permissions: relationship.permissions });
  } catch (error: any) {
    console.error('Get permissions error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * PATCH /api/family/permissions/:relationshipId
 * Update relationship-specific permissions (Parent ONLY).
 */
export const updateFamilyPermissions = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { relationshipId } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const relationship = await prisma.familyRelationship.findUnique({
      where: { id: relationshipId },
      include: { permissions: true }
    });

    if (!relationship) {
      res.status(404).json({ success: false, message: 'Relationship not found' });
      return;
    }

    // IDOR & Role Security check: ONLY the parent can update permissions
    if (relationship.parentId !== userId) {
      res.status(403).json({ success: false, message: 'Only the parent can modify family permissions' });
      return;
    }

    if (relationship.status !== 'ACCEPTED') {
      res.status(400).json({ success: false, message: 'Permissions can only be updated for active accepted relationships' });
      return;
    }

    let { shareActivities, shareLiveLocation, isLocationSharingActive } = req.body;

    const currentPerms = relationship.permissions || {
      shareActivities: false,
      shareLiveLocation: false,
      isLocationSharingActive: false
    };

    const newShareActivities = shareActivities !== undefined ? Boolean(shareActivities) : currentPerms.shareActivities;
    let newShareLiveLocation = shareLiveLocation !== undefined ? Boolean(shareLiveLocation) : currentPerms.shareLiveLocation;
    let newIsLocationSharingActive = isLocationSharingActive !== undefined ? Boolean(isLocationSharingActive) : currentPerms.isLocationSharingActive;

    // CRUCIAL RULE: If shareLiveLocation is false, isLocationSharingActive MUST be forced to false!
    if (!newShareLiveLocation) {
      newIsLocationSharingActive = false;
    }

    const updatedPermissions = await prisma.familyPermissions.upsert({
      where: { relationshipId },
      update: {
        shareActivities: newShareActivities,
        shareLiveLocation: newShareLiveLocation,
        isLocationSharingActive: newIsLocationSharingActive
      },
      create: {
        relationshipId,
        shareActivities: newShareActivities,
        shareLiveLocation: newShareLiveLocation,
        isLocationSharingActive: newIsLocationSharingActive
      }
    });

    res.json({
      success: true,
      message: 'Family permissions updated successfully',
      permissions: updatedPermissions
    });
  } catch (error: any) {
    console.error('Update permissions error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
