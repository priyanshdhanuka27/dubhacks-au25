import { User, UserProfile, UserPreferences, Event, SearchFilters } from '../types';
import { userRepository } from '../database/repositories/userRepository';
import { eventRepository } from '../database/repositories/eventRepository';

export class UserProfileService {
  /**
   * Get user profile by user ID
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const user = await userRepository.getUserById(userId);
    return user ? user.profile : null;
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, profileData: Partial<UserProfile>): Promise<UserProfile | null> {
    const updatedUser = await userRepository.updateUserProfile(userId, profileData);
    return updatedUser ? updatedUser.profile : null;
  }

  /**
   * Get user preferences by user ID
   */
  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    const user = await userRepository.getUserById(userId);
    return user ? user.preferences : null;
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<UserPreferences | null> {
    // Get current preferences to merge with new ones
    const currentUser = await userRepository.getUserById(userId);
    if (!currentUser) {
      return null;
    }

    const mergedPreferences: UserPreferences = {
      ...currentUser.preferences,
      ...preferences,
    };

    const updatedUser = await userRepository.updateUserPreferences(userId, mergedPreferences);
    return updatedUser ? updatedUser.preferences : null;
  }

  /**
   * Save an event for a user
   */
  async saveEvent(userId: string, eventId: string): Promise<boolean> {
    // Verify the event exists
    const event = await eventRepository.getEventById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    // Check if event is already saved
    const user = await userRepository.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.savedEvents.includes(eventId)) {
      return true; // Already saved
    }

