import { fetchApi } from './api';

export interface CircleMember {
  id: string;
  memberId: string;
  member: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    avatar?: string | null;
    role: string;
    city?: string | null;
    locality?: string | null;
    verificationStatus: string;
  };
  relationshipType: 'DAUGHTER' | 'SON' | 'SPOUSE' | 'FRIEND' | 'NEIGHBOR' | 'CAREGIVER' | 'OTHER';
  allowChat: boolean;
  allowEvents: boolean;
  allowLocation: boolean;
  allowEmergency: boolean;
  isConnectionActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AvailableConnection {
  connectionId: string;
  user: {
    id: string;
    name: string;
    email?: string;
    avatar?: string | null;
    role: string;
    city?: string | null;
    locality?: string | null;
    verificationStatus: string;
  };
}

export const circleService = {
  async getCircle(): Promise<{ circleMembers: CircleMember[]; availableConnections: AvailableConnection[] }> {
    try {
      const res = await fetchApi('/circle');
      if (res && res.success) {
        return {
          circleMembers: res.circleMembers || [],
          availableConnections: res.availableConnections || []
        };
      }
      return { circleMembers: [], availableConnections: [] };
    } catch (err) {
      console.error('Failed to get Saathi Circle:', err);
      throw err;
    }
  },

  async addMember(data: {
    memberId: string;
    relationshipType: string;
    allowChat?: boolean;
    allowEvents?: boolean;
    allowLocation?: boolean;
    allowEmergency?: boolean;
  }): Promise<CircleMember> {
    try {
      const res = await fetchApi('/circle', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      if (res && res.success && res.member) {
        return res.member;
      }
      throw new Error(res?.message || 'Failed to add member to circle');
    } catch (err) {
      console.error('Failed to add member to circle:', err);
      throw err;
    }
  },

  async updatePermissions(
    memberId: string,
    permissions: {
      allowChat?: boolean;
      allowEvents?: boolean;
      allowLocation?: boolean;
      allowEmergency?: boolean;
      relationshipType?: string;
    }
  ): Promise<CircleMember> {
    try {
      const res = await fetchApi(`/circle/${memberId}/permissions`, {
        method: 'PATCH',
        body: JSON.stringify(permissions)
      });
      if (res && res.success && res.member) {
        return res.member;
      }
      throw new Error(res?.message || 'Failed to update circle permissions');
    } catch (err) {
      console.error('Failed to update circle permissions:', err);
      throw err;
    }
  },

  async removeMember(memberId: string): Promise<void> {
    try {
      const res = await fetchApi(`/circle/${memberId}`, {
        method: 'DELETE'
      });
      if (!res || !res.success) {
        throw new Error(res?.message || 'Failed to remove member from circle');
      }
    } catch (err) {
      console.error('Failed to remove member from circle:', err);
      throw err;
    }
  }
};
