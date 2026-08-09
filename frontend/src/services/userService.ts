import { fetchApi } from './api';
import { INITIAL_USER } from './mockData';

export const userService = {
  async getUser() {
    try {
      const data = await fetchApi('/auth/me');
      return data;
    } catch (err) {
      // Fallback for UI testing if server is off
      const data = localStorage.getItem('saathi_onboarding');
      if (data) return JSON.parse(data);
      return INITIAL_USER;
    }
  },
  async updateUser(data: any) {
    try {
      const updated = await fetchApi('/users/profile', {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      localStorage.setItem('saathi_onboarding', JSON.stringify(updated));
      return updated;
    } catch (err) {
      // Fallback
      const current = localStorage.getItem('saathi_onboarding');
      const parsed = current ? JSON.parse(current) : INITIAL_USER;
      const updated = { ...parsed, ...data };
      localStorage.setItem('saathi_onboarding', JSON.stringify(updated));
      return updated;
    }
  }
};
