import request from 'supertest';
import express from 'express';
import userRoutes from '../userRoutes';
import { userProfileService } from '../../services/userProfileService';
import { authMiddleware } from '../../middleware/authMiddleware';
import { UserProfile, UserPreferences, Event } from '../../types';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock the services and middleware
jest.mock('../../services/userProfileService');
jest.mock('../../middleware/authMiddleware');

const mockedUserProfileService = userProfileService as jest.Mocked<typeof userProfileService>;
const mockedAuthMiddleware = authMiddleware as jest.Mocked<typeof authMiddleware>;

describe('User Routes', () => {
  let app: express.Application;
  const mockUserId = 'test-user-123';
  const mockProfile: UserProfile = {
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
  };

  const mockPreferences: UserPreferences = {
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
  };

  const mockEvent: Event = {
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
      name: 'Test Organizer'
    },
    category: 'Music',
    price: {
      amount: 25,
      currency: 'USD',
      isFree: false
    },
    tags: ['concert'],
    source: {
      type: 'user-submitted'
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    app = express();
    app.use(express.json());
    app.use('/users', userRoutes);

    // Mock authentication middleware to pass through with user
    mockedAuthMiddleware.authenticate.mockImplementation(async (req: any, res: any, next: any) => {
      req.user = { userId: mockUserId };
      next();
    });
  });

  describe('GET /users/:id/profile', () => {
    it('should return user profile successfully', async () => {
      mockedUserProfileService.getUserProfile.mockResolvedValue(mockProfile);

      const response = await request(app)
        .get(`/users/${mockUserId}/profile`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockProfile);
      expect(mockedUserProfileService.getUserProfile).toHaveBeenCalledWith(mockUserId);
    });

    it('should return 404 when profile not found', async () => {
      mockedUserProfileService.getUserProfile.mockResolvedValue(null);

      const response = await request(app)
        .get(`/users/${mockUserId}/profile`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Profile not found');
    });

    it('should return 403 when accessing another user\'s profile', async () => {
      const response = await request(app)
        .get('/users/other-user-123/profile')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access denied');
    });
  });

  describe('PUT /users/:id/profile', () => {
    it('should update user profile successfully', async () => {
      const updateData = { firstName: 'Jane', lastName: 'Smith' };
      const updatedProfile = { ...mockProfile, ...updateData };

      mockedUserProfileService.updateUserProfile.mockResolvedValue(updatedProfile);

      const response = await request(app)
        .put(`/users/${mockUserId}/profile`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(updatedProfile);
      expect(mockedUserProfileService.updateUserProfile).toHaveBeenCalledWith(mockUserId, updateData);
    });

    it('should return 400 for invalid profile data', async () => {
      const invalidData = { firstName: 'A' }; // Too short

      const response = await request(app)
        .put(`/users/${mockUserId}/profile`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 404 when profile update fails', async () => {
      mockedUserProfileService.updateUserProfile.mockResolvedValue(null);

      const response = await request(app)
        .put(`/users/${mockUserId}/profile`)
        .send({ firstName: 'Jane' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Update failed');
    });
  });

  describe('GET /users/:id/preferences', () => {
    it('should return user preferences successfully', async () => {
      mockedUserProfileService.getUserPreferences.mockResolvedValue(mockPreferences);

      const response = await request(app)
        .get(`/users/${mockUserId}/preferences`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockPreferences);
      expect(mockedUserProfileService.getUserPreferences).toHaveBeenCalledWith(mockUserId);
    });

    it('should return 404 when preferences not found', async () => {
      mockedUserProfileService.getUserPreferences.mockResolvedValue(null);

      const response = await request(app)
        .get(`/users/${mockUserId}/preferences`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Preferences not found');
    });
  });

  describe('PUT /users/:id/preferences', () => {
    it('should update user preferences successfully', async () => {
      const updateData = { maxDistance: 50 };
      const updatedPreferences = { ...mockPreferences, ...updateData };

      mockedUserProfileService.updateUserPreferences.mockResolvedValue(updatedPreferences);

      const response = await request(app)
        .put(`/users/${mockUserId}/preferences`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(updatedPreferences);
      expect(mockedUserProfileService.updateUserPreferences).toHaveBeenCalledWith(mockUserId, updateData);
    });

    it('should return 400 for invalid preferences data', async () => {
      const invalidData = { maxDistance: -5 }; // Negative distance

      const response = await request(app)
        .put(`/users/${mockUserId}/preferences`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('POST /users/:id/saved-events/:eventId', () => {
    it('should save event successfully', async () => {
      const eventId = 'event-123';
      mockedUserProfileService.saveEvent.mockResolvedValue(true);

      const response = await request(app)
        .post(`/users/${mockUserId}/saved-events/${eventId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.eventId).toBe(eventId);
      expect(mockedUserProfileService.saveEvent).toHaveBeenCalledWith(mockUserId, eventId);
    });

    it('should return 404 when event not found', async () => {
      const eventId = 'nonexistent-event';
      mockedUserProfileService.saveEvent.mockRejectedValue(new Error('Event not found'));

      const response = await request(app)
        .post(`/users/${mockUserId}/saved-events/${eventId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Event not found');
    });

    it('should return 404 when user not found', async () => {
      const eventId = 'event-123';
      mockedUserProfileService.saveEvent.mockRejectedValue(new Error('User not found'));

      const response = await request(app)
        .post(`/users/${mockUserId}/saved-events/${eventId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User not found');
    });
  });

  describe('DELETE /users/:id/saved-events/:eventId', () => {
    it('should remove saved event successfully', async () => {
      const eventId = 'event-123';
      mockedUserProfileService.unsaveEvent.mockResolvedValue(true);

      const response = await request(app)
        .delete(`/users/${mockUserId}/saved-events/${eventId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.eventId).toBe(eventId);
      expect(mockedUserProfileService.unsaveEvent).toHaveBeenCalledWith(mockUserId, eventId);
    });

    it('should return 400 when remove fails', async () => {
      const eventId = 'event-123';
      mockedUserProfileService.unsaveEvent.mockResolvedValue(false);

      const response = await request(app)
        .delete(`/users/${mockUserId}/saved-events/${eventId}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Remove failed');
    });
  });

  describe('GET /users/:id/saved-events', () => {
    it('should return saved events successfully', async () => {
      const savedEvents = [mockEvent];
      mockedUserProfileService.getSavedEvents.mockResolvedValue(savedEvents);

      const response = await request(app)
        .get(`/users/${mockUserId}/saved-events`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].eventId).toBe(savedEvents[0].eventId);
      expect(response.body.data[0].title).toBe(savedEvents[0].title);
      expect(mockedUserProfileService.getSavedEvents).toHaveBeenCalledWith(mockUserId);
    });

    it('should return empty array when no saved events', async () => {
      mockedUserProfileService.getSavedEvents.mockResolvedValue([]);

      const response = await request(app)
        .get(`/users/${mockUserId}/saved-events`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });
  });

  describe('GET /users/:id/recommendations', () => {
    it('should return personalized recommendations successfully', async () => {
      const recommendations = [mockEvent];
      mockedUserProfileService.getPersonalizedRecommendations.mockResolvedValue(recommendations);

      const response = await request(app)
        .get(`/users/${mockUserId}/recommendations`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].eventId).toBe(recommendations[0].eventId);
      expect(response.body.data[0].title).toBe(recommendations[0].title);
      expect(mockedUserProfileService.getPersonalizedRecommendations).toHaveBeenCalledWith(mockUserId, 20);
    });

    it('should accept custom limit parameter', async () => {
      const recommendations = [mockEvent];
      mockedUserProfileService.getPersonalizedRecommendations.mockResolvedValue(recommendations);

      const response = await request(app)
        .get(`/users/${mockUserId}/recommendations?limit=10`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockedUserProfileService.getPersonalizedRecommendations).toHaveBeenCalledWith(mockUserId, 10);
    });

    it('should return 400 for invalid limit', async () => {
      const response = await request(app)
        .get(`/users/${mockUserId}/recommendations?limit=150`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid limit');
    });
  });

  describe('GET /users/:id/complete-profile', () => {
    it('should return complete user profile successfully', async () => {
      const completeProfile = {
        profile: mockProfile,
        preferences: mockPreferences,
        savedEventsCount: 2,
        recentActivity: {
          eventsCreated: 1,
          eventsSaved: 2
        }
      };

      mockedUserProfileService.getCompleteUserProfile.mockResolvedValue(completeProfile);

      const response = await request(app)
        .get(`/users/${mockUserId}/complete-profile`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(completeProfile);
      expect(mockedUserProfileService.getCompleteUserProfile).toHaveBeenCalledWith(mockUserId);
    });

    it('should return 404 when complete profile not found', async () => {
      mockedUserProfileService.getCompleteUserProfile.mockResolvedValue(null);

      const response = await request(app)
        .get(`/users/${mockUserId}/complete-profile`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Profile not found');
    });
  });

  describe('POST /users/:id/update-interests', () => {
    it('should update user interests from activity successfully', async () => {
      mockedUserProfileService.updateUserInterestsFromActivity.mockResolvedValue();

      const response = await request(app)
        .post(`/users/${mockUserId}/update-interests`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User interests updated based on activity');
      expect(mockedUserProfileService.updateUserInterestsFromActivity).toHaveBeenCalledWith(mockUserId);
    });

    it('should handle service errors gracefully', async () => {
      mockedUserProfileService.updateUserInterestsFromActivity.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .post(`/users/${mockUserId}/update-interests`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for all endpoints', async () => {
      // Mock authentication middleware to fail
      mockedAuthMiddleware.authenticate.mockImplementation(async (req: any, res: any, next: any) => {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      });

      const response = await request(app)
        .get(`/users/${mockUserId}/profile`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should prevent access to other users\' data', async () => {
      // Mock authentication middleware with different user
      mockedAuthMiddleware.authenticate.mockImplementation(async (req: any, res: any, next: any) => {
        req.user = { userId: 'different-user-123' };
        next();
      });

      const response = await request(app)
        .get(`/users/${mockUserId}/profile`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access denied');
    });
  });
});