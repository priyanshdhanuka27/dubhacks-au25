import request from 'supertest';
import { app } from '../../server';
import { searchService } from '../../services/searchService';
import { authMiddleware } from '../../middleware/authMiddleware';

// Mock dependencies
jest.mock('../../services/searchService');
jest.mock('../../middleware/authMiddleware');

const mockedSearchService = searchService as jest.Mocked<typeof searchService>;
const mockedAuthMiddleware = authMiddleware as jest.Mocked<typeof authMiddleware>;

describe('Search Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock auth middleware to pass through
    mockedAuthMiddleware.authenticate = jest.fn().mockImplementation((req, res, next) => {
      req.user = { userId: 'test-user-123' };
      next();
    });
  });

  describe('POST /api/search', () => {
    const mockRAGResponse = {
      answer: 'I found several music concerts this weekend.',
      sources: [
        {
          title: 'Rock Concert Downtown',
          url: 'https://example.com/events/rock-concert',
          excerpt: 'Amazing rock concert featuring local bands',
          relevanceScore: 0.95,
        },
      ],
      sessionId: 'session-123',
    };

    it('should perform conversational search successfully', async () => {
      mockedSearchService.performConversationalSearch.mockResolvedValue(mockRAGResponse);

      const response = await request(app)
        .post('/api/search')
        .send({
          query: 'Find music concerts this weekend',
          sessionId: 'session-123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockRAGResponse);
      expect(response.body.message).toBe('Conversational search completed successfully');

      expect(mockedSearchService.performConversationalSearch).toHaveBeenCalledWith(
        'Find music concerts this weekend',
        undefined, // No authenticated user
        'session-123'
      );
    });

    it('should handle authenticated user', async () => {
      mockedSearchService.performConversationalSearch.mockResolvedValue(mockRAGResponse);

      const response = await request(app)
        .post('/api/search')
        .set('Authorization', 'Bearer valid-token')
        .send({
          query: 'Find music concerts this weekend',
        });

      expect(response.status).toBe(200);
      expect(mockedSearchService.performConversationalSearch).toHaveBeenCalledWith(
        'Find music concerts this weekend',
        'test-user-123',
        undefined
      );
    });

    it('should validate request body', async () => {
      const response = await request(app)
        .post('/api/search')
        .send({
          query: '', // Empty query
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should handle search service errors', async () => {
      mockedSearchService.performConversationalSearch.mockRejectedValue(
        new Error('Search service unavailable')
      );

      const response = await request(app)
        .post('/api/search')
        .send({
          query: 'Find events',
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Internal server error');
    });

    it('should handle rate limit errors', async () => {
      mockedSearchService.performConversationalSearch.mockRejectedValue(
        new Error('rate limit exceeded')
      );

      const response = await request(app)
        .post('/api/search')
        .send({
          query: 'Find events',
        });

      expect(response.status).toBe(429);
      expect(response.body.error).toBe('Rate limit exceeded');
    });
  });

  describe('POST /api/search/semantic', () => {
    const mockSearchResult = {
      events: [
        {
          eventId: 'event-123',
          title: 'Tech Conference 2024',
          description: 'Annual technology conference',
          startDateTime: '2024-03-15T10:00:00Z',
          endDateTime: '2024-03-15T18:00:00Z',
          location: {
            venue: 'Convention Center',
            address: '123 Main St',
            city: 'Seattle',
            state: 'WA',
          },
          relevanceScore: 0.9,
          source: 'knowledge-base',
        },
      ],
      totalResults: 1,
      query: 'tech conference',
      rankingFactors: {} as any,
      isUserSubmitted: false,
      isSaved: false,
    };

    it('should perform semantic search successfully', async () => {
      mockedSearchService.performSemanticSearch.mockResolvedValue(mockSearchResult);

      const response = await request(app)
        .post('/api/search/semantic')
        .send({
          query: 'tech conference',
          filters: {
            location: {
              city: 'Seattle',
              state: 'WA',
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockSearchResult);

      expect(mockedSearchService.performSemanticSearch).toHaveBeenCalledWith(
        'tech conference',
        {
          location: {
            city: 'Seattle',
            state: 'WA',
          },
        },
        undefined
      );
    });

    it('should validate filters', async () => {
      const response = await request(app)
        .post('/api/search/semantic')
        .send({
          query: 'tech conference',
          filters: {
            dateRange: {
              startDate: '2024-03-15',
              endDate: '2024-03-10', // End before start
            },
          },
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('GET /api/search/events/feed/:userId', () => {
    const mockPersonalizedResults = {
      events: [
        {
          eventId: 'event-123',
          title: 'Personalized Event',
          description: 'Event based on your preferences',
          startDateTime: '2024-03-15T10:00:00Z',
          endDateTime: '2024-03-15T18:00:00Z',
          location: {
            venue: 'Local Venue',
            address: '123 Main St',
            city: 'Seattle',
            state: 'WA',
          },
          relevanceScore: 0.95,
          source: 'knowledge-base',
          personalizedScore: 0.9,
        },
      ],
      totalResults: 1,
      query: 'personalized query',
      rankingFactors: {} as any,
      isUserSubmitted: false,
      isSaved: false,
    };

    it('should get personalized feed successfully', async () => {
      mockedSearchService.getPersonalizedRecommendations.mockResolvedValue(mockPersonalizedResults);

      const response = await request(app)
        .get('/api/search/events/feed/test-user-123')
        .set('Authorization', 'Bearer valid-token')
        .query({
          maxResults: '10',
          includeUserSubmitted: 'true',
          boostSavedEvents: 'true',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockPersonalizedResults);

      expect(mockedSearchService.getPersonalizedRecommendations).toHaveBeenCalledWith({
        userId: 'test-user-123',
        maxResults: 10,
        includeUserSubmitted: true,
        boostSavedEvents: true,
      });
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/search/events/feed/test-user-123');

      expect(response.status).toBe(401);
    });

    it('should prevent access to other users feeds', async () => {
      const response = await request(app)
        .get('/api/search/events/feed/other-user-456')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Unauthorized');
      expect(response.body.message).toBe('You can only access your own event feed');
    });

    it('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/search/events/feed/test-user-123')
        .set('Authorization', 'Bearer valid-token')
        .query({
          maxResults: '150', // Too high
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid parameters');
    });
  });

  describe('GET /api/search/events/search', () => {
    const mockSearchResult = {
      events: [
        {
          eventId: 'event-123',
          title: 'Tech Conference 2024',
          description: 'Annual technology conference',
          startDateTime: '2024-03-15T10:00:00Z',
          endDateTime: '2024-03-15T18:00:00Z',
          location: {
            venue: 'Convention Center',
            address: '123 Main St',
            city: 'Seattle',
            state: 'WA',
          },
          relevanceScore: 0.9,
          source: 'knowledge-base',
        },
      ],
      totalResults: 1,
      query: 'tech conference',
      rankingFactors: {} as any,
      isUserSubmitted: false,
      isSaved: false,
    };

    it('should search events successfully', async () => {
      mockedSearchService.performSemanticSearch.mockResolvedValue(mockSearchResult);

      const response = await request(app)
        .get('/api/search/events/search')
        .query({
          q: 'tech conference',
          city: 'Seattle',
          state: 'WA',
          limit: '20',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.events).toHaveLength(1);

      expect(mockedSearchService.performSemanticSearch).toHaveBeenCalledWith(
        'tech conference',
        {
          location: {
            city: 'Seattle',
            state: 'WA',
          },
        },
        undefined
      );
    });

    it('should require search query', async () => {
      const response = await request(app)
        .get('/api/search/events/search');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request');
      expect(response.body.message).toBe('Search query (q) is required');
    });

    it('should validate limit parameter', async () => {
      const response = await request(app)
        .get('/api/search/events/search')
        .query({
          q: 'tech conference',
          limit: '150', // Too high
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid parameter');
    });

    it('should parse complex filters', async () => {
      mockedSearchService.performSemanticSearch.mockResolvedValue(mockSearchResult);

      const response = await request(app)
        .get('/api/search/events/search')
        .query({
          q: 'tech conference',
          startDate: '2024-03-01',
          endDate: '2024-03-31',
          categories: 'Technology,Business',
          minPrice: '0',
          maxPrice: '100',
          keywords: 'networking,startup',
          lat: '47.6062',
          lng: '-122.3321',
          radius: '25',
        });

      expect(response.status).toBe(200);
      expect(mockedSearchService.performSemanticSearch).toHaveBeenCalledWith(
        'tech conference',
        {
          dateRange: {
            startDate: new Date('2024-03-01'),
            endDate: new Date('2024-03-31'),
          },
          location: {
            coordinates: {
              lat: 47.6062,
              lng: -122.3321,
            },
            radius: 25,
          },
          categories: ['Technology', 'Business'],
          priceRange: {
            min: 0,
            max: 100,
          },
          keywords: ['networking', 'startup'],
        },
        undefined
      );
    });
  });

  describe('POST /api/search/index-event/:eventId', () => {
    it('should index event successfully', async () => {
      mockedSearchService.indexUserSubmittedEvent.mockResolvedValue();

      const response = await request(app)
        .post('/api/search/index-event/event-123')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Event indexed for search successfully');

      expect(mockedSearchService.indexUserSubmittedEvent).toHaveBeenCalledWith('event-123');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/search/index-event/event-123');

      expect(response.status).toBe(401);
    });

    it('should require event ID', async () => {
      const response = await request(app)
        .post('/api/search/index-event/')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(404); // Route not found
    });

    it('should handle indexing errors', async () => {
      mockedSearchService.indexUserSubmittedEvent.mockRejectedValue(
        new Error('Event not found')
      );

      const response = await request(app)
        .post('/api/search/index-event/nonexistent-event')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
});