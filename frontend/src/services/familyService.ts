import { fetchApi } from './api';

export const familyService = {
  async getDashboard() {
    try {
      const data = await fetchApi('/family/dashboard');
      return data;
    } catch (err) {
      return null; // Handle via frontend mock logic
    }
  },
  
  async toggleConsent() {
    try {
      const data = await fetchApi('/family/consent', { method: 'PUT' });
      return data.familyConsent;
    } catch (err) {
      return null;
    }
  }
};
