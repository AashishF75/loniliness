import { fetchApi } from './api';

export const authService = {
  async login(email: string, password: string) {
    try {
      const data = await fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      localStorage.setItem('saathi_auth_token', data.token);
      localStorage.setItem('saathi_user', JSON.stringify(data));
      return { success: true, role: data.role };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  },
  
  async register(userData: any) {
    try {
      const data = await fetchApi('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
      });
      localStorage.setItem('saathi_auth_token', data.token);
      localStorage.setItem('saathi_user', JSON.stringify(data));
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  },
  
  logout() {
    localStorage.removeItem('saathi_auth_token');
    localStorage.removeItem('saathi_user');
  }
};
