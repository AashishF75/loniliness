import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
 * POST /api/family/invite
 * Senior invites a family member by email, phone, or User ID.
 */
export const sendFamilyInvitation = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const parentId = req.user?.id;
    if (!parentId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Role Security Check 1: Only SENIOR role can send family invitations
    if (req.user?.role !== 'SENIOR') {
      res.status(403).json({ success: false, message: 'Forbidden: Only SENIOR accounts can send family invitations' });
      return;
    }

    const { identifier } = req.body;
    if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
      res.status(400).json({ success: false, message: 'Target family member identifier (email, phone, or User ID) is required' });
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
      res.status(404).json({ success: false, message: 'Family member account not found' });
      return;
    }

    if (targetUser.id === parentId) {
      res.status(400).json({ success: false, message: 'You cannot invite yourself as a family member' });
      return;
    }

    // Role Security Check 2: Target account MUST be a FAMILY member role
    if (targetUser.role !== 'FAMILY') {
      res.status(403).json({ success: false, message: 'Forbidden: Family invitations can only be sent to accounts with the FAMILY role' });
      return;
    }

    // Check existing relationship
    const existing = await prisma.familyRelationship.findUnique({
      where: {
        parentId_memberId: { parentId, memberId: targetUser.id }
      },
      include: { permissions: true }
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        res.status(409).json({ success: false, message: 'This family member is already connected to your account' });
        return;
      }
      if (existing.status === 'PENDING') {
        res.status(409).json({ success: false, message: 'An invitation is already pending for this family member' });
        return;
      }
    }

    // Upsert relationship to PENDING
    const relationship = await prisma.familyRelationship.upsert({
      where: {
        parentId_memberId: { parentId, memberId: targetUser.id }
      },
      update: {
        status: 'PENDING'
      },
      create: {
        parentId,
        memberId: targetUser.id,
        status: 'PENDING'
      }
    });

    // Ensure permissions record exists with default OFF values
    await prisma.familyPermissions.upsert({
      where: { relationshipId: relationship.id },
      update: {},
      create: {
        relationshipId: relationship.id,
        shareActivities: false,
        shareLiveLocation: false,
        isLocationSharingActive: false
      }
    });

    // Create notification for invited family member
    try {
      await prisma.notification.create({
        data: {
          userId: targetUser.id,
          type: 'FAMILY_INVITATION',
          title: 'Family Access Invitation',
          message: `${req.user.name} invited you to connect as a family member.`,
          relatedUserId: parentId
        }
      });
    } catch (notifErr) {
      console.error('Failed to create invitation notification:', notifErr);
    }

    res.status(201).json({
      success: true,
      message: 'Family invitation sent successfully',
      relationship
    });
  } catch (error: any) {
    console.error('Send family invitation error:', error);
    res.status(500).json({ success: false, message: 'Server error sending invitation' });
  }
};

/**
 * GET /api/family/invitations
 * Get incoming and outgoing pending family invitations for the logged-in user.
 */
export const getFamilyInvitations = async (req: Request | any, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Incoming invitations where current user is memberId
    const incoming = await prisma.familyRelationship.findMany({
      where: { memberId: userId, status: 'PENDING' },
      include: {
        parent: {
          select: { id: true, name: true, email: true, phone: true, avatar: true, city: true }
        },
        permissions: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Outgoing invitations where current user is parentId
    const outgoing = await prisma.familyRelationship.findMany({
      where: { parentId: userId, status: 'PENDING' },
      include: {
        member: {
          select: { id: true, name: true, email: true, phone: true, avatar: true, city: true }
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
 * Family member accepts a pending family invitation.
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
      include: { parent: true }
    });

    if (!relationship) {
      res.status(404).json({ success: false, message: 'Invitation not found' });
      return;
    }

    // IDOR Security check: Only the designated member can accept
    if (relationship.memberId !== userId) {
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

    // Ensure permissions exist with default false values
    await prisma.familyPermissions.upsert({
      where: { relationshipId: id },
      update: {},
      create: {
        relationshipId: id,
        shareActivities: false,
        shareLiveLocation: false,
        isLocationSharingActive: false
      }
    });

    // Create notification for parent
    try {
      await prisma.notification.create({
        data: {
          userId: relationship.parentId,
          type: 'FAMILY_INVITATION_ACCEPTED',
          title: 'Family Invitation Accepted',
          message: `${req.user.name} accepted your family invitation.`,
          relatedUserId: userId
        }
      });
    } catch (notifErr) {
      console.error('Failed to send accept notification:', notifErr);
    }

    res.json({ success: true, message: 'Family invitation accepted successfully', relationship: updated });
  } catch (error: any) {
    console.error('Accept family invitation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * POST /api/family/invitations/:id/reject
 * Family member rejects a pending family invitation.
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

    // IDOR Security check: Only the designated member can reject
    if (relationship.memberId !== userId) {
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
