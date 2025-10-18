import { SearchService, SearchFilters } from '../searchService';
import { bedrockService } from '../bedrockService';
import { eventService } from '../eventService';

// Mock dependencies
jest.mock('../bedrockService');
jest.mock('../eventService');
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');

const mockedBedrockService = bedrockService as jest.Mocked<typeof bedrockService>;
const mockedEventService = eventService as jest.Mocked<typeof eventService>;

describe('SearchService', () => {
  let searchService: SearchService;
  let mockDynamoClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock DynamoDB client
    mockDynamoClient = {
      send: jest.fn()
    };

    const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
    DynamoDBDocumentClient.from = jest.fn().mockReturnValue(mockDynamoClient);

    searchService = new SearchService();
  });

  describe('performConversationalSearch', () => {
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
      mockedBedrockService.performRAGQuery.mockResolvedValue(mockRAGResponse);
      mockDynamoClient.send.mockResolvedValue({});

      const result = await searchService.performConversationalSearch(
        'Find music concerts this weekend',
        'user-123'
      );

      expect(result).toEqual(mockRAGResponse);
      expect(mockedBedrockService.performRAGQuery).toHaveBeenCalledWith(
        'Find music concerts this weekend',
        undefined
      );
      expect(mockDynamoClient.send).toHaveBeenCalled(); // Search query logged
    });

    it('should handle search without user ID', async () => {
      mockedBedrockService.performRAGQuery.mockResolvedValue(mockRAGResponse);

      const result = await searchService.performConversationalSearch(
        'Find music concerts this weekend'
      );

      expect(result).toEqual(mockRAGResponse);
      expect(mockedBedrockService.performRAGQuery).toHaveBeenCalledWith(
        'Find music concerts this weekend',
        undefined
      );
      expect(mockDynamoClient.send).not.toHaveBeenCalled(); // No logging without user
    });

    it('should handle Bedrock service errors', async () => {
      mockedBedrockService.performRAGQuery.mockRejectedValue(
        new Error('Bedrock service unavailable')
      );

      await expect(
        searchService.performConversationalSearch('Find events')
      ).rejects.toThrow('Failed to perform conversational search');
    });
  });

  describe('performSemanticSearch', () => {
    const mockBedrockResults = {
      events: [
        {
          eventId: 'bedrock-event-1',
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
    };

    const mockUserEvents = [
      {
        eventId: 'user-event-1',
        title: 'Local Tech Meetup',
        description: 'Monthly tech meetup',
        startDateTime: new Date('2024-03-20T19:00:00Z'),
        endDateTime: new Date('2024-03-20T21:00:00Z'),
        location: {
          venue: 'Coffee Shop',
          address: '456 Oak St',
          city: 'Seattle',
          state: 'WA',
          zipCode: '98101',
          coordinates: { latitude: 47.6062, longitude: -122.3321 },
        },
        organizer: { name: 'Tech Group' },
        category: 'Technology',
        price: { amount: 0, currency: 'USD', isFree: true },
        tags: ['tech', 'networking'],
        source: { type: 'user-submitted' as const },
        createdBy: 'user-456',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    beforeEach(() => {
      mockedBedrockService.retrieveDocuments.mockResolvedValue(mockBedrockResults);
      mockedEventService.getPublicEvents.mockResolvedValue(mockUserEvents);
      mockDynamoClient.send.mockResolvedValue({});
    });

    it('should perform semantic search successfully', async () => {
      const result = await searchService.performSemanticSearch(
        'tech conference',
        undefined,
        'user-123'
      );

      expect(result.events).toHaveLength(2); // Bedrock + user events
      expect(result.query).toBe('tech conference');
      expect(result.totalResults).toBe(2);
      
      expect(mockedBedrockService.retrieveDocuments).toHaveBeenCalledWith(
        'tech conference',
        50 // default max results
      );
      expect(mockedEventService.getPublicEvents).toHaveBeenCalled();
    });

    it('should apply date range filters', async () => {
      const filters: SearchFilters = {
        dateRange: {
          startDate: new Date('2024-03-01'),
          endDate: new Date('2024-03-31'),
        },
      };

      const result = await searchService.performSemanticSearch(
        'tech conference',
        filters,
        'user-123'
      );

      expect(result.events).toHaveLength(2); // Both events are in March 2024
    });

    it('should apply location filters', async () => {
      const filters: SearchFilters = {
        location: {
          city: 'Seattle',
          state: 'WA',
        },
      };

      const result = await searchService.performSemanticSearch(
        'tech conference',
        filters,
        'user-123'
      );

      expect(result.events).toHaveLength(2); // Both events are in Seattle
    });

    it('should apply category filters', async () => {
      const filters: SearchFilters = {
        categories: ['Technology'],
      };

      const result = await searchService.performSemanticSearch(
        'tech conference',
        filters,
        'user-123'
      );

      expect(result.events).toHaveLength(1); // Only user event has Technology category
    });

    it('should handle search service errors gracefully', async () => {
      mockedBedrockService.retrieveDocuments.mockRejectedValue(
        new Error('Search service error')
      );

      await expect(
        searchService.performSemanticSearch('tech conference')
      ).rejects.toThrow('Failed to perform semantic search');
    });
  });

  describe('getPersonalizedRecommendations', () => {
    const mockUserPreferences = {
      categories: ['Technology', 'Music'],
      preferredLocations: [{ city: 'Seattle', state: 'WA' }],
    };

    const mockSearchHistory = [
      { query: 'tech conferences', timestamp: '2024-01-01T00:00:00Z' },
      { query: 'music concerts', timestamp: '2024-01-02T00:00:00Z' },
    ];

    beforeEach(() => {
      mockDynamoClient.send
        .mockResolvedValueOnce({ Item: mockUserPreferences }) // getUserPreferences
        .mockResolvedValueOnce({ Items: mockSearchHistory }); // getUserSearchHistory
      
      mockedBedrockService.retrieveDocuments.mockResolvedValue({
        events: [],
        totalResults: 0,
        query: 'Technology Music',
      });
      
      mockedEventService.getPublicEvents.mockResolvedValue([]);
    });

    it('should get personalized recommendations', async () => {
      const result = await searchService.getPersonalizedRecommendations({
        userId: 'user-123',
        maxResults: 10,
      });

      expect(result).toBeDefined();
      expect(result.query).toContain('Technology');
      expect(result.query).toContain('Music');
      
      expect(mockDynamoClient.send).toHaveBeenCalledTimes(2); // Preferences + history
    });

    it('should handle missing user preferences', async () => {
      mockDynamoClient.send
        .mockResolvedValueOnce({ Item: null }) // No preferences
        .mockResolvedValueOnce({ Items: mockSearchHistory });

      const result = await searchService.getPersonalizedRecommendations({
        userId: 'user-123',
      });

      expect(result).toBeDefined();
      // Should still work with search history only
    });

    it('should handle errors gracefully', async () => {
      mockDynamoClient.send.mockRejectedValue(new Error('Database error'));

      await expect(
        searchService.getPersonalizedRecommendations({ userId: 'user-123' })
      ).rejects.toThrow('Failed to get personalized recommendations');
    });
  });

  describe('indexUserSubmittedEvent', () => {
    const mockEvent = {
      eventId: 'event-123',
      title: 'Test Event',
      description: 'A test event',
      category: 'Technology',
      location: { venue: 'Test Venue', city: 'Seattle', state: 'WA' },
    };

    it('should index user-submitted event successfully', async () => {
      mockedEventService.getEventById.mockResolvedValue(mockEvent as any);
      mockedBedrockService.generateEmbeddings.mockResolvedValue([0.1, 0.2, 0.3]);

      await searchService.indexUserSubmittedEvent('event-123');

      expect(mockedEventService.getEventById).toHaveBeenCalledWith('event-123');
      expect(mockedBedrockService.generateEmbeddings).toHaveBeenCalledWith(
        'Test Event A test event Technology Test Venue Seattle WA'
      );
    });

    it('should handle missing event', async () => {
      mockedEventService.getEventById.mockResolvedValue(null);

      await expect(
        searchService.indexUserSubmittedEvent('nonexistent-event')
      ).rejects.toThrow('Event not found');
    });

    it('should handle embedding generation errors', async () => {
      mockedEventService.getEventById.mockResolvedValue(mockEvent as any);
      mockedBedrockService.generateEmbeddings.mockRejectedValue(
        new Error('Embedding service error')
      );

      await expect(
        searchService.indexUserSubmittedEvent('event-123')
      ).rejects.toThrow('Failed to index event for search');
    });
  });

  describe('helper methods', () => {
    describe('matchesQuery', () => {
      const event = {
        title: 'Tech Conference 2024',
        description: 'Annual technology conference with speakers',
        category: 'Technology',
      };

      it('should match relevant queries', () => {
        const searchService = new SearchService();
        const matchesQuery = (searchService as any).matchesQuery;

        expect(matchesQuery(event, 'tech conference')).toBe(true);
        expect(matchesQuery(event, 'technology')).toBe(true);
        expect(matchesQuery(event, 'annual')).toBe(true);
        expect(matchesQuery(event, 'speakers')).toBe(true);
      });

      it('should not match irrelevant queries', () => {
        const searchService = new SearchService();
        const matchesQuery = (searchService as any).matchesQuery;

        expect(matchesQuery(event, 'music concert')).toBe(false);
        expect(matchesQuery(event, 'cooking class')).toBe(false);
      });
    });

    describe('calculateRelevanceScore', () => {
      const event = {
        title: 'Tech Conference 2024',
        description: 'Annual technology conference',
      };

      it('should calculate relevance score correctly', () => {
        const searchService = new SearchService();
        const calculateRelevanceScore = (searchService as any).calculateRelevanceScore;

        const score1 = calculateRelevanceScore(event, 'tech conference');
        const score2 = calculateRelevanceScore(event, 'music festival');

        expect(score1).toBeGreaterThan(score2);
        expect(score1).toBe(1); // Both words match
        expect(score2).toBe(0); // No words match
      });
    });

    describe('calculateDateProximity', () => {
      it('should give higher scores to closer dates', () => {
        const searchService = new SearchService();
        const calculateDateProximity = (searchService as any).calculateDateProximity;

        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

        const scoreTomorrow = calculateDateProximity(tomorrow);
        const scoreNextYear = calculateDateProximity(nextYear);

        expect(scoreTomorrow).toBeGreaterThan(scoreNextYear);
        expect(scoreTomorrow).toBeCloseTo(1, 1);
        expect(scoreNextYear).toBeCloseTo(0, 1);
      });
    });
  });
});