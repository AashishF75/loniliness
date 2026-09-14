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
  },

  getVerificationRequests: async (status?: string) => {
    const query = status && status !== 'ALL' ? `?status=${encodeURIComponent(status)}` : '';
    const data = await fetchApi(`/admin/verification/requests${query}`);
    return data.requests;
  },

  reviewVerificationRequest: async (id: string, action: 'APPROVE' | 'REJECT' | 'REQUEST_REVIEW', rejectionReason?: string, reviewNotes?: string) => {
    return await fetchApi(`/admin/verification/requests/${id}/review`, {
      method: 'PUT',
      body: JSON.stringify({ action, rejectionReason, reviewNotes })
    });
  },

  getDocumentBlobUrl: async (id: string, type: 'document' | 'selfie') => {
    const token = localStorage.getItem('saathi_auth_token');
    const { API_URL } = await import('./api');
    const response = await fetch(`${API_URL}/admin/verification/document/${id}/${type}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!response.ok) {
      throw new Error('Failed to load verification document image');
    }
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }
};
