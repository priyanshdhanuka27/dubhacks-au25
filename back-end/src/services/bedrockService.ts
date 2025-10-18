import {
  BedrockAgentRuntimeClient,
  RetrieveAndGenerateCommand,
  RetrieveCommand,
} from '@aws-sdk/client-bedrock-agent-runtime';
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { config } from '../config';

export interface CrawlerConfig {
  seedUrls: string[];
  inclusionFilters: string[];
  exclusionFilters: string[];
  crawlDepth: number;
  maxPages: number;
}

export interface CrawlerStatus {
  status: 'RUNNING' | 'STOPPED' | 'FAILED' | 'COMPLETED';
  pagesProcessed: number;
  lastCrawlTime: Date;
  errorMessage?: string;
}

export interface RAGResponse {
  answer: string;
  sources: Array<{
    title: string;
    url: string;
    excerpt: string;
    relevanceScore: number;
  }>;
  sessionId?: string;
}

export interface SearchResult {
  events: Array<{
    eventId: string;
    title: string;
    description: string;
    startDateTime: string;
    endDateTime: string;
    location: {
      venue: string;
      address: string;
      city: string;
      state: string;
    };
    relevanceScore: number;
    source: string;
  }>;
  totalResults: number;
  query: string;
}

export class BedrockService {
  private bedrockAgentClient: BedrockAgentRuntimeClient;
  private bedrockRuntimeClient: BedrockRuntimeClient;
  private knowledgeBaseId: string;

  constructor() {
    this.bedrockAgentClient = new BedrockAgentRuntimeClient({
      region: config.aws.bedrock.region,
      credentials: {
        accessKeyId: config.aws.accessKeyId!,
        secretAccessKey: config.aws.secretAccessKey!,
      },
    });

    this.bedrockRuntimeClient = new BedrockRuntimeClient({
      region: config.aws.bedrock.region,
      credentials: {
        accessKeyId: config.aws.accessKeyId!,
        secretAccessKey: config.aws.secretAccessKey!,
      },
    });

    this.knowledgeBaseId = config.aws.bedrock.knowledgeBaseId!;
  }

  /**
   * Perform conversational AI search using Bedrock RAG
   */
  async performRAGQuery(query: string, sessionId?: string): Promise<RAGResponse> {
    try {
      const command = new RetrieveAndGenerateCommand({
        input: {
          text: query,
        },
        retrieveAndGenerateConfiguration: {
          type: 'KNOWLEDGE_BASE',
          knowledgeBaseConfiguration: {
            knowledgeBaseId: this.knowledgeBaseId,
            modelArn: `arn:aws:bedrock:${config.aws.bedrock.region}::foundation-model/${config.aws.bedrock.modelId}`,
          },
        },
        sessionId,
      });

      const response = await this.bedrockAgentClient.send(command);

      return {
        answer: response.output?.text || '',
        sources: response.citations?.map(citation => ({
          title: citation.generatedResponsePart?.textResponsePart?.text?.substring(0, 100) || 'Event',
          url: citation.retrievedReferences?.[0]?.location?.s3Location?.uri || '',
          excerpt: citation.retrievedReferences?.[0]?.content?.text?.substring(0, 200) || '',
          relevanceScore: Number(citation.retrievedReferences?.[0]?.metadata?.score) || 0,
        })) || [],
        sessionId: response.sessionId,
      };
    } catch (error) {
      console.error('Error performing RAG query:', error);
      throw new Error('Failed to perform conversational search');
    }
  }

  /**
   * Retrieve relevant documents from Knowledge Base
   */
  async retrieveDocuments(query: string, maxResults: number = 10): Promise<SearchResult> {
    try {
      const command = new RetrieveCommand({
        knowledgeBaseId: this.knowledgeBaseId,
        retrievalQuery: {
          text: query,
        },
        retrievalConfiguration: {
          vectorSearchConfiguration: {
            numberOfResults: maxResults,
          },
        },
      });

      const response = await this.bedrockAgentClient.send(command);

      const events = response.retrievalResults?.map(result => {
        const content = result.content?.text || '';
        const metadata = result.metadata || {};
        
        // Parse event data from retrieved content
        // This is a simplified parser - in production, you'd have more sophisticated parsing
        const eventData = this.parseEventFromContent(content, metadata);
        
        return {
          ...eventData,
          relevanceScore: Number(result.score) || 0,
          source: result.location?.s3Location?.uri || 'knowledge-base',
        };
      }) || [];

      return {
        events,
        totalResults: events.length,
        query,
      };
    } catch (error) {
      console.error('Error retrieving documents:', error);
      throw new Error('Failed to retrieve search results');
    }
  }

