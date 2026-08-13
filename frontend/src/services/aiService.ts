import { fetchApi } from './api';
import { userService } from './userService';
import { connectionService } from './connectionService';
import { activityService } from './activityService';

export const aiService = {
  async sendMessage(text: string) {
    try {
      let user = null;
      try {
        user = await userService.getUser();
      } catch (e) { console.warn('Failed to get user for AI context'); }

      let nearbyPeople = [];
      try {
        nearbyPeople = await connectionService.getNearbyPeople();
      } catch (e) { console.warn('Failed to get nearby people for AI context'); }

      let activities = [];
      try {
        activities = await activityService.getActivities();
      } catch (e) { console.warn('Failed to get activities for AI context'); }

      const response = await fetchApi('/ai/recommend', {
        method: 'POST',
        body: JSON.stringify({
          text,
          user,
          nearbyPeople,
          activities
        })
      });

      if (response.success && response.data) {
        return {
          content: response.data.message,
          recommendations: [
            ...(response.data.recommendedPeople || []),
            ...(response.data.recommendedActivities || [])
          ]
        };
      }
      
      throw new Error('Invalid AI response');
    } catch (err) {
      console.error('AI Service Error:', err);
      // Fallback response if API fails
      return {
        content: "I'm having trouble connecting right now, but I'm still here for you. Please try again in a moment.",
        recommendations: []
      };
    }
  }
};
