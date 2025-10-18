import { bedrockService, SearchResult, RAGResponse } from './bedrockService';
import { eventService } from './eventService';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../config';

export interface SearchFilters {
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  location?: {
    city?: string;
    state?: string;
    radius?: number; // in miles
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  categories?: string[];
  priceRange?: {
    min: number;
    max: number;
  };
  keywords?: string[];
}

export interface PersonalizedSearchOptions {
  userId: string;
  maxResults?: number;
  includeUserSubmitted?: boolean;
  boostSavedEvents?: boolean;
}

export interface SearchRankingFactors {
  relevanceScore: number;
  dateProximity: number;
  locationProximity: number;
  userPreferenceMatch: number;
  popularityScore: number;
}

export interface EnhancedSearchResult extends SearchResult {
  rankingFactors: SearchRankingFactors;
  personalizedScore?: number;
  isUserSubmitted: boolean;
  isSaved: boolean;
}

export class SearchService {
  private dynamoClient: DynamoDBDocumentClient;
  private searchHistoryTable: string;
  private userPreferencesTable: string;

  constructor() {
    const client = new DynamoDBClient({
      region: config.aws.region,
      credentials: {
        accessKeyId: config.aws.accessKeyId!,
        secretAccessKey: config.aws.secretAccessKey!,
      },
      ...(config.aws.dynamodb.endpoint && { endpoint: config.aws.dynamodb.endpoint }),
    });
    
    this.dynamoClient = DynamoDBDocumentClient.from(client);
    this.searchHistoryTable = 'eventsync-search-history';
    this.userPreferencesTable = 'eventsync-user-preferences';
  }

  /**
   * Perform conversational AI search using Bedrock RAG
   */
  async performConversationalSearch(
    query: string,
    userId?: string,
    sessionId?: string
  ): Promise<RAGResponse> {
    try {
      // Log search query for analytics
      if (userId) {
        await this.logSearchQuery(userId, query, 'conversational');
      }

      // Perform RAG query
      const ragResponse = await bedrockService.performRAGQuery(query, sessionId);

      // Enhance response with user context if available
      if (userId) {
        const userPreferences = await this.getUserPreferences(userId);
        // Apply user preferences to filter or rank results
        // This is a placeholder for more sophisticated personalization
      }

      return ragResponse;
    } catch (error) {
      console.error('Error performing conversational search:', error);
      throw new Error('Failed to perform conversational search');
    }
  }

  /**
   * Perform semantic search with filtering and ranking
   */
  async performSemanticSearch(
    query: string,
    filters?: SearchFilters,
    userId?: string
  ): Promise<EnhancedSearchResult> {
    try {
      // Log search query
      if (userId) {
        await this.logSearchQuery(userId, query, 'semantic', filters);
      }

      // Get results from Bedrock Knowledge Base
      const bedrockResults = await bedrockService.retrieveDocuments(
        query,
        config.search.maxResults
      );

      // Get user-submitted events that match the query
      const userSubmittedEvents = await this.searchUserSubmittedEvents(query, filters);

      // Combine and rank results
      const combinedResults = await this.combineAndRankResults(
        bedrockResults,
        userSubmittedEvents,
        query,
        userId,
        filters
      );

      return combinedResults;
    } catch (error) {
      console.error('Error performing semantic search:', error);
      throw new Error('Failed to perform semantic search');
    }
  }

  /**
   * Get personalized event recommendations for a user
   */
  async getPersonalizedRecommendations(
    options: PersonalizedSearchOptions
  ): Promise<EnhancedSearchResult> {
    try {
      const { userId, maxResults = 20, includeUserSubmitted = true, boostSavedEvents = true } = options;

      // Get user preferences and search history
      const userPreferences = await this.getUserPreferences(userId);
      const searchHistory = await this.getUserSearchHistory(userId, 10);

      // Build personalized query based on user preferences
      const personalizedQuery = this.buildPersonalizedQuery(userPreferences, searchHistory);

      // Perform search with personalized query
      const searchResults = await this.performSemanticSearch(personalizedQuery, undefined, userId);

      // Apply personalization scoring
      const personalizedResults = await this.applyPersonalizationScoring(
        searchResults,
        userId,
        userPreferences,
        { boostSavedEvents, includeUserSubmitted }
      );

      // Limit results
      personalizedResults.events = personalizedResults.events.slice(0, maxResults);

      return personalizedResults;
    } catch (error) {
      console.error('Error getting personalized recommendations:', error);
      throw new Error('Failed to get personalized recommendations');
    }
  }

