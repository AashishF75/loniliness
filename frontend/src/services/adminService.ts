import { fetchApi } from './api';

export const adminService = {
  getDashboardStats: async () => {
    const data = await fetchApi('/admin/dashboard');
    return data.stats;
  },

  getUsers: async () => {
    const data = await fetchApi('/admin/users');
    return data.users;
  },

  getReports: async () => {
    const data = await fetchApi('/admin/reports');
    return data.reports;
  },

  resolveReport: async (id: string, status: string) => {
    return await fetchApi(`/admin/reports/${id}/resolve`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  },

  suspendUser: async (id: string) => {
    return await fetchApi(`/admin/users/${id}/suspend`, {
      method: 'PUT'
    });
  },

  activateUser: async (id: string) => {
    return await fetchApi(`/admin/users/${id}/activate`, {
      method: 'PUT'
    });
  },

  getEvents: async () => {
    const data = await fetchApi('/admin/events');
    return data.events;
  },

  removeEvent: async (id: string) => {
    return await fetchApi(`/admin/events/${id}`, {
      method: 'DELETE'
    });
  }
};
