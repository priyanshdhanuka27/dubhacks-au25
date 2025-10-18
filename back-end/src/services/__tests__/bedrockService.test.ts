import { BedrockService, CrawlerConfig } from '../bedrockService';

// Mock AWS SDK clients
jest.mock('@aws-sdk/client-bedrock-agent-runtime');
jest.mock('@aws-sdk/client-bedrock-runtime');

const mockBedrockAgentClient = {
  send: jest.fn(),
};

const mockBedrockRuntimeClient = {
  send: jest.fn(),
};

// Mock the client constructors
const { BedrockAgentRuntimeClient } = require('@aws-sdk/client-bedrock-agent-runtime');
const { BedrockRuntimeClient } = require('@aws-sdk/client-bedrock-runtime');

BedrockAgentRuntimeClient.mockImplementation(() => mockBedrockAgentClient);
BedrockRuntimeClient.mockImplementation(() => mockBedrockRuntimeClient);

describe('BedrockService', () => {
  let bedrockService: BedrockService;

  beforeEach(() => {
    jest.clearAllMocks();
    bedrockService = new BedrockService();
  });

  describe('performRAGQuery', () => {
    const mockRAGResponse = {
      output: {
        text: 'I found several music concerts this weekend.',
      },
      citations: [
        {
          generatedResponsePart: {
            textResponsePart: {
              text: 'Rock Concert Downtown - Amazing rock concert featuring local bands',
            },
          },
          retrievedReferences: [
            {
              location: {
                s3Location: {
                  uri: 'https://example.com/events/rock-concert',
                },
              },
              content: {
                text: 'Amazing rock concert featuring local bands this Saturday at 8 PM',
              },
              metadata: {
                score: 0.95,
              },
            },
          ],
        },
      ],
      sessionId: 'session-123',
    };

    it('should perform RAG query successfully', async () => {
      mockBedrockAgentClient.send.mockResolvedValue(mockRAGResponse);

      const result = await bedrockService.performRAGQuery(
        'Find music concerts this weekend',
        'session-123'
      );

      expect(result.answer).toBe('I found several music concerts this weekend.');
      expect(result.sources).toHaveLength(1);
      expect(result.sources[0].title).toBe('Rock Concert Downtown - Amazing rock concert featuring local bands');
      expect(result.sources[0].url).toBe('https://example.com/events/rock-concert');
      expect(result.sources[0].relevanceScore).toBe(0.95);
      expect(result.sessionId).toBe('session-123');

      expect(mockBedrockAgentClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: {
            input: {
              text: 'Find music concerts this weekend',
            },
            retrieveAndGenerateConfiguration: {
              type: 'KNOWLEDGE_BASE',
              knowledgeBaseConfiguration: {
                knowledgeBaseId: expect.any(String),
                modelArn: expect.stringContaining('anthropic.claude'),
              },
            },
            sessionId: 'session-123',
          },
        })
      );
    });

    it('should handle empty response', async () => {
      mockBedrockAgentClient.send.mockResolvedValue({
        output: { text: '' },
        citations: [],
      });

      const result = await bedrockService.performRAGQuery('test query');

      expect(result.answer).toBe('');
      expect(result.sources).toHaveLength(0);
    });

    it('should handle Bedrock service errors', async () => {
      mockBedrockAgentClient.send.mockRejectedValue(
        new Error('Bedrock service unavailable')
      );

      await expect(
        bedrockService.performRAGQuery('test query')
      ).rejects.toThrow('Failed to perform conversational search');
    });
  });

  describe('retrieveDocuments', () => {
    const mockRetrievalResponse = {
      retrievalResults: [
        {
          content: {
            text: 'Tech Conference 2024\nAnnual technology conference with industry leaders\nMarch 15, 2024 at Convention Center',
          },
          metadata: {
            eventId: 'event-123',
            venue: 'Convention Center',
            city: 'Seattle',
            state: 'WA',
          },
          score: 0.9,
          location: {
            s3Location: {
              uri: 'https://example.com/events/tech-conference',
            },
          },
        },
      ],
    };

    it('should retrieve documents successfully', async () => {
      mockBedrockAgentClient.send.mockResolvedValue(mockRetrievalResponse);

      const result = await bedrockService.retrieveDocuments('tech conference', 10);

      expect(result.events).toHaveLength(1);
      expect(result.events[0].title).toContain('Tech Conference');
      expect(result.events[0].relevanceScore).toBe(0.9);
      expect(result.events[0].source).toBe('https://example.com/events/tech-conference');
      expect(result.totalResults).toBe(1);
      expect(result.query).toBe('tech conference');

      expect(mockBedrockAgentClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: {
            knowledgeBaseId: expect.any(String),
            retrievalQuery: {
              text: 'tech conference',
            },
            retrievalConfiguration: {
              vectorSearchConfiguration: {
                numberOfResults: 10,
              },
            },
          },
        })
      );
    });

    it('should handle empty retrieval results', async () => {
      mockBedrockAgentClient.send.mockResolvedValue({
        retrievalResults: [],
      });

      const result = await bedrockService.retrieveDocuments('nonexistent query');

      expect(result.events).toHaveLength(0);
      expect(result.totalResults).toBe(0);
    });

    it('should handle retrieval errors', async () => {
      mockBedrockAgentClient.send.mockRejectedValue(
        new Error('Knowledge base unavailable')
      );

      await expect(
        bedrockService.retrieveDocuments('test query')
      ).rejects.toThrow('Failed to retrieve search results');
    });
  });

  describe('generateEmbeddings', () => {
    const mockEmbeddingResponse = {
      body: new TextEncoder().encode(JSON.stringify({
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
      })),
    };

    it('should generate embeddings successfully', async () => {
      mockBedrockRuntimeClient.send.mockResolvedValue(mockEmbeddingResponse);

      const result = await bedrockService.generateEmbeddings('test text');

      expect(result).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);

      expect(mockBedrockRuntimeClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: {
            modelId: expect.stringContaining('titan-embed'),
            body: JSON.stringify({
              inputText: 'test text',
            }),
            contentType: 'application/json',
            accept: 'application/json',
          },
        })
      );
    });

    it('should handle embedding generation errors', async () => {
      mockBedrockRuntimeClient.send.mockRejectedValue(
        new Error('Embedding model unavailable')
      );

      await expect(
        bedrockService.generateEmbeddings('test text')
      ).rejects.toThrow('Failed to generate embeddings');
    });

    it('should handle malformed response', async () => {
      const malformedResponse = {
        body: new TextEncoder().encode('invalid json'),
      };
      mockBedrockRuntimeClient.send.mockResolvedValue(malformedResponse);

      await expect(
        bedrockService.generateEmbeddings('test text')
      ).rejects.toThrow('Failed to generate embeddings');
    });
  });

  describe('configureCrawler', () => {
    const validConfig: CrawlerConfig = {
      seedUrls: ['https://example.com/events'],
      inclusionFilters: ['**/events/**'],
      exclusionFilters: ['**/admin/**'],
      crawlDepth: 3,
      maxPages: 1000,
    };

    it('should configure crawler successfully', async () => {
      const result = await bedrockService.configureCrawler(validConfig);

      expect(result).toBe(true);
    });

    it('should validate crawler configuration', async () => {
      const invalidConfig: CrawlerConfig = {
        seedUrls: [],
        inclusionFilters: [],
        exclusionFilters: [],
        crawlDepth: 0,
        maxPages: 0,
      };

      await expect(
        bedrockService.configureCrawler(invalidConfig)
      ).rejects.toThrow('At least one seed URL is required');
    });

    it('should validate crawl depth', async () => {
      const invalidConfig: CrawlerConfig = {
        ...validConfig,
        crawlDepth: 15,
      };

      await expect(
        bedrockService.configureCrawler(invalidConfig)
      ).rejects.toThrow('Crawl depth must be between 1 and 10');
    });

    it('should validate max pages', async () => {
      const invalidConfig: CrawlerConfig = {
        ...validConfig,
        maxPages: 50000,
      };

      await expect(
        bedrockService.configureCrawler(invalidConfig)
      ).rejects.toThrow('Max pages must be between 1 and 10,000');
    });
  });

  describe('crawler management', () => {
    it('should start crawler successfully', async () => {
      const result = await bedrockService.startCrawler();

      expect(result.status).toBe('RUNNING');
      expect(result.pagesProcessed).toBe(0);
      expect(result.lastCrawlTime).toBeInstanceOf(Date);
    });

    it('should stop crawler successfully', async () => {
      const result = await bedrockService.stopCrawler();

      expect(result.status).toBe('STOPPED');
      expect(result.pagesProcessed).toBe(0);
      expect(result.lastCrawlTime).toBeInstanceOf(Date);
    });

    it('should get crawler status successfully', async () => {
      const result = await bedrockService.getCrawlerStatus();

      expect(result.status).toBe('COMPLETED');
      expect(result.pagesProcessed).toBe(1250);
      expect(result.lastCrawlTime).toBeInstanceOf(Date);
    });
  });

  describe('parseEventFromContent', () => {
    it('should parse event content correctly', () => {
      const content = 'Title: Tech Conference 2024\nAmazing technology conference with industry leaders';
      const metadata = {
        eventId: 'event-123',
        venue: 'Convention Center',
        city: 'Seattle',
        state: 'WA',
        startDateTime: '2024-03-15T10:00:00Z',
      };

      const parseEventFromContent = (bedrockService as any).parseEventFromContent;
      const result = parseEventFromContent(content, metadata);

      expect(result.eventId).toBe('event-123');
      expect(result.title).toContain('Tech Conference');
      expect(result.description).toBe(content.substring(0, 200));
      expect(result.location.venue).toBe('Convention Center');
      expect(result.location.city).toBe('Seattle');
      expect(result.location.state).toBe('WA');
      expect(result.startDateTime).toBe('2024-03-15T10:00:00Z');
    });

    it('should handle missing metadata gracefully', () => {
      const content = 'Some event content';
      const metadata = {};

      const parseEventFromContent = (bedrockService as any).parseEventFromContent;
      const result = parseEventFromContent(content, metadata);

      expect(result.eventId).toMatch(/^event-\d+$/);
      expect(result.title).toBe('Event');
      expect(result.location.venue).toBe('TBD');
      expect(result.startDateTime).toBeDefined();
      expect(result.endDateTime).toBeDefined();
    });
  });
});