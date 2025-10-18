import { UserProfileService } from '../userProfileService';
import { userRepository } from '../../database/repositories/userRepository';
import { eventRepository } from '../../database/repositories/eventRepository';
import { User, UserProfile, UserPreferences, Event } from '../../types';

// Mock the repositories
jest.mock('../../database/repositories/userRepository');
jest.mock('../../database/repositories/eventRepository');

const mockedUserRepository = userRepository as jest.Mocked<typeof userRepository>;
const mockedEventRepository = eventRepository as jest.Mocked<typeof eventRepository>;

describe('UserProfileService', () => {
  let userProfileService: UserProfileService;
  let mockUser: User;
  let mockEvent: Event;

  beforeEach(() => {
    jest.clearAllMocks();
    userProfileService = new UserProfileService();

    // Mock user data
    mockUser = {
      userId: 'test-user-123',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
      profile: {
        firstName: 'John',
        lastName: 'Doe',
        timezone: 'America/New_York',
        interests: ['music', 'technology'],
        location: {
          venue: 'Test Venue',
          address: '123 Test St',
          city: 'Seattle',
          state: 'WA',
          zipCode: '98101',
          coordinates: {
            latitude: 47.6062,
            longitude: -122.3321
          }
        }
      },
      preferences: {
        eventCategories: ['Music', 'Technology'],
        maxDistance: 25,
        priceRange: {
          min: 0,
          max: 100,
          currency: 'USD'
        },
        notificationSettings: {
          emailNotifications: true,
          pushNotifications: false,
          reminderTime: 60
        }
      },
      savedEvents: ['event-1', 'event-2'],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    };

    // Mock event data
    mockEvent = {
      eventId: 'event-123',
      title: 'Test Event',
      description: 'A test event',
      startDateTime: new Date('2024-12-01T19:00:00Z'),
      endDateTime: new Date('2024-12-01T21:00:00Z'),
      location: {
        venue: 'Test Venue',
        address: '123 Test St',
        city: 'Seattle',
        state: 'WA',
        zipCode: '98101',
        coordinates: {
          latitude: 47.6062,
          longitude: -122.3321
        }
      },
      organizer: {
        name: 'Test Organizer',
        email: 'organizer@example.com'
      },
      category: 'Music',
      price: {
        amount: 25,
        currency: 'USD',
        isFree: false
      },
      tags: ['concert', 'live music'],
      source: {
        type: 'user-submitted'
      },
      createdBy: 'user-456',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    };
  });

  describe('getUserProfile', () => {
    it('should return user profile when user exists', async () => {
      mockedUserRepository.getUserById.mockResolvedValue(mockUser);

      const result = await userProfileService.getUserProfile('test-user-123');

      expect(result).toEqual(mockUser.profile);
      expect(mockedUserRepository.getUserById).toHaveBeenCalledWith('test-user-123');
    });

    it('should return null when user does not exist', async () => {
      mockedUserRepository.getUserById.mockResolvedValue(null);

      const result = await userProfileService.getUserProfile('nonexistent-user');

      expect(result).toBeNull();
      expect(mockedUserRepository.getUserById).toHaveBeenCalledWith('nonexistent-user');
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile successfully', async () => {
      const updatedProfile: Partial<UserProfile> = {
        firstName: 'Jane',
        interests: ['music', 'technology', 'sports']
      };

      const updatedUser = {
        ...mockUser,
        profile: {
          ...mockUser.profile,
          ...updatedProfile
        }
      };

      mockedUserRepository.updateUserProfile.mockResolvedValue(updatedUser);

      const result = await userProfileService.updateUserProfile('test-user-123', updatedProfile);

      expect(result).toEqual(updatedUser.profile);
      expect(mockedUserRepository.updateUserProfile).toHaveBeenCalledWith('test-user-123', updatedProfile);
    });

    it('should return null when user update fails', async () => {
      mockedUserRepository.updateUserProfile.mockResolvedValue(null);

      const result = await userProfileService.updateUserProfile('test-user-123', { firstName: 'Jane' });

      expect(result).toBeNull();
    });
  });

  describe('getUserPreferences', () => {
    it('should return user preferences when user exists', async () => {
      mockedUserRepository.getUserById.mockResolvedValue(mockUser);

      const result = await userProfileService.getUserPreferences('test-user-123');

      expect(result).toEqual(mockUser.preferences);
      expect(mockedUserRepository.getUserById).toHaveBeenCalledWith('test-user-123');
    });

    it('should return null when user does not exist', async () => {
      mockedUserRepository.getUserById.mockResolvedValue(null);

      const result = await userProfileService.getUserPreferences('nonexistent-user');

      expect(result).toBeNull();
    });
  });

  describe('updateUserPreferences', () => {
    it('should update user preferences successfully', async () => {
      const updatedPreferences: Partial<UserPreferences> = {
        maxDistance: 50,
        eventCategories: ['Music', 'Technology', 'Sports']
      };

      const mergedPreferences = {
        ...mockUser.preferences,
        ...updatedPreferences
      };

      const updatedUser = {
        ...mockUser,
        preferences: mergedPreferences
      };

      mockedUserRepository.getUserById.mockResolvedValue(mockUser);
      mockedUserRepository.updateUserPreferences.mockResolvedValue(updatedUser);

      const result = await userProfileService.updateUserPreferences('test-user-123', updatedPreferences);

      expect(result).toEqual(mergedPreferences);
      expect(mockedUserRepository.updateUserPreferences).toHaveBeenCalledWith('test-user-123', mergedPreferences);
    });

    it('should return null when user does not exist', async () => {
      mockedUserRepository.getUserById.mockResolvedValue(null);

      const result = await userProfileService.updateUserPreferences('nonexistent-user', { maxDistance: 50 });

      expect(result).toBeNull();
    });
  });

  describe('saveEvent', () => {
    it('should save event successfully when event exists and is not already saved', async () => {
      const userWithoutSavedEvent = {
        ...mockUser,
        savedEvents: []
      };

      mockedEventRepository.getEventById.mockResolvedValue(mockEvent);
      mockedUserRepository.getUserById.mockResolvedValue(userWithoutSavedEvent);
      mockedUserRepository.saveEvent.mockResolvedValue(mockUser);

      const result = await userProfileService.saveEvent('test-user-123', 'event-123');

      expect(result).toBe(true);
      expect(mockedEventRepository.getEventById).toHaveBeenCalledWith('event-123');
      expect(mockedUserRepository.saveEvent).toHaveBeenCalledWith('test-user-123', 'event-123');
    });

    it('should return true when event is already saved', async () => {
      const userWithSavedEvent = {
        ...mockUser,
        savedEvents: ['event-123']
      };

      mockedEventRepository.getEventById.mockResolvedValue(mockEvent);
      mockedUserRepository.getUserById.mockResolvedValue(userWithSavedEvent);

      const result = await userProfileService.saveEvent('test-user-123', 'event-123');

      expect(result).toBe(true);
      expect(mockedUserRepository.saveEvent).not.toHaveBeenCalled();
    });

    it('should throw error when event does not exist', async () => {
      mockedEventRepository.getEventById.mockResolvedValue(null);

      await expect(userProfileService.saveEvent('test-user-123', 'nonexistent-event'))
        .rejects.toThrow('Event not found');
    });

    it('should throw error when user does not exist', async () => {
      mockedEventRepository.getEventById.mockResolvedValue(mockEvent);
      mockedUserRepository.getUserById.mockResolvedValue(null);

      await expect(userProfileService.saveEvent('nonexistent-user', 'event-123'))
        .rejects.toThrow('User not found');
    });
  });

  describe('unsaveEvent', () => {
    it('should unsave event successfully', async () => {
      mockedUserRepository.unsaveEvent.mockResolvedValue(mockUser);

      const result = await userProfileService.unsaveEvent('test-user-123', 'event-123');

      expect(result).toBe(true);
      expect(mockedUserRepository.unsaveEvent).toHaveBeenCalledWith('test-user-123', 'event-123');
    });

    it('should return false when unsave fails', async () => {
      mockedUserRepository.unsaveEvent.mockResolvedValue(null);

      const result = await userProfileService.unsaveEvent('test-user-123', 'event-123');

      expect(result).toBe(false);
    });
  });

  describe('getSavedEvents', () => {
    it('should return saved events when user has saved events', async () => {
      const savedEvents = [mockEvent];
      
      mockedUserRepository.getUserById.mockResolvedValue(mockUser);
      mockedEventRepository.getEventsByIds.mockResolvedValue(savedEvents);

      const result = await userProfileService.getSavedEvents('test-user-123');

      expect(result).toEqual(savedEvents);
      expect(mockedEventRepository.getEventsByIds).toHaveBeenCalledWith(mockUser.savedEvents);
    });

    it('should return empty array when user has no saved events', async () => {
      const userWithNoSavedEvents = {
        ...mockUser,
        savedEvents: []
      };

      mockedUserRepository.getUserById.mockResolvedValue(userWithNoSavedEvents);

      const result = await userProfileService.getSavedEvents('test-user-123');

      expect(result).toEqual([]);
      expect(mockedEventRepository.getEventsByIds).not.toHaveBeenCalled();
    });

    it('should return empty array when user does not exist', async () => {
      mockedUserRepository.getUserById.mockResolvedValue(null);

      const result = await userProfileService.getSavedEvents('nonexistent-user');

      expect(result).toEqual([]);
    });
  });

  describe('isEventSaved', () => {
    it('should return true when event is saved by user', async () => {
      const userWithSavedEvent = {
        ...mockUser,
        savedEvents: ['event-123']
      };

      mockedUserRepository.getUserById.mockResolvedValue(userWithSavedEvent);

      const result = await userProfileService.isEventSaved('test-user-123', 'event-123');

      expect(result).toBe(true);
    });

    it('should return false when event is not saved by user', async () => {
      const userWithoutSavedEvent = {
        ...mockUser,
        savedEvents: []
      };

      mockedUserRepository.getUserById.mockResolvedValue(userWithoutSavedEvent);

      const result = await userProfileService.isEventSaved('test-user-123', 'event-123');

      expect(result).toBe(false);
    });

    it('should return false when user does not exist', async () => {
      mockedUserRepository.getUserById.mockResolvedValue(null);

      const result = await userProfileService.isEventSaved('nonexistent-user', 'event-123');

      expect(result).toBe(false);
    });
  });

  describe('getPersonalizedRecommendations', () => {
    it('should return personalized recommendations based on user preferences', async () => {
      const mockEvents = [mockEvent];
      
      mockedUserRepository.getUserById.mockResolvedValue(mockUser);
      mockedEventRepository.getEventsByFilters.mockResolvedValue(mockEvents);

      const result = await userProfileService.getPersonalizedRecommendations('test-user-123', 10);

      expect(result).toEqual(mockEvents);
      expect(mockedEventRepository.getEventsByFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          categories: mockUser.preferences.eventCategories,
          priceRange: mockUser.preferences.priceRange,
          distance: mockUser.preferences.maxDistance
        }),
        20 // limit * 2 to filter out saved events
      );
    });

    it('should return empty array when user does not exist', async () => {
      mockedUserRepository.getUserById.mockResolvedValue(null);

      const result = await userProfileService.getPersonalizedRecommendations('nonexistent-user');

      expect(result).toEqual([]);
    });

    it('should filter out already saved events', async () => {
      const savedEvent = { ...mockEvent, eventId: 'saved-event-123' };
      const newEvent = { ...mockEvent, eventId: 'new-event-456' };
      const mockEvents = [savedEvent, newEvent];
      
      const userWithSavedEvent = {
        ...mockUser,
        savedEvents: ['saved-event-123']
      };

      mockedUserRepository.getUserById.mockResolvedValue(userWithSavedEvent);
      mockedEventRepository.getEventsByFilters.mockResolvedValue(mockEvents);

      const result = await userProfileService.getPersonalizedRecommendations('test-user-123', 10);

      expect(result).toEqual([newEvent]);
    });
  });

  describe('getCompleteUserProfile', () => {
    it('should return complete user profile with statistics', async () => {
      const userEvents = [mockEvent];
      
      mockedUserRepository.getUserById.mockResolvedValue(mockUser);
      mockedEventRepository.getEventsByCreator.mockResolvedValue(userEvents);

      const result = await userProfileService.getCompleteUserProfile('test-user-123');

      expect(result).toEqual({
        profile: mockUser.profile,
        preferences: mockUser.preferences,
        savedEventsCount: mockUser.savedEvents.length,
        recentActivity: {
          eventsCreated: userEvents.length,
          eventsSaved: mockUser.savedEvents.length
        }
      });
    });

    it('should return null when user does not exist', async () => {
      mockedUserRepository.getUserById.mockResolvedValue(null);

      const result = await userProfileService.getCompleteUserProfile('nonexistent-user');

      expect(result).toBeNull();
    });
  });

  describe('updateUserInterestsFromActivity', () => {
    it('should update user interests based on saved events', async () => {
      const savedEvents = [
        { ...mockEvent, category: 'Music', tags: ['concert', 'rock'] },
        { ...mockEvent, category: 'Technology', tags: ['conference', 'ai'] }
      ];

      mockedUserRepository.getUserById.mockResolvedValue(mockUser);
      mockedEventRepository.getEventsByIds.mockResolvedValue(savedEvents);
      mockedUserRepository.updateUserProfile.mockResolvedValue(mockUser);
      mockedUserRepository.updateUserPreferences.mockResolvedValue(mockUser);

      await userProfileService.updateUserInterestsFromActivity('test-user-123');

      expect(mockedUserRepository.updateUserProfile).toHaveBeenCalledWith(
        'test-user-123',
        expect.objectContaining({
          interests: expect.arrayContaining(['music', 'technology', 'concert', 'rock', 'conference', 'ai'])
        })
      );

      expect(mockedUserRepository.updateUserPreferences).toHaveBeenCalledWith(
        'test-user-123',
        expect.objectContaining({
          eventCategories: expect.arrayContaining(['Music', 'Technology'])
        })
      );
    });

    it('should handle user not found gracefully', async () => {
      mockedUserRepository.getUserById.mockResolvedValue(null);

      await expect(userProfileService.updateUserInterestsFromActivity('nonexistent-user'))
        .resolves.not.toThrow();
    });
  });
});