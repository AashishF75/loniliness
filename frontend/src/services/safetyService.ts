import { fetchApi } from './api';

export const safetyService = {
  async reportUser(reportedUserId: string, reason: string, description?: string) {
    try {
      const data = await fetchApi('/safety/report', {
        method: 'POST',
        body: JSON.stringify({ reportedUserId, reason, description })
      });
      return data;
    } catch (err: any) {
      console.error('Failed to report user', err);
      throw err;
    }
  },

  async blockUser(userId: string) {
    try {
      const data = await fetchApi(`/safety/block/${userId}`, {
        method: 'POST'
      });
      return data;
    } catch (err: any) {
      console.error('Failed to block user', err);
      throw err;
    }
  },

  async unblockUser(userId: string) {
    try {
      const data = await fetchApi(`/safety/block/${userId}`, {
        method: 'DELETE'
      });
      return data;
    } catch (err: any) {
      console.error('Failed to unblock user', err);
      throw err;
    }
  },

  async getBlockedUsers() {
    try {
      const data = await fetchApi('/safety/blocks');
      if (data && data.success) {
        return data.blocks;
      }
      return [];
    } catch (err: any) {
      console.error('Failed to get blocked users', err);
      return [];
    }
  }
};
