import { fetchApi } from './api';
import { INITIAL_CONNECTIONS, INITIAL_PEOPLE } from './mockData';
import { userService } from './userService';

export const connectionService = {
  async getNearbyPeople(filters?: { radius?: number, search?: string, interest?: string, commonInterestsOnly?: boolean }) {
    try {
      let position: GeolocationPosition | null = null;
      try {
        position = await new Promise<GeolocationPosition | null>((resolve, reject) => {
          if (!navigator.geolocation) return resolve(null);
          navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { timeout: 5000 });
        });
      } catch (e) {
        console.warn('Geolocation failed', e);
      }

      const user = await userService.getUser();
      const params = new URLSearchParams();
      if (position) {
        params.append('latitude', position.coords.latitude.toString());
        params.append('longitude', position.coords.longitude.toString());
      } else if (user && user.latitude && user.longitude) {
        params.append('latitude', user.latitude.toString());
        params.append('longitude', user.longitude.toString());
      }
      params.append('radius', (filters?.radius || 10).toString());
      if (filters?.search) params.append('search', filters.search);
      if (filters?.interest) params.append('interest', filters.interest);
      if (filters?.commonInterestsOnly) params.append('commonInterestsOnly', 'true');

      const data = await fetchApi('/users/nearby?' + params.toString()); 
      if (data && data.success && data.users) {
         return data.users.map((u:any) => {
          let interestsArr = [];
          if (Array.isArray(u.hobbies)) {
            interestsArr = u.hobbies.map((h: any) => h.name ? h.name : h);
          } else if (Array.isArray(u.interests)) {
            interestsArr = u.interests.map((h: any) => h.name ? h.name : h);
          }
          return {
            ...u,
            id: u.id,
            interests: interestsArr,
            distance: u.distance || 0
          };
        });
      }
      return [];
    } catch (err: any) {
      console.error('Failed to get nearby users', err);
      throw err;
    }
  },
  async getConnections() {
    try {
      const data = await fetchApi('/connections');
      if (data && data.success && data.connections) {
        return data.connections.map((c: any) => ({
          id: c.id, // Connection ID
          userId: c.user.id, // User ID for chat
          name: c.user.name,
          age: c.user.age || 'N/A',
          city: c.user.city || c.user.locality || 'Unknown location',
          interests: Array.isArray(c.user.hobbies) ? c.user.hobbies.map((h: any) => h.name || h) : [],
          status: c.status,
          messages: [] // Local chat mock for now
        }));
      }
      return [];
    } catch (err) {
      console.error('Failed to get connections', err);
      throw err;
    }
  },

  async getIncomingRequests() {
    try {
      const data = await fetchApi('/connections/requests');
      if (data && data.success && data.requests) {
        return data.requests.map((r: any) => ({
          id: r.id, // Connection request ID
          userId: r.user.id,
          name: r.user.name,
          city: r.user.city || r.user.locality || 'Unknown location',
          interests: Array.isArray(r.user.hobbies) ? r.user.hobbies.map((h: any) => h.name || h) : [],
          status: 'PENDING'
        }));
      }
      return [];
    } catch (err) {
      console.error('Failed to get incoming requests', err);
      return [];
    }
  },

  async getOutgoingRequests() {
    try {
      const data = await fetchApi('/connections/requests/outgoing');
      if (data && data.success) {
        return data.requestedUserIds || [];
      }
      return [];
    } catch (err) {
      return [];
    }
  },

  async sendConnectionRequest(person: any) {
    try {
      await fetchApi('/connections/request', {
        method: 'POST',
        body: JSON.stringify({ targetUserId: person.id || person._id })
      });
      return { success: true };
    } catch (err) {
      console.error('Failed to send connection request', err);
      return { success: false };
    }
  },
  
  async updateConnectionStatus(id: string, status: string) {
    try {
      const action = status === 'ACCEPTED' ? 'accept' : 'reject';
      await fetchApi(`/connections/${id}/${action}`, {
        method: 'PATCH'
      });
      return { success: true };
    } catch (err) {
      console.error('Failed to update status', err);
      return { success: false };
    }
  },

  async removeConnection(id: string) {
    try {
      const data = await fetchApi(`/connections/${id}`, {
        method: 'DELETE'
      });
      return data;
    } catch (err) {
      console.error('Failed to remove connection', err);
      return { success: false };
    }
  },

  async getConversation(userId: string) {
    try {
      const data = await fetchApi(`/messages/${userId}`);
      if (data && data.success && data.messages) {
        return data.messages.map((m: any) => ({
          ...m,
          sender: m.senderId === userId ? 'them' : 'me',
          text: m.content
        }));
      }
      return [];
    } catch (err) {
      console.error('Failed to get conversation', err);
      return [];
    }
  },

  async sendChatMessage(receiverId: string, content: string) {
    try {
      const data = await fetchApi('/messages', {
        method: 'POST',
        body: JSON.stringify({ receiverId, content })
      });
      if (data && data.success && data.message) {
        return {
          ...data.message,
          sender: 'me',
          text: data.message.content
        };
      }
      return null;
    } catch (err) {
      console.error('Failed to send message', err);
      return null;
    }
  }
};