  /**
   * Generate embeddings for text using Titan Text Embeddings
   */
  async generateEmbeddings(text: string): Promise<number[]> {
    try {
      const command = new InvokeModelCommand({
        modelId: config.aws.bedrock.embeddingModelId,
        body: JSON.stringify({
          inputText: text,
        }),
        contentType: 'application/json',
        accept: 'application/json',
      });

      const response = await this.bedrockRuntimeClient.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      
      return responseBody.embedding || [];
    } catch (error) {
      console.error('Error generating embeddings:', error);
      throw new Error('Failed to generate embeddings');
    }
  }

  /**
   * Configure web crawler settings
   */
  async configureCrawler(config: CrawlerConfig): Promise<boolean> {
    try {
      // In a real implementation, this would configure the Bedrock Knowledge Base data source
      // For now, we'll simulate the configuration
      console.log('Configuring web crawler with settings:', config);
      
      // Validate crawler configuration
      if (!config.seedUrls || config.seedUrls.length === 0) {
        throw new Error('At least one seed URL is required');
      }

      if (config.crawlDepth < 1 || config.crawlDepth > 10) {
        throw new Error('Crawl depth must be between 1 and 10');
      }

      if (config.maxPages < 1 || config.maxPages > 10000) {
        throw new Error('Max pages must be between 1 and 10,000');
      }

      // Store crawler configuration (in production, this would be stored in DynamoDB)
      // For now, we'll just log the configuration
      console.log('Crawler configured successfully');
      return true;
    } catch (error) {
      console.error('Error configuring crawler:', error);
      throw new Error('Failed to configure web crawler');
    }
  }

  /**
   * Start web crawler
   */
  async startCrawler(): Promise<CrawlerStatus> {
    try {
      // In a real implementation, this would trigger the Bedrock Knowledge Base sync
      console.log('Starting web crawler...');
      
      return {
        status: 'RUNNING',
        pagesProcessed: 0,
        lastCrawlTime: new Date(),
      };
    } catch (error) {
      console.error('Error starting crawler:', error);
      return {
        status: 'FAILED',
        pagesProcessed: 0,
        lastCrawlTime: new Date(),
        errorMessage: 'Failed to start crawler',
      };
    }
  }

  /**
   * Stop web crawler
   */
  async stopCrawler(): Promise<CrawlerStatus> {
    try {
      console.log('Stopping web crawler...');
      
      return {
        status: 'STOPPED',
        pagesProcessed: 0,
        lastCrawlTime: new Date(),
      };
    } catch (error) {
      console.error('Error stopping crawler:', error);
      return {
        status: 'FAILED',
        pagesProcessed: 0,
        lastCrawlTime: new Date(),
        errorMessage: 'Failed to stop crawler',
      };
    }
  }

  /**
   * Get crawler status
   */
  async getCrawlerStatus(): Promise<CrawlerStatus> {
    try {
      // In a real implementation, this would check the actual Bedrock Knowledge Base sync status
      return {
        status: 'COMPLETED',
        pagesProcessed: 1250,
        lastCrawlTime: new Date(Date.now() - 3600000), // 1 hour ago
      };
    } catch (error) {
      console.error('Error getting crawler status:', error);
      return {
        status: 'FAILED',
        pagesProcessed: 0,
        lastCrawlTime: new Date(),
        errorMessage: 'Failed to get crawler status',
      };
    }
  }

  /**
   * Parse event data from retrieved content
   * This is a simplified implementation - in production, you'd have more sophisticated parsing
   */
  private parseEventFromContent(content: string, metadata: any): any {
    // Extract basic event information from content
    // This is a placeholder implementation
    const lines = content.split('\n');
    const title = lines.find(line => line.toLowerCase().includes('title') || line.toLowerCase().includes('event'))?.trim() || 'Event';
    const description = content.substring(0, 200);
    
    return {
      eventId: metadata.eventId || `event-${Date.now()}`,
      title: title.substring(0, 100),
      description,
      startDateTime: metadata.startDateTime || new Date().toISOString(),
      endDateTime: metadata.endDateTime || new Date(Date.now() + 3600000).toISOString(),
      location: {
        venue: metadata.venue || 'TBD',
        address: metadata.address || '',
        city: metadata.city || '',
        state: metadata.state || '',
      },
    };
  }
}

export const bedrockService = new BedrockService();