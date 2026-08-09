import { fetchApi } from './api';
import { INITIAL_CONNECTIONS, INITIAL_PEOPLE } from './mockData';
import { userService } from './userService';

export const connectionService = {
  async getNearbyPeople() {
    try {
      const currentUser = await userService.getUser();
      // Fetch users from backend (assuming we have a route for this, or fallback)
      const data = await fetchApi('/users/nearby'); 
      return data.map((u:any) => ({
        ...u,
        id: u._id,
        distance: u.distance || (Math.random() * 5).toFixed(1)
      }));
    } catch (err) {
      // Fallback
      const connectionsStr = localStorage.getItem('saathi_connections');
      const connections: any[] = connectionsStr ? JSON.parse(connectionsStr) : INITIAL_CONNECTIONS;
      const connectionIds = connections.map(c => c.id);
      return INITIAL_PEOPLE.filter(p => !connectionIds.includes(p.id));
    }
  },
  
  async getConnections() {
    try {
      const data = await fetchApi('/connections');
      return data.map((c:any) => {
        const otherUser = c.sender._id === c.currentUser ? c.receiver : c.sender;
        return {
          id: c._id, // Connection ID for accept/decline
          userId: otherUser._id, // User ID for chat
          name: otherUser.name,
          age: otherUser.age,
          interests: otherUser.interests || [],
          status: c.status,
          messages: c.messages || [] // Assuming we merge local chat
        };
      });
    } catch (err) {
      const saved = localStorage.getItem('saathi_connections');
      if (saved) return JSON.parse(saved);
      return INITIAL_CONNECTIONS;
    }
  },

  async sendConnectionRequest(person: any) {
    try {
      await fetchApi('/connections', {
        method: 'POST',
        body: JSON.stringify({ targetUserId: person.id || person._id })
      });
      return { success: true };
    } catch (err) {
      console.error(err);
      return { success: false };
    }
  },
  
  async updateConnectionStatus(id: string, status: string) {
    try {
      await fetchApi(`/connections/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      return { success: true };
    } catch (err) {
      return { success: false };
    }
  },

  // Mock chat since backend doesn't support messages in Connection schema anymore
  async updateConnections(connections: any[]) {
    return new Promise((resolve) => {
      localStorage.setItem('saathi_connections', JSON.stringify(connections));
      resolve({ success: true });
    });
  },

  async removeConnection(id: string) {
    try {
       await fetchApi(`/connections/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'declined' })
      });
    } catch(err){}
    return new Promise((resolve) => {
      const saved = localStorage.getItem('saathi_connections');
      if (!saved) return resolve({success:true});
      let connections: any[] = JSON.parse(saved);
      connections = connections.filter(c => c.id !== id);
      localStorage.setItem('saathi_connections', JSON.stringify(connections));
      resolve({ success: true });
    });
  }
};