  /**
   * Index user-submitted event for search
   */
  async indexUserSubmittedEvent(eventId: string): Promise<void> {
    try {
      // Get event details
      const event = await eventService.getEventById(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      // Create searchable text content
      const searchableContent = this.createSearchableContent(event);

      // Generate embeddings for the event
      const embeddings = await bedrockService.generateEmbeddings(searchableContent);

      // Store embeddings and searchable content
      // In a real implementation, this would be stored in OpenSearch
      console.log(`Indexed event ${eventId} with ${embeddings.length} dimensions`);
    } catch (error) {
      console.error('Error indexing user-submitted event:', error);
      throw new Error('Failed to index event for search');
    }
  }

  /**
   * Search user-submitted events
   */
  private async searchUserSubmittedEvents(
    query: string,
    filters?: SearchFilters
  ): Promise<SearchResult> {
    try {
      // Get all user-submitted events (in production, this would use OpenSearch)
      const events = await eventService.getPublicEvents();

      // Filter events based on query and filters
      const filteredEvents = events.filter(event => {
        // Text matching
        const textMatch = this.matchesQuery(event, query);
        if (!textMatch) return false;

        // Apply filters
        if (filters) {
          if (filters.dateRange) {
            const eventDate = new Date(event.startDateTime);
            if (eventDate < filters.dateRange.startDate || eventDate > filters.dateRange.endDate) {
              return false;
            }
          }

          if (filters.location?.city && event.location.city !== filters.location.city) {
            return false;
          }

          if (filters.location?.state && event.location.state !== filters.location.state) {
            return false;
          }

          if (filters.categories && !filters.categories.includes(event.category)) {
            return false;
          }

          if (filters.priceRange && event.price) {
            const price = typeof event.price === 'number' ? event.price : event.price.amount;
            if (price < filters.priceRange.min || price > filters.priceRange.max) {
              return false;
            }
          }
        }

        return true;
      });

      // Convert to search result format
      const searchEvents = filteredEvents.map(event => ({
        eventId: event.eventId,
        title: event.title,
        description: event.description,
        startDateTime: event.startDateTime.toISOString(),
        endDateTime: event.endDateTime.toISOString(),
        location: {
          venue: event.location.venue,
          address: event.location.address,
          city: event.location.city,
          state: event.location.state,
        },
        relevanceScore: this.calculateRelevanceScore(event, query),
        source: 'user-submitted',
      }));

      return {
        events: searchEvents,
        totalResults: searchEvents.length,
        query,
      };
    } catch (error) {
      console.error('Error searching user-submitted events:', error);
      return {
        events: [],
        totalResults: 0,
        query,
      };
    }
  }

  /**
   * Combine and rank results from multiple sources
   */
  private async combineAndRankResults(
    bedrockResults: SearchResult,
    userSubmittedResults: SearchResult,
    query: string,
    userId?: string,
    filters?: SearchFilters
  ): Promise<EnhancedSearchResult> {
    try {
      // Combine events from both sources
      const allEvents = [
        ...bedrockResults.events.map(event => ({ ...event, isUserSubmitted: false })),
        ...userSubmittedResults.events.map(event => ({ ...event, isUserSubmitted: true })),
      ];

      // Calculate ranking factors for each event
      const eventsWithRanking = await Promise.all(
        allEvents.map(async (event) => {
          const rankingFactors = await this.calculateRankingFactors(event, query, userId, filters);
          const isSaved = userId ? await this.isEventSaved(userId, event.eventId) : false;

          return {
            ...event,
            rankingFactors,
            isSaved,
          };
        })
      );

      // Sort by combined ranking score
      eventsWithRanking.sort((a, b) => {
        const scoreA = this.calculateCombinedScore(a.rankingFactors);
        const scoreB = this.calculateCombinedScore(b.rankingFactors);
        return scoreB - scoreA;
      });

      return {
        events: eventsWithRanking,
        totalResults: allEvents.length,
        query,
        rankingFactors: {} as SearchRankingFactors, // This would be aggregate stats
        isUserSubmitted: false,
        isSaved: false,
      };
    } catch (error) {
      console.error('Error combining and ranking results:', error);
      throw new Error('Failed to combine and rank search results');
    }
  }

  /**
   * Calculate ranking factors for an event
   */
  private async calculateRankingFactors(
    event: any,
    query: string,
    userId?: string,
    filters?: SearchFilters
  ): Promise<SearchRankingFactors> {
    const relevanceScore = event.relevanceScore || this.calculateRelevanceScore(event, query);
    const dateProximity = this.calculateDateProximity(new Date(event.startDateTime));
    const locationProximity = filters?.location ? this.calculateLocationProximity(event.location, filters.location) : 0.5;
    const userPreferenceMatch = userId ? await this.calculateUserPreferenceMatch(event, userId) : 0.5;
    const popularityScore = 0.5; // Placeholder - would be based on actual engagement metrics

    return {
      relevanceScore,
      dateProximity,
      locationProximity,
      userPreferenceMatch,
      popularityScore,
    };
  }

  /**
   * Calculate combined ranking score
   */
  private calculateCombinedScore(factors: SearchRankingFactors): number {
    const weights = {
      relevance: 0.4,
      date: 0.2,
      location: 0.15,
      preference: 0.15,
      popularity: 0.1,
    };

    return (
      factors.relevanceScore * weights.relevance +
      factors.dateProximity * weights.date +
      factors.locationProximity * weights.location +
      factors.userPreferenceMatch * weights.preference +
      factors.popularityScore * weights.popularity
    );
  }

  /**
   * Helper methods
   */
  private matchesQuery(event: any, query: string): boolean {
    const searchText = `${event.title} ${event.description} ${event.category}`.toLowerCase();
    const queryTerms = query.toLowerCase().split(' ');
    return queryTerms.some(term => searchText.includes(term));
  }

  private calculateRelevanceScore(event: any, query: string): number {
    const searchText = `${event.title} ${event.description}`.toLowerCase();
    const queryTerms = query.toLowerCase().split(' ');
    const matches = queryTerms.filter(term => searchText.includes(term)).length;
    return matches / queryTerms.length;
  }

  private calculateDateProximity(eventDate: Date): number {
    const now = new Date();
    const daysDiff = Math.abs((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, 1 - daysDiff / 365); // Closer dates get higher scores
  }

  private calculateLocationProximity(eventLocation: any, filterLocation: any): number {
    // Simplified location proximity calculation
    if (filterLocation.city && eventLocation.city === filterLocation.city) {
      return 1.0;
    }
    if (filterLocation.state && eventLocation.state === filterLocation.state) {
      return 0.7;
    }
    return 0.3;
  }

  private async calculateUserPreferenceMatch(event: any, userId: string): Promise<number> {
    try {
      const preferences = await this.getUserPreferences(userId);
      if (!preferences) return 0.5;

      let score = 0.5;
      
      // Category preference match
      if (preferences.categories && preferences.categories.includes(event.category)) {
        score += 0.3;
      }

      // Location preference match
      if (preferences.preferredLocations) {
        const locationMatch = preferences.preferredLocations.some((loc: any) => 
          loc.city === event.location.city || loc.state === event.location.state
        );
        if (locationMatch) score += 0.2;
      }

      return Math.min(1.0, score);
    } catch (error) {
      return 0.5;
    }
  }

  private createSearchableContent(event: any): string {
    return `${event.title} ${event.description} ${event.category} ${event.location.venue} ${event.location.city} ${event.location.state}`;
  }

  private buildPersonalizedQuery(preferences: any, searchHistory: any[]): string {
    // Build a query based on user preferences and search history
    const categories = preferences?.categories?.join(' ') || '';
    const recentSearches = searchHistory.slice(0, 3).map(h => h.query).join(' ');
    return `${categories} ${recentSearches}`.trim() || 'events';
  }

  private async applyPersonalizationScoring(
    results: EnhancedSearchResult,
    userId: string,
    preferences: any,
    options: any
  ): Promise<EnhancedSearchResult> {
    // Apply personalization scoring to results
    const personalizedEvents = results.events.map(event => ({
      ...event,
      personalizedScore: (event as any).rankingFactors ? this.calculateCombinedScore((event as any).rankingFactors) : event.relevanceScore,
    }));

    return {
      ...results,
      events: personalizedEvents,
    };
  }

  // Placeholder methods for user data operations
  private async getUserPreferences(userId: string): Promise<any> {
    try {
      const result = await this.dynamoClient.send(new GetCommand({
        TableName: this.userPreferencesTable,
        Key: { userId },
      }));
      return result.Item;
    } catch (error) {
      return null;
    }
  }

  private async getUserSearchHistory(userId: string, limit: number): Promise<any[]> {
    try {
      const result = await this.dynamoClient.send(new QueryCommand({
        TableName: this.searchHistoryTable,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: { ':userId': userId },
        ScanIndexForward: false,
        Limit: limit,
      }));
      return result.Items || [];
    } catch (error) {
      return [];
    }
  }

  private async logSearchQuery(
    userId: string,
    query: string,
    type: 'conversational' | 'semantic',
    filters?: SearchFilters
  ): Promise<void> {
    try {
      await this.dynamoClient.send(new PutCommand({
        TableName: this.searchHistoryTable,
        Item: {
          userId,
          timestamp: new Date().toISOString(),
          query,
          type,
          filters,
          searchId: `search-${Date.now()}`,
        },
      }));
    } catch (error) {
      console.error('Error logging search query:', error);
    }
  }

  private async isEventSaved(userId: string, eventId: string): Promise<boolean> {
    // This would check if the user has saved this event
    // Placeholder implementation
    return false;
  }
}

export const searchService = new SearchService();