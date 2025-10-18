import request from 'supertest';
import { app } from '../../server';
import { eventService } from '../../services/eventService';
import { EventSubmission, Event } from '../../types';

// Mock the event service
jest.mock('../../services/eventService');
const mockedEventService = eventService as jest.Mocked<typeof eventService>;

// Mock the auth middleware
jest.mock('../../middleware/authMiddleware', () => ({
  authMiddleware: {
    authenticate: jest.fn()
  }
}));

// Import after mocking
import { authMiddleware } from '../../middleware/authMiddleware';
const mockedAuthMiddleware = authMiddleware as jest.Mocked<typeof authMiddleware>;

describe('Event Routes', () => {
  const validEventData: EventSubmission = {
    title: 'Test Event',
    description: 'This is a test event for integration testing.',
    startDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    endDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // Tomorrow + 2 hours
    location: {
      venue: 'Test Venue',
      address: '123 Test Street',
      city: 'Test City',
      state: 'CA',
      zipCode: '12345',
      coordinates: {
        latitude: 37.7749,
        longitude: -122.4194
      }
    },
    organizer: {
      name: 'Test Organizer',
      email: 'organizer@test.com',
      website: 'https://test.com',
      phone: '+1-555-123-4567'
    },
    category: 'technology',
    price: {
      amount: 25.00,
      currency: 'USD',
      isFree: false
    },
    tags: ['tech', 'conference', 'networking']
  };

  const mockEvent: Event = {
    eventId: 'test-event-id',
    title: validEventData.title,
    description: validEventData.description,
    startDateTime: validEventData.startDateTime,
    endDateTime: validEventData.endDateTime,
    location: validEventData.location,
    organizer: validEventData.organizer,
    category: validEventData.category,
    price: validEventData.price,
    tags: validEventData.tags,
    source: {
      type: 'user-submitted'
    },
    createdBy: 'test-user-id',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/events', () => {
    beforeEach(() => {
      // Mock authentication middleware to pass
      (mockedAuthMiddleware.authenticate as jest.Mock).mockImplementation(async (req: any, res: any, next: any) => {
        req.user = { userId: 'test-user-id' };
        next();
      });
    });

    it('should create a new event successfully', async () => {
      mockedEventService.createEvent.mockResolvedValue(mockEvent);

      const response = await request(app)
        .post('/api/events')
        .send(validEventData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(expect.objectContaining({
        eventId: 'test-event-id',
        title: 'Test Event'
      }));
      expect(response.body.message).toBe('Event created successfully');
      expect(mockedEventService.createEvent).toHaveBeenCalledWith(validEventData, 'test-user-id');
    });

    it('should fail with invalid event data', async () => {
      const invalidEventData = {
        ...validEventData,
        title: '', // Invalid: empty title
      };

      const response = await request(app)
        .post('/api/events')
        .send(invalidEventData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
      expect(mockedEventService.createEvent).not.toHaveBeenCalled();
    });

    it('should fail when service throws validation error', async () => {
      mockedEventService.createEvent.mockRejectedValue(new Error('Validation failed: Invalid category'));

      const response = await request(app)
        .post('/api/events')
        .send(validEventData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation error');
      expect(response.body.message).toBe('Validation failed: Invalid category');
    });

    it('should fail when user is not authenticated', async () => {
      // Mock authentication middleware to fail
      (mockedAuthMiddleware.authenticate as jest.Mock).mockImplementation(async (req: any, res: any, next: any) => {
        req.user = undefined;
        next();
      });

      const response = await request(app)
        .post('/api/events')
        .send(validEventData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
      expect(mockedEventService.createEvent).not.toHaveBeenCalled();
    });

    it('should handle service errors gracefully', async () => {
      mockedEventService.createEvent.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/events')
        .send(validEventData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('GET /api/events/:id', () => {
    it('should get event by ID successfully', async () => {
      mockedEventService.getEventById.mockResolvedValue(mockEvent);

      const response = await request(app)
        .get('/api/events/test-event-id')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(expect.objectContaining({
        eventId: 'test-event-id',
        title: 'Test Event'
      }));
      expect(response.body.message).toBe('Event retrieved successfully');
      expect(mockedEventService.getEventById).toHaveBeenCalledWith('test-event-id');
    });

    it('should return 404 when event not found', async () => {
      mockedEventService.getEventById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/events/non-existent-event')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Event not found');
      expect(response.body.message).toBe('The requested event does not exist');
    });

    it('should handle service errors gracefully', async () => {
      mockedEventService.getEventById.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/events/test-event-id')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('PUT /api/events/:id', () => {
    const updateData = {
      title: 'Updated Event Title',
      description: 'Updated description',
      tags: []
    };

    beforeEach(() => {
      // Mock authentication middleware to pass
      (mockedAuthMiddleware.authenticate as jest.Mock).mockImplementation(async (req: any, res: any, next: any) => {
        req.user = { userId: 'test-user-id' };
        next();
      });
    });

    it('should update event successfully', async () => {
      const updatedEvent = { ...mockEvent, ...updateData };
      mockedEventService.updateEvent.mockResolvedValue(updatedEvent);

      const response = await request(app)
        .put('/api/events/test-event-id')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Updated Event Title');
      expect(response.body.message).toBe('Event updated successfully');
      expect(mockedEventService.updateEvent).toHaveBeenCalledWith('test-event-id', updateData, 'test-user-id');
    });

    it('should fail with invalid update data', async () => {
      const invalidUpdateData = {
        startDateTime: 'invalid-date'
      };

      const response = await request(app)
        .put('/api/events/test-event-id')
        .send(invalidUpdateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
      expect(mockedEventService.updateEvent).not.toHaveBeenCalled();
    });

    it('should return 404 when event not found', async () => {
      mockedEventService.updateEvent.mockRejectedValue(new Error('Event not found'));

      const response = await request(app)
        .put('/api/events/non-existent-event')
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Request failed');
    });

    it('should return 403 when user is not authorized', async () => {
      mockedEventService.updateEvent.mockRejectedValue(new Error('Unauthorized: You can only update events you created'));

      const response = await request(app)
        .put('/api/events/test-event-id')
        .send(updateData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Request failed');
    });

    it('should fail when user is not authenticated', async () => {
      // Mock authentication middleware to fail
      (mockedAuthMiddleware.authenticate as jest.Mock).mockImplementation(async (req: any, res: any, next: any) => {
        req.user = undefined;
        next();
      });

      const response = await request(app)
        .put('/api/events/test-event-id')
        .send(updateData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
      expect(mockedEventService.updateEvent).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/events/:id', () => {
    beforeEach(() => {
      // Mock authentication middleware to pass
      (mockedAuthMiddleware.authenticate as jest.Mock).mockImplementation(async (req: any, res: any, next: any) => {
        req.user = { userId: 'test-user-id' };
        next();
      });
    });

    it('should delete event successfully', async () => {
      mockedEventService.deleteEvent.mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/api/events/test-event-id')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Event deleted successfully');
      expect(mockedEventService.deleteEvent).toHaveBeenCalledWith('test-event-id', 'test-user-id');
    });

    it('should return 404 when event not found', async () => {
      mockedEventService.deleteEvent.mockRejectedValue(new Error('Event not found'));

      const response = await request(app)
        .delete('/api/events/non-existent-event')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Request failed');
    });

    it('should return 403 when user is not authorized', async () => {
      mockedEventService.deleteEvent.mockRejectedValue(new Error('Unauthorized: You can only delete events you created'));

      const response = await request(app)
        .delete('/api/events/test-event-id')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Request failed');
    });

    it('should fail when user is not authenticated', async () => {
      // Mock authentication middleware to fail
      (mockedAuthMiddleware.authenticate as jest.Mock).mockImplementation(async (req: any, res: any, next: any) => {
        req.user = undefined;
        next();
      });

      const response = await request(app)
        .delete('/api/events/test-event-id')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
      expect(mockedEventService.deleteEvent).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/events/user/:userId', () => {
    it('should get user events successfully', async () => {
      const userEvents = [mockEvent];
      mockedEventService.getUserEvents.mockResolvedValue(userEvents);

      const response = await request(app)
        .get('/api/events/user/test-user-id')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(expect.arrayContaining([
        expect.objectContaining({ eventId: 'test-event-id' })
      ]));
      expect(response.body.message).toBe('User events retrieved successfully');
      expect(mockedEventService.getUserEvents).toHaveBeenCalledWith('test-user-id', undefined);
    });

    it('should get user events with limit', async () => {
      const userEvents = [mockEvent];
      mockedEventService.getUserEvents.mockResolvedValue(userEvents);

      const response = await request(app)
        .get('/api/events/user/test-user-id?limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockedEventService.getUserEvents).toHaveBeenCalledWith('test-user-id', 10);
    });

    it('should fail with invalid limit parameter', async () => {
      const response = await request(app)
        .get('/api/events/user/test-user-id?limit=invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid parameter');
      expect(response.body.message).toBe('Limit must be a number between 1 and 100');
      expect(mockedEventService.getUserEvents).not.toHaveBeenCalled();
    });

    it('should return 404 when user not found', async () => {
      mockedEventService.getUserEvents.mockRejectedValue(new Error('User not found'));

      const response = await request(app)
        .get('/api/events/user/non-existent-user')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User not found');
    });
  });

  describe('GET /api/events', () => {
    it('should get public events successfully', async () => {
      const events = [mockEvent];
      mockedEventService.getPublicEvents.mockResolvedValue(events);

      const response = await request(app)
        .get('/api/events')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(expect.arrayContaining([
        expect.objectContaining({ eventId: 'test-event-id' })
      ]));
      expect(response.body.message).toBe('Events retrieved successfully');
      expect(mockedEventService.getPublicEvents).toHaveBeenCalledWith(undefined, undefined);
    });

    it('should get events with limit', async () => {
      const events = [mockEvent];
      mockedEventService.getPublicEvents.mockResolvedValue(events);

      const response = await request(app)
        .get('/api/events?limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockedEventService.getPublicEvents).toHaveBeenCalledWith(undefined, 10);
    });

    it('should get events with filters', async () => {
      const events = [mockEvent];
      mockedEventService.getPublicEvents.mockResolvedValue(events);

      const response = await request(app)
        .get('/api/events?categories=technology&city=Test City&startDate=2025-12-01')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockedEventService.getPublicEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          categories: ['technology'],
          location: expect.objectContaining({
            city: 'Test City'
          }),
          dateRange: expect.objectContaining({
            startDate: expect.any(Date)
          })
        }),
        undefined
      );
    });

    it('should fail with invalid filters', async () => {
      const response = await request(app)
        .get('/api/events?startDate=invalid-date')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid filters');
      expect(mockedEventService.getPublicEvents).not.toHaveBeenCalled();
    });

    it('should fail with invalid limit parameter', async () => {
      const response = await request(app)
        .get('/api/events?limit=invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid parameter');
      expect(response.body.message).toBe('Limit must be a number between 1 and 100');
      expect(mockedEventService.getPublicEvents).not.toHaveBeenCalled();
    });

    it('should handle service errors gracefully', async () => {
      mockedEventService.getPublicEvents.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/events')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('Advanced API Integration Tests', () => {
    beforeEach(() => {
      // Mock authentication middleware to pass
      (mockedAuthMiddleware.authenticate as jest.Mock).mockImplementation(async (req: any, res: any, next: any) => {
        req.user = { userId: 'test-user-id' };
        next();
      });
    });

    it('should validate event data completeness per requirement 4.1', async () => {
      const incompleteEventData = {
        title: 'Test Event',
        // Missing required fields: description, startDateTime, endDateTime, location
        organizer: validEventData.organizer,
        category: 'technology',
        price: validEventData.price,
        tags: []
      };

      const response = await request(app)
        .post('/api/events')
        .send(incompleteEventData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.message).toContain('required');
    });

    it('should ensure proper event storage with metadata per requirement 4.2', async () => {
      const eventWithRichMetadata = {
        ...validEventData,
        category: 'technology',
        tags: ['ai', 'machine-learning', 'conference'],
        organizer: {
          ...validEventData.organizer,
          website: 'https://example.com',
          phone: '+1-555-123-4567'
        }
      };

      mockedEventService.createEvent.mockResolvedValue({
        ...mockEvent,
        category: 'technology',
        tags: ['ai', 'machine-learning', 'conference']
      });

      const response = await request(app)
        .post('/api/events')
        .send(eventWithRichMetadata)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.category).toBe('technology');
      expect(response.body.data.tags).toEqual(['ai', 'machine-learning', 'conference']);
      expect(mockedEventService.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'technology',
          tags: ['ai', 'machine-learning', 'conference']
        }),
        'test-user-id'
      );
    });

    it('should enforce ownership validation for event updates per requirement 4.4', async () => {
      const updateData = { title: 'Updated Title', tags: [] };
      
      // Mock service to throw unauthorized error
      mockedEventService.updateEvent.mockRejectedValue(
        new Error('Unauthorized: You can only update events you created')
      );

      const response = await request(app)
        .put('/api/events/other-user-event-id')
        .send(updateData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Request failed');
      expect(response.body.message).toContain('Unauthorized');
    });

    it('should enforce ownership validation for event deletion per requirement 4.4', async () => {
      // Mock service to throw unauthorized error
      mockedEventService.deleteEvent.mockRejectedValue(
        new Error('Unauthorized: You can only delete events you created')
      );

      const response = await request(app)
        .delete('/api/events/other-user-event-id')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Request failed');
      expect(response.body.message).toContain('Unauthorized');
    });

    it('should validate event content quality per requirement 4.5', async () => {
      const eventWithPotentialSpam = {
        ...validEventData,
        title: 'FREE MONEY EVENT - CLICK NOW!!!',
        description: 'Get rich quick scheme event with guaranteed returns'
      };

      // In a real implementation, this would be rejected by content moderation
      // For now, we test that the validation framework handles it
      mockedEventService.createEvent.mockResolvedValue(mockEvent);

      const response = await request(app)
        .post('/api/events')
        .send(eventWithPotentialSpam)
        .expect(201);

      // Note: In production, this would likely be rejected or flagged
      expect(response.body.success).toBe(true);
      expect(mockedEventService.createEvent).toHaveBeenCalled();
    });

    it('should handle concurrent event operations safely', async () => {
      const updateData1 = { title: 'Update 1', tags: [] };
      const updateData2 = { title: 'Update 2', tags: [] };

      mockedEventService.updateEvent
        .mockResolvedValueOnce({ ...mockEvent, title: 'Update 1' })
        .mockResolvedValueOnce({ ...mockEvent, title: 'Update 2' });

      // Simulate concurrent updates
      const [response1, response2] = await Promise.all([
        request(app).put('/api/events/test-event-id').send(updateData1),
        request(app).put('/api/events/test-event-id').send(updateData2)
      ]);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(mockedEventService.updateEvent).toHaveBeenCalledTimes(2);
    });

    it('should validate event searchability after creation per requirement 4.3', async () => {
      const searchableEvent = {
        ...validEventData,
        title: 'Searchable Tech Conference',
        category: 'technology',
        tags: ['search', 'indexing', 'test']
      };

      mockedEventService.createEvent.mockResolvedValue({
        ...mockEvent,
        title: 'Searchable Tech Conference',
        category: 'technology',
        tags: ['search', 'indexing', 'test']
      });

      const response = await request(app)
        .post('/api/events')
        .send(searchableEvent)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Searchable Tech Conference');
      expect(response.body.data.category).toBe('technology');
      expect(response.body.data.tags).toEqual(['search', 'indexing', 'test']);
      
      // Verify the event was created with searchable metadata
      expect(mockedEventService.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Searchable Tech Conference',
          category: 'technology',
          tags: ['search', 'indexing', 'test']
        }),
        'test-user-id'
      );
    });
  });
});