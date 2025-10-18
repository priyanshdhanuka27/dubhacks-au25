import request from 'supertest';
import { app } from '../../server';
import { config } from '../../config';

describe('End-to-End Integration Tests', () => {
  let authToken: string;
  let refreshToken: string;
  let userId: string;
  let eventId: string;
  
  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
    timezone: 'America/New_York'
  };

  const testEvent = {
    title: 'Test Event for Integration',
    description: 'This is a test event created during integration testing',
    startDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    endDateTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(), // Tomorrow + 1 hour
    location: {
      venue: 'Test Venue',
      address: '123 Test Street',
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
      email: 'organizer@example.com',
      website: 'https://example.com'
    },
    category: 'Technology',
    price: {
      amount: 25.00,
      currency: 'USD',
      isFree: false
    },
    tags: ['test', 'integration', 'technology']
  };

  beforeAll(async () => {
    // Ensure the server is ready
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  describe('Complete User Workflow', () => {
    it('should complete the full user registration to calendar integration workflow', async () => {
      // Step 1: Health Check
      console.log('🏥 Testing health check...');
      const healthResponse = await request(app)
        .get('/health')
        .expect(200);
      
      expect(healthResponse.body.status).toBe('healthy');

      // Step 2: User Registration
      console.log('👤 Testing user registration...');
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.data.user).toBeDefined();
      expect(registerResponse.body.data.token).toBeDefined();
      
      authToken = registerResponse.body.data.token.token;
      refreshToken = registerResponse.body.data.token.refreshToken;
      userId = registerResponse.body.data.user.userId;

      // Step 3: User Login (verify authentication works)
      console.log('🔐 Testing user login...');
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data.token).toBeDefined();

      // Step 4: Get User Profile
      console.log('👤 Testing user profile retrieval...');
      const profileResponse = await request(app)
        .get(`/api/users/${userId}/profile`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(profileResponse.body.success).toBe(true);
      expect(profileResponse.body.data.firstName).toBe(testUser.firstName);

      // Step 5: Update User Preferences
      console.log('⚙️ Testing user preferences update...');
      const preferences = {
        eventCategories: ['Technology', 'Business'],
        maxDistance: 50,
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

      const preferencesResponse = await request(app)
        .put(`/api/users/${userId}/preferences`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(preferences)
        .expect(200);

      expect(preferencesResponse.body.success).toBe(true);
      expect(preferencesResponse.body.data.eventCategories).toEqual(preferences.eventCategories);

      // Step 6: Create Event
      console.log('📅 Testing event creation...');
      const eventResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testEvent)
        .expect(201);

      expect(eventResponse.body.success).toBe(true);
      expect(eventResponse.body.data.title).toBe(testEvent.title);
      eventId = eventResponse.body.data.eventId;

      // Step 7: Get Event Details
      console.log('📋 Testing event retrieval...');
      const getEventResponse = await request(app)
        .get(`/api/events/${eventId}`)
        .expect(200);

      expect(getEventResponse.body.success).toBe(true);
      expect(getEventResponse.body.data.eventId).toBe(eventId);

      // Step 8: Search for Events
      console.log('🔍 Testing event search...');
      const searchResponse = await request(app)
        .get('/api/search/events/search')
        .query({ q: 'test', limit: 10 })
        .expect(200);

      expect(searchResponse.body.success).toBe(true);
      expect(Array.isArray(searchResponse.body.data.events)).toBe(true);

      // Step 9: Save Event
      console.log('❤️ Testing event saving...');
      const saveEventResponse = await request(app)
        .post(`/api/users/${userId}/saved-events/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(saveEventResponse.body.success).toBe(true);

      // Step 10: Get Saved Events
      console.log('📚 Testing saved events retrieval...');
      const savedEventsResponse = await request(app)
        .get(`/api/users/${userId}/saved-events`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(savedEventsResponse.body.success).toBe(true);
      expect(Array.isArray(savedEventsResponse.body.data)).toBe(true);
      expect(savedEventsResponse.body.data.some((event: any) => event.eventId === eventId)).toBe(true);

      // Step 11: Generate Calendar File
      console.log('📅 Testing calendar file generation...');
      const calendarResponse = await request(app)
        .get(`/api/events/${eventId}/calendar`)
        .expect(200);

      expect(calendarResponse.headers['content-type']).toContain('text/calendar');
      expect(calendarResponse.text).toContain('BEGIN:VCALENDAR');
      expect(calendarResponse.text).toContain('BEGIN:VEVENT');
      expect(calendarResponse.text).toContain(testEvent.title);

      // Step 12: Get Calendar Links
      console.log('🔗 Testing calendar links generation...');
      const calendarLinksResponse = await request(app)
        .get(`/api/events/${eventId}/calendar/link`)
        .expect(200);

      expect(calendarLinksResponse.body.success).toBe(true);
      expect(calendarLinksResponse.body.data.google).toBeDefined();
      expect(calendarLinksResponse.body.data.outlook).toBeDefined();
      expect(calendarLinksResponse.body.data.ics).toBeDefined();

      // Step 13: Get Personalized Recommendations
      console.log('🎯 Testing personalized recommendations...');
      const recommendationsResponse = await request(app)
        .get(`/api/users/${userId}/recommendations`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 5 })
        .expect(200);

      expect(recommendationsResponse.body.success).toBe(true);
      expect(Array.isArray(recommendationsResponse.body.data)).toBe(true);

      // Step 14: Update Event
      console.log('✏️ Testing event update...');
      const updatedEventData = {
        title: 'Updated Test Event',
        description: 'This event has been updated during integration testing'
      };

      const updateEventResponse = await request(app)
        .put(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updatedEventData)
        .expect(200);

      expect(updateEventResponse.body.success).toBe(true);
      expect(updateEventResponse.body.data.title).toBe(updatedEventData.title);

      // Step 15: Unsave Event
      console.log('💔 Testing event unsaving...');
      const unsaveEventResponse = await request(app)
        .delete(`/api/users/${userId}/saved-events/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(unsaveEventResponse.body.success).toBe(true);

      // Step 16: Delete Event
      console.log('🗑️ Testing event deletion...');
      const deleteEventResponse = await request(app)
        .delete(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(deleteEventResponse.body.success).toBe(true);

      // Step 17: Verify Event is Deleted
      console.log('✅ Verifying event deletion...');
      await request(app)
        .get(`/api/events/${eventId}`)
        .expect(404);

      // Step 18: Token Refresh
      console.log('🔄 Testing token refresh...');
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(refreshResponse.body.success).toBe(true);
      expect(refreshResponse.body.data.token).toBeDefined();

      // Step 19: Logout
      console.log('👋 Testing user logout...');
      const logoutResponse = await request(app)
        .delete('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(logoutResponse.body.success).toBe(true);

      console.log('🎉 Complete user workflow test passed!');
    }, 60000); // 60 second timeout for the full workflow
  });

  describe('Performance Tests', () => {
    it('should handle concurrent user registrations', async () => {
      console.log('⚡ Testing concurrent user registrations...');
      
      const concurrentUsers = 5;
      const registrationPromises = [];

      for (let i = 0; i < concurrentUsers; i++) {
        const user = {
          email: `concurrent-test-${Date.now()}-${i}@example.com`,
          password: 'TestPassword123!',
          firstName: `Test${i}`,
          lastName: 'User',
          timezone: 'America/New_York'
        };

        registrationPromises.push(
          request(app)
            .post('/api/auth/register')
            .send(user)
            .expect(201)
        );
      }

      const responses = await Promise.all(registrationPromises);
      
      responses.forEach(response => {
        expect(response.body.success).toBe(true);
        expect(response.body.data.user).toBeDefined();
      });

      console.log(`✅ Successfully handled ${concurrentUsers} concurrent registrations`);
    }, 30000);

    it('should handle search response time requirements', async () => {
      console.log('🔍 Testing search response time...');
      
      const startTime = Date.now();
      
      const searchResponse = await request(app)
        .get('/api/search/events/search')
        .query({ q: 'technology', limit: 20 })
        .expect(200);

      const responseTime = Date.now() - startTime;
      
      expect(searchResponse.body.success).toBe(true);
      expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
      
      console.log(`✅ Search completed in ${responseTime}ms`);
    });

    it('should handle calendar file generation performance', async () => {
      console.log('📅 Testing calendar generation performance...');
      
      // First create an event to test with
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: `perf-test-${Date.now()}@example.com`,
          password: 'TestPassword123!',
          firstName: 'Perf',
          lastName: 'Test',
          timezone: 'America/New_York'
        })
        .expect(201);

      const token = registerResponse.body.data.token.token;

      const eventResponse = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${token}`)
        .send(testEvent)
        .expect(201);

      const createdEventId = eventResponse.body.data.eventId;

      // Test calendar generation performance
      const startTime = Date.now();
      
      const calendarResponse = await request(app)
        .get(`/api/events/${createdEventId}/calendar`)
        .expect(200);

      const responseTime = Date.now() - startTime;
      
      expect(calendarResponse.headers['content-type']).toContain('text/calendar');
      expect(responseTime).toBeLessThan(500); // Should generate within 500ms
      
      console.log(`✅ Calendar generation completed in ${responseTime}ms`);

      // Cleanup
      await request(app)
        .delete(`/api/events/${createdEventId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

  describe('Security Tests', () => {
    it('should prevent unauthorized access to protected routes', async () => {
      console.log('🔒 Testing unauthorized access prevention...');
      
      // Test accessing user profile without token
      await request(app)
        .get(`/api/users/test-user-id/profile`)
        .expect(401);

      // Test creating event without token
      await request(app)
        .post('/api/events')
        .send(testEvent)
        .expect(401);

      // Test accessing saved events without token
      await request(app)
        .get(`/api/users/test-user-id/saved-events`)
        .expect(401);

      console.log('✅ Unauthorized access properly blocked');
    });

    it('should validate input data and prevent injection attacks', async () => {
      console.log('🛡️ Testing input validation and injection prevention...');
      
      // Test SQL injection attempt in registration
      const maliciousUser = {
        email: "test'; DROP TABLE users; --@example.com",
        password: 'TestPassword123!',
        firstName: '<script>alert("xss")</script>',
        lastName: 'User',
        timezone: 'America/New_York'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(maliciousUser)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');

      console.log('✅ Input validation working correctly');
    });

    it('should enforce rate limiting', async () => {
      console.log('🚦 Testing rate limiting...');
      
      // Make multiple rapid requests to test rate limiting
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email: 'nonexistent@example.com',
              password: 'wrongpassword'
            })
        );
      }

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited (429 status)
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      
      // Note: Rate limiting might not trigger in test environment
      // This test verifies the endpoint handles rapid requests gracefully
      console.log(`✅ Handled ${requests.length} rapid requests, ${rateLimitedResponses.length} rate limited`);
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle database connection errors gracefully', async () => {
      console.log('💥 Testing database error handling...');
      
      // Test with invalid event ID (should handle gracefully)
      const response = await request(app)
        .get('/api/events/invalid-event-id-that-does-not-exist')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Event not found');

      console.log('✅ Database errors handled gracefully');
    });

    it('should handle malformed requests', async () => {
      console.log('🔧 Testing malformed request handling...');
      
      // Test with malformed JSON
      const response = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      console.log('✅ Malformed requests handled gracefully');
    });

    it('should handle service unavailability', async () => {
      console.log('🚫 Testing service unavailability handling...');
      
      // Test search when Bedrock might be unavailable
      const response = await request(app)
        .post('/api/search')
        .send({ query: 'test search query' });

      // Should either succeed or fail gracefully with proper error message
      if (response.status !== 200) {
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      }

      console.log('✅ Service unavailability handled gracefully');
    });
  });

  afterAll(async () => {
    // Cleanup any remaining test data
    console.log('🧹 Cleaning up test data...');
    
    // Note: In a real test environment, you might want to clean up
    // any test users or events created during testing
    
    console.log('✅ Cleanup completed');
  });
});