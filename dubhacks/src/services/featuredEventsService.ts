import { Event } from '../types';
import { apiClient } from './apiClient';
import { getFeaturedEventsData } from '../data/featuredEventsData';

interface FeaturedEventsResponse {
  success: boolean;
  data: Event[];
  message?: string;
}

/**
 * Service for fetching featured events for the home page
 */
class FeaturedEventsService {
  
  /**
   * Get featured events for the home page
   * @param limit - Maximum number of events to return
   * @returns Promise with featured events
   */
  async getFeaturedEvents(limit: number = 6): Promise<Event[]> {
    try {
      const response = await apiClient.get<FeaturedEventsResponse>(`/events/featured?limit=${limit}`);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch featured events');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Error fetching featured events:', error);
      
      // Return data from our featured events file if API fails
      return getFeaturedEventsData(limit);
    }
  }



  /**
   * Get featured events by category
   * @param category - Event category to filter by
   * @param limit - Maximum number of events to return
   * @returns Promise with filtered featured events
   */
  async getFeaturedEventsByCategory(category: string, limit: number = 6): Promise<Event[]> {
    try {
      const response = await apiClient.get<FeaturedEventsResponse>(
        `/events/featured?category=${encodeURIComponent(category)}&limit=${limit}`
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch featured events');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Error fetching featured events by category:', error);
      
      // Return filtered data from our featured events file if API fails
      return getFeaturedEventsData(limit, category);
    }
  }

  /**
   * Check if featured events service is available
   * @returns Promise<boolean> indicating service availability
   */
  async isServiceAvailable(): Promise<boolean> {
    try {
      await apiClient.get('/events/featured/health');
      return true;
    } catch (error) {
      console.warn('Featured events service not available, using mock data');
      return false;
    }
  }
}

// Export singleton instance
export const featuredEventsService = new FeaturedEventsService();