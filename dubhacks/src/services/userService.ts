import { apiClient } from './apiClient';
import { UserProfile, UserPreferences, Event, ApiResponse } from '../types';

export interface CompleteUserProfile {
  profile: UserProfile;
  preferences: UserPreferences;
  savedEventsCount: number;
  recentActivity: {
    lastLogin?: Date;
    eventsCreated: number;
    eventsSaved: number;
  };
}

class UserService {
  /**
   * Get user profile
   */
  async getUserProfile(userId: string): Promise<UserProfile> {
    const response = await apiClient.get<ApiResponse<UserProfile>>(`/users/${userId}/profile`);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch user profile');
    }
    
    return response.data.data;
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, profileData: Partial<UserProfile>): Promise<UserProfile> {
    const response = await apiClient.put<ApiResponse<UserProfile>>(`/users/${userId}/profile`, profileData);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to update user profile');
    }
    
    return response.data.data;
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    const response = await apiClient.get<ApiResponse<UserPreferences>>(`/users/${userId}/preferences`);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch user preferences');
    }
    
    return response.data.data;
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    const response = await apiClient.put<ApiResponse<UserPreferences>>(`/users/${userId}/preferences`, preferences);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to update user preferences');
    }
    
    return response.data.data;
  }

  /**
   * Save an event
   */
  async saveEvent(userId: string, eventId: string): Promise<void> {
    const response = await apiClient.post<ApiResponse<{ eventId: string }>>(`/users/${userId}/saved-events/${eventId}`);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to save event');
    }
  }

  /**
   * Remove a saved event
   */
  async unsaveEvent(userId: string, eventId: string): Promise<void> {
    const response = await apiClient.delete<ApiResponse<{ eventId: string }>>(`/users/${userId}/saved-events/${eventId}`);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to remove saved event');
    }
  }

  /**
   * Get saved events
   */
  async getSavedEvents(userId: string): Promise<Event[]> {
    const response = await apiClient.get<ApiResponse<Event[]>>(`/users/${userId}/saved-events`);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch saved events');
    }
    
    // Convert date strings to Date objects
    return response.data.data.map(event => ({
      ...event,
      startDateTime: new Date(event.startDateTime),
      endDateTime: new Date(event.endDateTime),
      createdAt: new Date(event.createdAt),
      updatedAt: new Date(event.updatedAt),
      source: {
        ...event.source,
        crawlDate: event.source.crawlDate ? new Date(event.source.crawlDate) : undefined,
      },
    }));
  }

  /**
   * Get personalized recommendations
   */
  async getPersonalizedRecommendations(userId: string, limit: number = 20): Promise<Event[]> {
    const response = await apiClient.get<ApiResponse<Event[]>>(`/users/${userId}/recommendations?limit=${limit}`);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch recommendations');
    }
    
    // Convert date strings to Date objects
    return response.data.data.map(event => ({
      ...event,
      startDateTime: new Date(event.startDateTime),
      endDateTime: new Date(event.endDateTime),
      createdAt: new Date(event.createdAt),
      updatedAt: new Date(event.updatedAt),
      source: {
        ...event.source,
        crawlDate: event.source.crawlDate ? new Date(event.source.crawlDate) : undefined,
      },
    }));
  }

  /**
   * Get complete user profile with statistics
   */
  async getCompleteUserProfile(userId: string): Promise<CompleteUserProfile> {
    const response = await apiClient.get<ApiResponse<CompleteUserProfile>>(`/users/${userId}/complete-profile`);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch complete user profile');
    }
    
    return response.data.data;
  }

  /**
   * Update user interests based on activity
   */
  async updateUserInterestsFromActivity(userId: string): Promise<void> {
    const response = await apiClient.post<ApiResponse<null>>(`/users/${userId}/update-interests`);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to update user interests');
    }
  }

  /**
   * Check if an event is saved by the user
   */
  async isEventSaved(userId: string, eventId: string): Promise<boolean> {
    try {
      const savedEvents = await this.getSavedEvents(userId);
      return savedEvents.some(event => event.eventId === eventId);
    } catch (error) {
      console.error('Error checking if event is saved:', error);
      return false;
    }
  }
}

export const userService = new UserService();