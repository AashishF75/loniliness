import { fetchApi } from './api';
import { INITIAL_ACTIVITIES } from './mockData';

export const activityService = {
  async getActivities() {
    try {
      const data = await fetchApi('/activities');
      return data.map((a: any) => ({
        ...a,
        id: a._id,
        name: a.title, // map title to name for frontend
        icon: a.icon || '📅',
        date: new Date(a.date).toLocaleDateString(),
        distance: a.distance || 0,
        participants: a.participants ? a.participants.length : 0,
        isToday: new Date(a.date).toDateString() === new Date().toDateString()
      }));
    } catch (err) {
      return INITIAL_ACTIVITIES;
    }
  },
  async getJoinedActivities() {
    return new Promise<string[]>((resolve) => {
      const saved = localStorage.getItem('saathi_joined_activities');
      resolve(saved ? JSON.parse(saved) : []);
    });
  },
  async joinActivity(id: string) {
    try {
      await fetchApi(`/activities/${id}/join`, { method: 'POST' });
      const saved = localStorage.getItem('saathi_joined_activities');
      const joined: string[] = saved ? JSON.parse(saved) : [];
      if (!joined.includes(id)) {
        joined.push(id);
        localStorage.setItem('saathi_joined_activities', JSON.stringify(joined));
      }
      return joined;
    } catch (err) {
      console.error(err);
      const saved = localStorage.getItem('saathi_joined_activities');
      return saved ? JSON.parse(saved) : [];
    }
  }
};
