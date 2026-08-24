import { fetchApi } from './api';

export interface FamilyPermissions {
  id: string;
  relationshipId: string;
  shareActivities: boolean;
  shareLiveLocation: boolean;
  isLocationSharingActive: boolean;
}

export interface FamilyMemberUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  city?: string;
  locality?: string;
}

export interface FamilyRelationship {
  id: string;
  parentId: string;
  memberId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'REVOKED';
  createdAt: string;
  parent?: FamilyMemberUser;
  member?: FamilyMemberUser;
  permissions?: FamilyPermissions;
}

export const familyService = {
  // Send family invitation
  async inviteFamilyMember(identifier: string) {
    return await fetchApi('/family/invite', {
      method: 'POST',
      body: JSON.stringify({ identifier })
    });
  },

  // Get pending invitations (incoming & outgoing)
  async getInvitations() {
    return await fetchApi('/family/invitations');
  },

  // Accept invitation
  async acceptInvitation(relationshipId: string) {
    return await fetchApi(`/family/invitations/${relationshipId}/accept`, {
      method: 'POST'
    });
  },

  // Reject invitation
  async rejectInvitation(relationshipId: string) {
    return await fetchApi(`/family/invitations/${relationshipId}/reject`, {
      method: 'POST'
    });
  },

  // Get accepted family members connected to parent
  async getFamilyMembers() {
    return await fetchApi('/family/members');
  },

  // Get accepted parents connected to family member
  async getConnectedParents() {
    return await fetchApi('/family/parents');
  },

  // Remove / Revoke family relationship
  async removeFamilyMember(relationshipId: string) {
    return await fetchApi(`/family/members/${relationshipId}`, {
      method: 'DELETE'
    });
  },

  // Get permissions for relationship
  async getPermissions(relationshipId: string) {
    return await fetchApi(`/family/permissions/${relationshipId}`);
  },

  // Update permissions for relationship (Parent ONLY)
  async updatePermissions(relationshipId: string, perms: { shareActivities?: boolean; shareLiveLocation?: boolean; isLocationSharingActive?: boolean }) {
    return await fetchApi(`/family/permissions/${relationshipId}`, {
      method: 'PATCH',
      body: JSON.stringify(perms)
    });
  }
};
