import { fetchApi } from './api';

export const notificationService = {
  async getNotifications() {
    try {
      const data = await fetchApi('/notifications');
      if (data && data.success && data.notifications) {
        return data.notifications;
      }
      return [];
    } catch (err) {
      console.error('Failed to fetch notifications', err);
      return [];
    }
  },

  async getUnreadCount() {
    try {
      const data = await fetchApi('/notifications/unread-count');
      if (data && data.success) {
        return data.count || 0;
      }
      return 0;
    } catch (err) {
      console.error('Failed to get unread count', err);
      return 0;
    }
  },

  async markAsRead(id: string) {
    try {
      await fetchApi(`/notifications/${id}/read`, { method: 'PATCH' });
      return true;
    } catch (err) {
      console.error('Failed to mark as read', err);
      return false;
    }
  },

  async markAllAsRead() {
    try {
      await fetchApi('/notifications/read-all', { method: 'PATCH' });
      return true;
    } catch (err) {
      console.error('Failed to mark all as read', err);
      return false;
    }
  }
};