    const updatedUser = await userRepository.saveEvent(userId, eventId);
    return updatedUser !== null;
  }

  /**
   * Remove a saved event for a user
   */
  async unsaveEvent(userId: string, eventId: string): Promise<boolean> {
    const updatedUser = await userRepository.unsaveEvent(userId, eventId);
    return updatedUser !== null;
  }

  /**
   * Get all saved events for a user
   */
  async getSavedEvents(userId: string): Promise<Event[]> {
    const user = await userRepository.getUserById(userId);
    if (!user || user.savedEvents.length === 0) {
      return [];
    }

    // Get all saved events
    const events = await eventRepository.getEventsByIds(user.savedEvents);
    return events;
  }

  /**
   * Check if an event is saved by a user
   */
  async isEventSaved(userId: string, eventId: string): Promise<boolean> {
    const user = await userRepository.getUserById(userId);
    return user ? user.savedEvents.includes(eventId) : false;
  }

  /**
   * Generate preference-based event recommendations
   */
  async getPersonalizedRecommendations(userId: string, limit: number = 20): Promise<Event[]> {
    const user = await userRepository.getUserById(userId);
    if (!user) {
      return [];
    }

    const preferences = user.preferences;
    const profile = user.profile;

    // Build search filters based on user preferences
    const filters: SearchFilters = {
      categories: preferences.eventCategories.length > 0 ? preferences.eventCategories : undefined,
      priceRange: preferences.priceRange,
      distance: preferences.maxDistance,
    };

    // Add location filter if user has location set
    if (profile.location) {
      filters.location = {
        city: profile.location.city,
        state: profile.location.state,
        coordinates: profile.location.coordinates,
        radius: preferences.maxDistance,
      };
    }

    // Add date range filter for upcoming events (next 3 months)
    const now = new Date();
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(now.getMonth() + 3);

    filters.dateRange = {
      startDate: now,
      endDate: threeMonthsFromNow,
    };

    // Get events based on filters
    let recommendedEvents = await eventRepository.getEventsByFilters(filters, limit * 2); // Get more to filter out saved events

    // Filter out already saved events
    recommendedEvents = recommendedEvents.filter(event => !user.savedEvents.includes(event.eventId));

    // Score events based on user interests and preferences
    const scoredEvents = this.scoreEventsByPreferences(recommendedEvents, user);

    // Sort by score and return top results
    return scoredEvents
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.event);
  }

  /**
   * Score events based on user preferences and interests
   */
  private scoreEventsByPreferences(events: Event[], user: User): Array<{ event: Event; score: number }> {
    return events.map(event => {
      let score = 0;

      // Category preference scoring
      if (user.preferences.eventCategories.includes(event.category)) {
        score += 10;
      }

      // Interest-based scoring
      const eventTags = event.tags.map(tag => tag.toLowerCase());
      const userInterests = user.profile.interests.map(interest => interest.toLowerCase());
      
      for (const interest of userInterests) {
        if (eventTags.some(tag => tag.includes(interest) || interest.includes(tag))) {
          score += 5;
        }
        if (event.title.toLowerCase().includes(interest) || event.description.toLowerCase().includes(interest)) {
          score += 3;
        }
      }

      // Price preference scoring
      const eventPrice = event.price.isFree ? 0 : event.price.amount;
      if (eventPrice >= user.preferences.priceRange.min && eventPrice <= user.preferences.priceRange.max) {
        score += 5;
      }

      // Location proximity scoring (if user has location)
      if (user.profile.location && event.location.coordinates) {
        const distance = this.calculateDistance(
          user.profile.location.coordinates,
          event.location.coordinates
        );
        
        if (distance <= user.preferences.maxDistance) {
          // Closer events get higher scores
          const proximityScore = Math.max(0, 10 - (distance / user.preferences.maxDistance) * 10);
          score += proximityScore;
        }
      }

      // Recency bonus for newer events
      const daysSinceCreated = (Date.now() - event.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreated <= 7) {
        score += 2; // Bonus for events created in the last week
      }

      return { event, score };
    });
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateDistance(coord1: { latitude: number; longitude: number }, coord2: { latitude: number; longitude: number }): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(coord2.latitude - coord1.latitude);
    const dLon = this.toRadians(coord2.longitude - coord1.longitude);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(coord1.latitude)) * Math.cos(this.toRadians(coord2.latitude)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get user's complete profile including saved events count and preferences
   */
  async getCompleteUserProfile(userId: string): Promise<{
    profile: UserProfile;
    preferences: UserPreferences;
    savedEventsCount: number;
    recentActivity: {
      lastLogin?: Date;
      eventsCreated: number;
      eventsSaved: number;
    };
  } | null> {
    const user = await userRepository.getUserById(userId);
    if (!user) {
      return null;
    }

    // Get user's created events count
    const userEvents = await eventRepository.getEventsByCreator(userId);
    
    return {
      profile: user.profile,
      preferences: user.preferences,
      savedEventsCount: user.savedEvents.length,
      recentActivity: {
        eventsCreated: userEvents.length,
        eventsSaved: user.savedEvents.length,
      },
    };
  }

  /**
   * Update user interests based on event interactions
   */
  async updateUserInterestsFromActivity(userId: string): Promise<void> {
    const user = await userRepository.getUserById(userId);
    if (!user) {
      return;
    }

    // Get saved events to analyze interests
    const savedEvents = await this.getSavedEvents(userId);
    
    // Extract categories and tags from saved events
    const categoryFrequency: Record<string, number> = {};
    const tagFrequency: Record<string, number> = {};

    for (const event of savedEvents) {
      // Count categories
      categoryFrequency[event.category] = (categoryFrequency[event.category] || 0) + 1;
      
      // Count tags
      for (const tag of event.tags) {
        tagFrequency[tag.toLowerCase()] = (tagFrequency[tag.toLowerCase()] || 0) + 1;
      }
    }

    // Get top categories and tags
    const topCategories = Object.entries(categoryFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([category]) => category);

    const topTags = Object.entries(tagFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([tag]) => tag);

    // Merge with existing interests, avoiding duplicates
    const updatedInterests = Array.from(new Set([
      ...user.profile.interests,
      ...topTags,
    ]));

    // Update user preferences with inferred categories
    const updatedCategories = Array.from(new Set([
      ...user.preferences.eventCategories,
      ...topCategories,
    ]));

    // Update both profile interests and preference categories
    await this.updateUserProfile(userId, { interests: updatedInterests });
    await this.updateUserPreferences(userId, { eventCategories: updatedCategories });
  }
}

// Export singleton instance
export const userProfileService = new UserProfileService();