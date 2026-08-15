const API_URL = 'http://localhost:5000/api/admin';

const getAuthHeaders = () => {
  const token = localStorage.getItem('saathi_auth_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export const adminService = {
  getDashboardStats: async () => {
    const res = await fetch(`${API_URL}/dashboard`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch stats');
    const data = await res.json();
    return data.stats;
  },

  getUsers: async () => {
    const res = await fetch(`${API_URL}/users`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch users');
    const data = await res.json();
    return data.users;
  },

  getReports: async () => {
    const res = await fetch(`${API_URL}/reports`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch reports');
    const data = await res.json();
    return data.reports;
  },

  resolveReport: async (id: string, status: string) => {
    const res = await fetch(`${API_URL}/reports/${id}/resolve`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error('Failed to resolve report');
    return await res.json();
  }
};
