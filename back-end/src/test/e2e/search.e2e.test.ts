import request from 'supertest';
import { app } from '../../server';
import { AuthService } from '../../services/authService';

// Mock AWS services for E2E tests
jest.mock('@aws-sdk/client-bedrock-agent-runtime');
jest.mock('@aws-sdk/client-bedrock-runtime');
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');

describe('Search E2E Tests', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    // Mock authentication for E2E tests
    const mockUser = {
      userId: 'e2e-test-user',
      email: 'e2e@test.com',
      profile: {
        firstName: 'E2E',
        lastName: 'Test',
        interests: ['Technology', 'Music'],
        timezone: 'America/New_York',
      },
      preferences: {
        eventCategories: ['Technology', 'Music'],
        maxDistance: 25,
        priceRange: { min: 0, max: 1000, currency: 'USD' },
        notificationSettings: {
          emailNotifications: true,
          pushNotifications: false,
          reminderTime: 60,
        },
      },
      savedEvents: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Mock DynamoDB responses for authentication
    const mockDynamoClient = {
      send: jest.fn()
        .mockResolvedValueOnce({ Item: mockUser }) // getUserByEmail
        .mockResolvedValue({}), // updateLastLogin
    };

    const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
    DynamoDBDocumentClient.from = jest.fn().mockReturnValue(mockDynamoClient);

    // Mock bcrypt for password comparison
    const bcrypt = require('bcryptjs');
    bcrypt.compare = jest.fn().mockResolvedValue(true);

    // Mock JWT for token generation
    const jwt = require('jsonwebtoken');
    jwt.sign = jest.fn()
      .mockReturnValueOnce('e2e-access-token')
      .mockReturnValueOnce('e2e-refresh-token');

    // Authenticate user
    const authService = new AuthService();
    const authResult = await authService.authenticateUser({
      email: 'e2e@test.com',
      password: 'TestPassword123',
    });

    authToken = authResult.token?.token || '';
    userId = authResult.user?.userId || '';
  });

  describe('Complete Search Workflow', () => {
    it('should complete a full search workflow', async () => {
      // Mock Bedrock responses
      const mockBedrockAgentClient = require('@aws-sdk/client-bedrock-agent-runtime').BedrockAgentRuntimeClient;
      const mockBedrockRuntimeClient = require('@aws-sdk/client-bedrock-runtime').BedrockRuntimeClient;

      const mockAgentInstance = {
        send: jest.fn()
          .mockResolvedValueOnce({
            // Conversational search response
            output: { text: 'I found several tech events for you.' },
            citations: [
              {
                generatedResponsePart: {
                  textResponsePart: { text: 'Tech Conference 2024' },
                },
                retrievedReferences: [
                  {
                    location: { s3Location: { uri: 'https://example.com/tech-conf' } },
                    content: { text: 'Annual tech conference with industry leaders' },
                    metadata: { score: 0.9 },
                  },
                ],
              },
            ],
            sessionId: 'e2e-session',
          })
          .mockResolvedValueOnce({
            // Document retrieval response
            retrievalResults: [
              {
                content: { text: 'Tech Conference 2024\nAnnual technology conference' },
                metadata: { eventId: 'tech-conf-2024', venue: 'Convention Center' },
                score: 0.9,
                location: { s3Location: { uri: 'https://example.com/tech-conf' } },
              },
            ],
          }),
      };

      const mockRuntimeInstance = {
        send: jest.fn().mockResolvedValue({
          body: new TextEncoder().encode(JSON.stringify({
            embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
          })),
        }),
      };

      mockBedrockAgentClient.mockImplementation(() => mockAgentInstance);
      mockBedrockRuntimeClient.mockImplementation(() => mockRuntimeInstance);

      // Step 1: Perform conversational search
      const conversationalResponse = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'Find tech conferences this month',
          sessionId: 'e2e-session',
        });

      expect(conversationalResponse.status).toBe(200);
      expect(conversationalResponse.body.success).toBe(true);
      expect(conversationalResponse.body.data.answer).toBe('I found several tech events for you.');
      expect(conversationalResponse.body.data.sources).toHaveLength(1);

      // Step 2: Perform semantic search with filters
      const semanticResponse = await request(app)
        .post('/api/search/semantic')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'technology conference',
          filters: {
            location: {
              city: 'Seattle',
              state: 'WA',
            },
            dateRange: {
              startDate: '2024-03-01T00:00:00Z',
              endDate: '2024-03-31T23:59:59Z',
            },
          },
        });

      expect(semanticResponse.status).toBe(200);
      expect(semanticResponse.body.success).toBe(true);
      expect(semanticResponse.body.data.events).toBeDefined();

      // Step 3: Get personalized feed
      const feedResponse = await request(app)
        .get(`/api/search/events/feed/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          maxResults: '10',
          includeUserSubmitted: 'true',
        });

      expect(feedResponse.status).toBe(200);
      expect(feedResponse.body.success).toBe(true);

      // Step 4: Search events with query parameters
      const searchResponse = await request(app)
        .get('/api/search/events/search')
        .query({
          q: 'tech conference',
          city: 'Seattle',
          categories: 'Technology',
          limit: '20',
        });

      expect(searchResponse.status).toBe(200);
      expect(searchResponse.body.success).toBe(true);
      expect(searchResponse.body.data.events).toBeDefined();

      // Verify all Bedrock calls were made
      expect(mockAgentInstance.send).toHaveBeenCalledTimes(4); // 2 for conversational + 2 for semantic searches
      expect(mockRuntimeInstance.send).toHaveBeenCalled(); // For embeddings
    });

    it('should handle search errors gracefully', async () => {
      // Mock Bedrock service failure
      const mockBedrockAgentClient = require('@aws-sdk/client-bedrock-agent-runtime').BedrockAgentRuntimeClient;
      const mockAgentInstance = {
        send: jest.fn().mockRejectedValue(new Error('Bedrock service unavailable')),
      };
      mockBedrockAgentClient.mockImplementation(() => mockAgentInstance);

      const response = await request(app)
        .post('/api/search')
        .send({
          query: 'Find events',
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Internal server error');
    });

    it('should validate search inputs properly', async () => {
      // Test empty query
      const emptyQueryResponse = await request(app)
        .post('/api/search')
        .send({
          query: '',
        });

      expect(emptyQueryResponse.status).toBe(400);
      expect(emptyQueryResponse.body.error).toBe('Validation failed');

      // Test invalid filters
      const invalidFiltersResponse = await request(app)
        .post('/api/search/semantic')
        .send({
          query: 'tech events',
          filters: {
            dateRange: {
              startDate: '2024-03-15',
              endDate: '2024-03-10', // End before start
            },
          },
        });

      expect(invalidFiltersResponse.status).toBe(400);
      expect(invalidFiltersResponse.body.error).toBe('Validation failed');

      // Test missing search query in GET endpoint
      const missingQueryResponse = await request(app)
        .get('/api/search/events/search');

      expect(missingQueryResponse.status).toBe(400);
      expect(missingQueryResponse.body.message).toBe('Search query (q) is required');
    });

    it('should handle authentication properly', async () => {
      // Test protected endpoint without auth
      const noAuthResponse = await request(app)
        .get(`/api/search/events/feed/${userId}`);

      expect(noAuthResponse.status).toBe(401);

      // Test accessing another user's feed
      const wrongUserResponse = await request(app)
        .get('/api/search/events/feed/other-user-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(wrongUserResponse.status).toBe(403);
      expect(wrongUserResponse.body.message).toBe('You can only access your own event feed');
    });
  });

  describe('Search Performance and Limits', () => {
    it('should respect result limits', async () => {
      // Mock Bedrock to return many results
      const mockBedrockAgentClient = require('@aws-sdk/client-bedrock-agent-runtime').BedrockAgentRuntimeClient;
      const mockAgentInstance = {
        send: jest.fn().mockResolvedValue({
          retrievalResults: Array.from({ length: 100 }, (_, i) => ({
            content: { text: `Event ${i + 1}` },
            metadata: { eventId: `event-${i + 1}` },
            score: 0.8,
            location: { s3Location: { uri: `https://example.com/event-${i + 1}` } },
          })),
        }),
      };
      mockBedrockAgentClient.mockImplementation(() => mockAgentInstance);

      const response = await request(app)
        .get('/api/search/events/search')
        .query({
          q: 'events',
          limit: '5',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.events.length).toBeLessThanOrEqual(5);
    });

    it('should validate limit boundaries', async () => {
      // Test limit too high
      const highLimitResponse = await request(app)
        .get('/api/search/events/search')
        .query({
          q: 'events',
          limit: '150',
        });

      expect(highLimitResponse.status).toBe(400);

      // Test limit too low
      const lowLimitResponse = await request(app)
        .get('/api/search/events/search')
        .query({
          q: 'events',
          limit: '0',
        });

      expect(lowLimitResponse.status).toBe(400);
    });
  });

  describe('Search Analytics and Logging', () => {
    it('should log search queries for authenticated users', async () => {
      const mockDynamoClient = {
        send: jest.fn().mockResolvedValue({}),
      };

      const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
      DynamoDBDocumentClient.from = jest.fn().mockReturnValue(mockDynamoClient);

      // Mock Bedrock response
      const mockBedrockAgentClient = require('@aws-sdk/client-bedrock-agent-runtime').BedrockAgentRuntimeClient;
      const mockAgentInstance = {
        send: jest.fn().mockResolvedValue({
          output: { text: 'Search results' },
          citations: [],
        }),
      };
      mockBedrockAgentClient.mockImplementation(() => mockAgentInstance);

      await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'Find events for analytics test',
        });

      // Verify that search query was logged to DynamoDB
      expect(mockDynamoClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'eventsync-search-history',
            Item: expect.objectContaining({
              userId: userId,
              query: 'Find events for analytics test',
              type: 'conversational',
            }),
          }),
        })
      );
    });
  });
});