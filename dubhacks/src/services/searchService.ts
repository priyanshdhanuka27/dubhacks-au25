import { apiClient } from './apiClient';
import {
  SearchResult,
  SearchFilters,
  RAGResponse,
  ConversationalSearchRequest,
  SemanticSearchRequest,
  PersonalizedFeedOptions,
  ApiResponse,
} from '../types';

class SearchService {
  /**
   * Perform conversational AI search using Bedrock RAG
   */
  async performConversationalSearch(request: ConversationalSearchRequest): Promise<RAGResponse> {
    try {
      const response = await apiClient.post<ApiResponse<RAGResponse>>('/search', request);
      
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Conversational search failed');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Conversational search error:', error);
      throw new Error(error.response?.data?.message || 'Failed to perform conversational search');
    }
  }

  /**
   * Perform semantic search with filtering
   */
  async performSemanticSearch(request: SemanticSearchRequest): Promise<SearchResult> {
    try {
      const response = await apiClient.post<ApiResponse<SearchResult>>('/search/semantic', request);
      
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Semantic search failed');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Semantic search error:', error);
      throw new Error(error.response?.data?.message || 'Failed to perform semantic search');
    }
  }

  /**
   * Get personalized event feed for a user
   */
  async getPersonalizedFeed(userId: string, options?: PersonalizedFeedOptions): Promise<SearchResult> {
    try {
      const queryParams = new URLSearchParams();
      
      if (options?.maxResults) {
        queryParams.append('maxResults', options.maxResults.toString());
      }
      if (options?.includeUserSubmitted !== undefined) {
        queryParams.append('includeUserSubmitted', options.includeUserSubmitted.toString());
      }
      if (options?.boostSavedEvents !== undefined) {
        queryParams.append('boostSavedEvents', options.boostSavedEvents.toString());
      }

      const url = `/search/events/feed/${userId}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiClient.get<ApiResponse<SearchResult>>(url);
      
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to get personalized feed');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Personalized feed error:', error);
      throw new Error(error.response?.data?.message || 'Failed to get personalized event feed');
    }
  }

  /**
   * Search events with filtering capabilities
   */
  async searchEvents(query: string, filters?: SearchFilters, limit?: number): Promise<SearchResult> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('q', query);
      
      if (limit) {
        queryParams.append('limit', limit.toString());
      }

      // Add filter parameters
      if (filters) {
        if (filters.dateRange) {
          if (filters.dateRange.startDate) {
            queryParams.append('startDate', filters.dateRange.startDate.toISOString());
          }
          if (filters.dateRange.endDate) {
            queryParams.append('endDate', filters.dateRange.endDate.toISOString());
          }
        }

        if (filters.location) {
          if (filters.location.city) {
            queryParams.append('city', filters.location.city);
          }
          if (filters.location.state) {
            queryParams.append('state', filters.location.state);
          }
          if (filters.location.radius) {
            queryParams.append('radius', filters.location.radius.toString());
          }
          if (filters.location.coordinates) {
            queryParams.append('lat', filters.location.coordinates.lat.toString());
            queryParams.append('lng', filters.location.coordinates.lng.toString());
          }
        }

        if (filters.categories && filters.categories.length > 0) {
          queryParams.append('categories', filters.categories.join(','));
        }

        if (filters.priceRange) {
          queryParams.append('minPrice', filters.priceRange.min.toString());
          queryParams.append('maxPrice', filters.priceRange.max.toString());
        }

        if (filters.keywords && filters.keywords.length > 0) {
          queryParams.append('keywords', filters.keywords.join(','));
        }
      }

      const response = await apiClient.get<ApiResponse<SearchResult>>(`/search/events/search?${queryParams.toString()}`);
      
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Event search failed');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Event search error:', error);
      throw new Error(error.response?.data?.message || 'Failed to search events');
    }
  }

  /**
   * Index a user-submitted event for search
   */
  async indexEvent(eventId: string): Promise<void> {
    try {
      const response = await apiClient.post<ApiResponse<null>>(`/search/index-event/${eventId}`);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to index event');
      }
    } catch (error: any) {
      console.error('Index event error:', error);
      throw new Error(error.response?.data?.message || 'Failed to index event for search');
    }
  }

  /**
   * Get popular search categories
   */
  getPopularCategories(): string[] {
    return [
      'Music',
      'Technology',
      'Business',
      'Arts & Culture',
      'Sports & Fitness',
      'Food & Drink',
      'Health & Wellness',
      'Education',
      'Community',
      'Entertainment',
      'Networking',
      'Workshops',
    ];
  }

  /**
   * Get search suggestions based on query
   */
  getSearchSuggestions(query: string): string[] {
    const suggestions = [
      'music concerts near me',
      'tech conferences this month',
      'food festivals this weekend',
      'networking events downtown',
      'art exhibitions',
      'business workshops',
      'fitness classes',
      'comedy shows',
      'book readings',
      'startup events',
    ];

    if (!query || query.length < 2) {
      return suggestions.slice(0, 5);
    }

    const filtered = suggestions.filter(suggestion =>
      suggestion.toLowerCase().includes(query.toLowerCase())
    );

    return filtered.length > 0 ? filtered : suggestions.slice(0, 3);
  }

  /**
   * Format search filters for display
   */
  formatFiltersForDisplay(filters: SearchFilters): string[] {
    const displayFilters: string[] = [];

    if (filters.dateRange) {
      if (filters.dateRange.startDate && filters.dateRange.endDate) {
        const start = filters.dateRange.startDate.toLocaleDateString();
        const end = filters.dateRange.endDate.toLocaleDateString();
        displayFilters.push(`${start} - ${end}`);
      } else if (filters.dateRange.startDate) {
        displayFilters.push(`From ${filters.dateRange.startDate.toLocaleDateString()}`);
      }
    }

    if (filters.location) {
      if (filters.location.city && filters.location.state) {
        displayFilters.push(`${filters.location.city}, ${filters.location.state}`);
      } else if (filters.location.city) {
        displayFilters.push(filters.location.city);
      } else if (filters.location.state) {
        displayFilters.push(filters.location.state);
      }

      if (filters.location.radius) {
        displayFilters.push(`Within ${filters.location.radius} miles`);
      }
    }

    if (filters.categories && filters.categories.length > 0) {
      displayFilters.push(`Categories: ${filters.categories.join(', ')}`);
    }

    if (filters.priceRange) {
      if (filters.priceRange.min === 0 && filters.priceRange.max > 0) {
        displayFilters.push(`Up to $${filters.priceRange.max}`);
      } else if (filters.priceRange.min > 0 && filters.priceRange.max > filters.priceRange.min) {
        displayFilters.push(`$${filters.priceRange.min} - $${filters.priceRange.max}`);
      } else if (filters.priceRange.min > 0) {
        displayFilters.push(`From $${filters.priceRange.min}`);
      }
    }

    if (filters.keywords && filters.keywords.length > 0) {
      displayFilters.push(`Keywords: ${filters.keywords.join(', ')}`);
    }

    return displayFilters;
  }
}

export const searchService = new SearchService();