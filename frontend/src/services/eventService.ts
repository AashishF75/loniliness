import { fetchApi } from './api';

export interface EventData {
  id?: string;
  title: string;
  description: string;
  category: string;
  location: string;
  latitude?: number;
  longitude?: number;
  date: string;
  startTime: string;
  endTime: string;
  maxParticipants: number;
}

export const eventService = {
  async getEvents(filters?: { category?: string; search?: string; date?: string; radius?: number }) {
    try {
      const params = new URLSearchParams();
      if (filters?.category) params.append('category', filters.category);
      if (filters?.search) params.append('search', filters.search);
      if (filters?.date) params.append('date', filters.date);
      if (filters?.radius) params.append('radius', filters.radius.toString());

      const data = await fetchApi(`/events?${params.toString()}`);
      if (data && data.success) {
        return data.events;
      }
      return [];
    } catch (err) {
      console.error('Failed to get events', err);
      throw err;
    }
  },

  async getEventById(id: string) {
    try {
      const data = await fetchApi(`/events/${id}`);
      if (data && data.success) {
        return data.event;
      }
      return null;
    } catch (err) {
      console.error('Failed to get event details', err);
      throw err;
    }
  },

  async createEvent(eventData: EventData) {
    try {
      const data = await fetchApi('/events', {
        method: 'POST',
        body: JSON.stringify(eventData),
      });
      return data;
    } catch (err) {
      console.error('Failed to create event', err);
      throw err;
    }
  },

  async joinEvent(id: string) {
    try {
      const data = await fetchApi(`/events/${id}/join`, {
        method: 'POST',
      });
      return data;
    } catch (err) {
      console.error('Failed to join event', err);
      throw err;
    }
  },

  async leaveEvent(id: string) {
    try {
      const data = await fetchApi(`/events/${id}/leave`, {
        method: 'POST',
      });
      return data;
    } catch (err) {
      console.error('Failed to leave event', err);
      throw err;
    }
  },

  async updateEvent(id: string, eventData: EventData) {
    try {
      const data = await fetchApi(`/events/${id}`, {
        method: 'PUT',
        body: JSON.stringify(eventData),
      });
      return data;
    } catch (err) {
      console.error('Failed to update event', err);
      throw err;
    }
  },

  async deleteEvent(id: string) {
    try {
      const data = await fetchApi(`/events/${id}`, {
        method: 'DELETE',
      });
      return data;
    } catch (err) {
      console.error('Failed to delete event', err);
      throw err;
    }
  }
};
