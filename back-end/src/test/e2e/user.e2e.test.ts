import request from 'supertest';
import { app } from '../../server';
import { userRepository } from '../../database/repositories/userRepository';
import { eventRepository } from '../../database/repositories/eventRepository';
import { AuthService } from '../../services/authService';
import { UserRegistration, EventSubmission } from '../../types';

describe('User Management E2E Tests', () => {
  let authToken: string;
  let userId: string;
  let eventId: string;
  const authService = new AuthService();

  const testUser: UserRegistration = {
    email: 'testuser@example.com',
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
    timezone: 'America/New_York'
  };

  const testEvent: EventSubmission = {
    title: 'Test Event for User Management',
    description: 'A test event for user management testing',
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
    category: 'Technology',
    price: {
      amount: 50,
      currency: 'USD',
      isFree: false
    },
    tags: ['conference', 'tech']
  };

  beforeAll(async () => {
    // Register a test user and get auth token
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.success).toBe(true);
    
    authToken = registerResponse.body.data.token.token;
    userId = registerResponse.body.data.user.userId;

    // Create a test event
    const eventResponse = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${authToken}`)
      .send(testEvent);

    expect(eventResponse.status).toBe(201);
    eventId = eventResponse.body.data.eventId;
  });

  afterAll(async () => {
    // Clean up test data
    try {
      if (userId) {
        await userRepository.deleteUser(userId);
      }
      if (eventId) {
        await eventRepository.deleteEvent(eventId, userId);
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  describe('User Profile Management', () => {
    it('should get user profile', async () => {
      const response = await request(app)
        .get(`/api/users/${userId}/profile`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        firstName: testUser.firstName,
        lastName: testUser.lastName,
        timezone: testUser.timezone,
        interests: []
      });
    });

    it('should update user profile', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        interests: ['technology', 'music'],
        location: {
          venue: 'Updated Venue',
          address: '456 Updated St',
          city: 'Portland',
          state: 'OR',
          zipCode: '97201',
          coordinates: {
            latitude: 45.5152,
            longitude: -122.6784
          }
        }
      };

      const response = await request(app)
        .put(`/api/users/${userId}/profile`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject(updateData);
    });

    it('should reject invalid profile updates', async () => {
      const invalidData = {
        firstName: 'A', // Too short
        lastName: ''    // Empty
      };

      const response = await request(app)
        .put(`/api/users/${userId}/profile`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('User Preferences Management', () => {
    it('should get user preferences', async () => {
      const response = await request(app)
        .get(`/api/users/${userId}/preferences`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        eventCategories: [],
        maxDistance: 25,
        priceRange: {
          min: 0,
          max: 1000,
          currency: 'USD'
        },
        notificationSettings: {
          emailNotifications: true,
          pushNotifications: false,
          reminderTime: 60
        }
      });
    });

    it('should update user preferences', async () => {
      const updateData = {
        eventCategories: ['Technology', 'Music'],
        maxDistance: 50,
        priceRange: {
          min: 10,
          max: 200,
          currency: 'USD'
        },
        notificationSettings: {
          emailNotifications: false,
          pushNotifications: true,
          reminderTime: 120
        }
      };

      const response = await request(app)
        .put(`/api/users/${userId}/preferences`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject(updateData);
    });

    it('should reject invalid preference updates', async () => {
      const invalidData = {
        maxDistance: -10, // Negative distance
        priceRange: {
          min: -5,        // Negative price
          max: 100,
          currency: 'USD'
        }
      };

      const response = await request(app)
        .put(`/api/users/${userId}/preferences`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('Saved Events Management', () => {
    it('should save an event', async () => {
      const response = await request(app)
        .post(`/api/users/${userId}/saved-events/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.eventId).toBe(eventId);
    });

    it('should get saved events', async () => {
      const response = await request(app)
        .get(`/api/users/${userId}/saved-events`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].eventId).toBe(eventId);
    });

    it('should handle saving the same event twice', async () => {
      // Save the same event again
      const response = await request(app)
        .post(`/api/users/${userId}/saved-events/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify it's still only saved once
      const savedEventsResponse = await request(app)
        .get(`/api/users/${userId}/saved-events`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(savedEventsResponse.body.data).toHaveLength(1);
    });

    it('should unsave an event', async () => {
      const response = await request(app)
        .delete(`/api/users/${userId}/saved-events/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.eventId).toBe(eventId);

      // Verify event is no longer saved
      const savedEventsResponse = await request(app)
        .get(`/api/users/${userId}/saved-events`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(savedEventsResponse.body.data).toHaveLength(0);
    });

    it('should return 404 when saving nonexistent event', async () => {
      const nonexistentEventId = 'nonexistent-event-123';

      const response = await request(app)
        .post(`/api/users/${userId}/saved-events/${nonexistentEventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Event not found');
    });
  });

  describe('Personalized Recommendations', () => {
    beforeAll(async () => {
      // Set up user preferences for recommendations
      await request(app)
        .put(`/api/users/${userId}/preferences`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          eventCategories: ['Technology'],
          maxDistance: 100,
          priceRange: {
            min: 0,
            max: 100,
            currency: 'USD'
          }
        });
    });

    it('should get personalized recommendations', async () => {
      const response = await request(app)
        .get(`/api/users/${userId}/recommendations`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      // Should include our test event since it matches preferences
      expect(response.body.data.some((event: any) => event.eventId === eventId)).toBe(true);
    });

    it('should accept custom limit for recommendations', async () => {
      const response = await request(app)
        .get(`/api/users/${userId}/recommendations?limit=5`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    it('should reject invalid limit values', async () => {
      const response = await request(app)
        .get(`/api/users/${userId}/recommendations?limit=150`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid limit');
    });
  });

  describe('Complete User Profile', () => {
    it('should get complete user profile with statistics', async () => {
      const response = await request(app)
        .get(`/api/users/${userId}/complete-profile`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('profile');
      expect(response.body.data).toHaveProperty('preferences');
      expect(response.body.data).toHaveProperty('savedEventsCount');
      expect(response.body.data).toHaveProperty('recentActivity');
      
      expect(response.body.data.recentActivity).toHaveProperty('eventsCreated');
      expect(response.body.data.recentActivity).toHaveProperty('eventsSaved');
    });
  });

  describe('Interest Updates from Activity', () => {
    beforeAll(async () => {
      // Save the test event to have activity data
      await request(app)
        .post(`/api/users/${userId}/saved-events/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`);
    });

    it('should update user interests based on activity', async () => {
      const response = await request(app)
        .post(`/api/users/${userId}/update-interests`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User interests updated based on activity');

      // Verify interests were updated
      const profileResponse = await request(app)
        .get(`/api/users/${userId}/profile`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Should include tags from saved events
      expect(profileResponse.body.data.interests).toEqual(
        expect.arrayContaining(['conference', 'tech'])
      );
    });
  });

  describe('Authorization and Security', () => {
    it('should require authentication for all endpoints', async () => {
      const response = await request(app)
        .get(`/api/users/${userId}/profile`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should prevent access to other users\' data', async () => {
      // Create another user
      const otherUser: UserRegistration = {
        email: 'otheruser@example.com',
        password: 'OtherPassword123!',
        firstName: 'Other',
        lastName: 'User',
        timezone: 'America/Los_Angeles'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(otherUser);

      const otherUserId = registerResponse.body.data.user.userId;

      try {
        // Try to access other user's profile with our token
        const response = await request(app)
          .get(`/api/users/${otherUserId}/profile`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Access denied');
      } finally {
        // Clean up other user
        await userRepository.deleteUser(otherUserId);
      }
    });

    it('should validate JWT tokens properly', async () => {
      const invalidToken = 'invalid.jwt.token';

      const response = await request(app)
        .get(`/api/users/${userId}/profile`)
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});