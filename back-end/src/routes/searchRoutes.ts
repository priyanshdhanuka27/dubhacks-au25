import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { searchService, SearchFilters } from '../services/searchService';
import { authMiddleware } from '../middleware/authMiddleware';
import { ApiResponse } from '../types';

const router = Router();

// Validation schemas
const conversationalSearchSchema = Joi.object({
  query: Joi.string().required().min(1).max(500).messages({
    'string.min': 'Query cannot be empty',
    'string.max': 'Query cannot exceed 500 characters',
    'any.required': 'Query is required'
  }),
  sessionId: Joi.string().optional(),
});

const semanticSearchSchema = Joi.object({
  query: Joi.string().required().min(1).max(500).messages({
    'string.min': 'Query cannot be empty',
    'string.max': 'Query cannot exceed 500 characters',
    'any.required': 'Query is required'
  }),
  filters: Joi.object({
    dateRange: Joi.object({
      startDate: Joi.date().required(),
      endDate: Joi.date().greater(Joi.ref('startDate')).required(),
    }).optional(),
    location: Joi.object({
      city: Joi.string().optional(),
      state: Joi.string().optional(),
      radius: Joi.number().min(1).max(500).optional(),
      coordinates: Joi.object({
        lat: Joi.number().min(-90).max(90).required(),
        lng: Joi.number().min(-180).max(180).required(),
      }).optional(),
    }).optional(),
    categories: Joi.array().items(Joi.string().min(1).max(50)).max(10).optional(),
    priceRange: Joi.object({
      min: Joi.number().min(0).required(),
      max: Joi.number().min(Joi.ref('min')).required(),
    }).optional(),
    keywords: Joi.array().items(Joi.string().min(1).max(50)).max(10).optional(),
  }).optional(),
});

const eventFeedSchema = Joi.object({
  maxResults: Joi.number().min(1).max(100).optional().default(20),
  includeUserSubmitted: Joi.boolean().optional().default(true),
  boostSavedEvents: Joi.boolean().optional().default(true),
});

const searchFiltersSchema = Joi.object({
  dateRange: Joi.object({
    startDate: Joi.date().required(),
    endDate: Joi.date().greater(Joi.ref('startDate')).optional(),
  }).optional(),
  location: Joi.object({
    city: Joi.string().optional(),
    state: Joi.string().optional(),
    radius: Joi.number().min(1).max(500).optional(),
    coordinates: Joi.object({
      lat: Joi.number().min(-90).max(90).required(),
      lng: Joi.number().min(-180).max(180).required(),
    }).optional(),
  }).optional(),
  categories: Joi.array().items(Joi.string()).optional(),
  priceRange: Joi.object({
    min: Joi.number().min(0).required(),
    max: Joi.number().min(Joi.ref('min')).required(),
  }).optional(),
  keywords: Joi.array().items(Joi.string()).optional(),
});

/**
 * POST /search
 * Perform conversational AI search using Bedrock RAG
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error, value } = conversationalSearchSchema.validate(req.body);
    if (error) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Validation failed',
        message: error.details.map(detail => detail.message).join(', ')
      };
      res.status(400).json(response);
      return;
    }

    const { query, sessionId } = value;
    
    // Get user ID if authenticated (optional for search)
    const userId = req.user?.userId;

    // Perform conversational search
    const searchResults = await searchService.performConversationalSearch(
      query,
      userId,
      sessionId
    );

    const response: ApiResponse<typeof searchResults> = {
      success: true,
      data: searchResults,
      message: 'Conversational search completed successfully'
    };
    res.status(200).json(response);

  } catch (error: any) {
    console.error('Conversational search endpoint error:', error);
    
    let statusCode = 500;
    let errorType = 'Internal server error';
    
    if (error.message?.includes('service unavailable')) {
      statusCode = 503;
      errorType = 'Service unavailable';
    } else if (error.message?.includes('rate limit')) {
      statusCode = 429;
      errorType = 'Rate limit exceeded';
    } else if (error.message?.includes('invalid query')) {
      statusCode = 400;
      errorType = 'Invalid query';
    }

    const response: ApiResponse<null> = {
      success: false,
      error: errorType,
      message: error.message || 'An unexpected error occurred during conversational search'
    };
    res.status(statusCode).json(response);
  }
});

/**
 * POST /search/semantic
 * Perform semantic search with filtering and ranking
 */
router.post('/semantic', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error, value } = semanticSearchSchema.validate(req.body);
    if (error) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Validation failed',
        message: error.details.map(detail => detail.message).join(', ')
      };
      res.status(400).json(response);
      return;
    }

    const { query, filters } = value;
    
    // Get user ID if authenticated (optional for search)
    const userId = req.user?.userId;

    // Perform semantic search
    const searchResults = await searchService.performSemanticSearch(
      query,
      filters,
      userId
    );

    const response: ApiResponse<typeof searchResults> = {
      success: true,
      data: searchResults,
      message: 'Semantic search completed successfully'
    };
    res.status(200).json(response);

  } catch (error: any) {
    console.error('Semantic search endpoint error:', error);
    
    let statusCode = 500;
    let errorType = 'Internal server error';
    
    if (error.message?.includes('service unavailable')) {
      statusCode = 503;
      errorType = 'Service unavailable';
    } else if (error.message?.includes('rate limit')) {
      statusCode = 429;
      errorType = 'Rate limit exceeded';
    } else if (error.message?.includes('invalid query')) {
      statusCode = 400;
      errorType = 'Invalid query';
    }

    const response: ApiResponse<null> = {
      success: false,
      error: errorType,
      message: error.message || 'An unexpected error occurred during semantic search'
    };
    res.status(statusCode).json(response);
  }
});

/**
 * GET /events/feed/:userId
 * Get personalized event recommendations for a user
 */
router.get('/events/feed/:userId', authMiddleware.authenticate, async (req: Request, res: Response) => {
  try {
    const requestedUserId = req.params.userId;
    const authenticatedUserId = req.user?.userId;

    // Validate user ID parameter
    if (!requestedUserId) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Invalid request',
        message: 'User ID is required'
      };
      res.status(400).json(response);
      return;
    }

    // Check if user is requesting their own feed or has appropriate permissions
    if (authenticatedUserId !== requestedUserId) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Unauthorized',
        message: 'You can only access your own event feed'
      };
      res.status(403).json(response);
      return;
    }

    // Validate query parameters
    const { error, value } = eventFeedSchema.validate(req.query);
    if (error) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Invalid parameters',
        message: error.details.map(detail => detail.message).join(', ')
      };
      res.status(400).json(response);
      return;
    }

    const { maxResults, includeUserSubmitted, boostSavedEvents } = value;

    // Get personalized recommendations
    const recommendations = await searchService.getPersonalizedRecommendations({
      userId: requestedUserId,
      maxResults,
      includeUserSubmitted,
      boostSavedEvents,
    });

    const response: ApiResponse<typeof recommendations> = {
      success: true,
      data: recommendations,
      message: 'Personalized event feed retrieved successfully'
    };
    res.status(200).json(response);

  } catch (error: any) {
    console.error('Event feed endpoint error:', error);
    
    let statusCode = 500;
    if (error.message?.includes('not found')) {
      statusCode = 404;
    } else if (error.message?.includes('Unauthorized')) {
      statusCode = 403;
    }

    const response: ApiResponse<null> = {
      success: false,
      error: statusCode === 500 ? 'Internal server error' : 'Request failed',
      message: error.message || 'An unexpected error occurred while retrieving event feed'
    };
    res.status(statusCode).json(response);
  }
});

/**
 * GET /events/search
 * Search events with filtering capabilities
 */
router.get('/events/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

    // Validate required query parameter
    if (!query || query.trim().length === 0) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Invalid request',
        message: 'Search query (q) is required'
      };
      res.status(400).json(response);
      return;
    }

    // Validate limit parameter
    if (isNaN(limit) || limit < 1 || limit > 100) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Invalid parameter',
        message: 'Limit must be a number between 1 and 100'
      };
      res.status(400).json(response);
      return;
    }

    // Parse search filters from query parameters
    let filters: SearchFilters | undefined;
    
    const filterData: any = {};
    
    // Parse date range
    if (req.query.startDate || req.query.endDate) {
      filterData.dateRange = {};
      if (req.query.startDate) {
        filterData.dateRange.startDate = new Date(req.query.startDate as string);
      }
      if (req.query.endDate) {
        filterData.dateRange.endDate = new Date(req.query.endDate as string);
      }
    }
    
    // Parse location
    if (req.query.city || req.query.state || req.query.radius || req.query.lat || req.query.lng) {
      filterData.location = {};
      if (req.query.city) filterData.location.city = req.query.city;
      if (req.query.state) filterData.location.state = req.query.state;
      if (req.query.radius) filterData.location.radius = parseFloat(req.query.radius as string);
      if (req.query.lat && req.query.lng) {
        filterData.location.coordinates = {
          lat: parseFloat(req.query.lat as string),
          lng: parseFloat(req.query.lng as string),
        };
      }
    }
    
    // Parse categories
    if (req.query.categories) {
      const categoriesParam = req.query.categories as string;
      filterData.categories = categoriesParam.split(',').map(c => c.trim());
    }
    
    // Parse price range
    if (req.query.minPrice || req.query.maxPrice) {
      filterData.priceRange = {
        min: req.query.minPrice ? parseFloat(req.query.minPrice as string) : 0,
        max: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : 10000,
      };
    }
    
    // Parse keywords
    if (req.query.keywords) {
      const keywordsParam = req.query.keywords as string;
      filterData.keywords = keywordsParam.split(',').map(k => k.trim());
    }
    
    // Validate filters if any were provided
    if (Object.keys(filterData).length > 0) {
      const { error, value } = searchFiltersSchema.validate(filterData);
      if (error) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Invalid filters',
          message: error.details.map(detail => detail.message).join(', ')
        };
        res.status(400).json(response);
        return;
      }
      filters = value;
    }

    // Get user ID if authenticated (optional for search)
    const userId = req.user?.userId;

    // Perform search
    const searchResults = await searchService.performSemanticSearch(
      query.trim(),
      filters,
      userId
    );

    // Limit results
    searchResults.events = searchResults.events.slice(0, limit);

    const response: ApiResponse<typeof searchResults> = {
      success: true,
      data: searchResults,
      message: 'Event search completed successfully'
    };
    res.status(200).json(response);

  } catch (error: any) {
    console.error('Event search endpoint error:', error);
    
    let statusCode = 500;
    let errorType = 'Internal server error';
    
    if (error.message?.includes('service unavailable')) {
      statusCode = 503;
      errorType = 'Service unavailable';
    } else if (error.message?.includes('rate limit')) {
      statusCode = 429;
      errorType = 'Rate limit exceeded';
    } else if (error.message?.includes('invalid query')) {
      statusCode = 400;
      errorType = 'Invalid query';
    }

    const response: ApiResponse<null> = {
      success: false,
      error: errorType,
      message: error.message || 'An unexpected error occurred during event search'
    };
    res.status(statusCode).json(response);
  }
});

/**
 * POST /search/index-event/:eventId
 * Index a user-submitted event for search (authenticated users only)
 */
router.post('/index-event/:eventId', authMiddleware.authenticate, async (req: Request, res: Response) => {
  try {
    const eventId = req.params.eventId;
    const userId = req.user?.userId;

    if (!eventId) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Invalid request',
        message: 'Event ID is required'
      };
      res.status(400).json(response);
      return;
    }

    if (!userId) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Authentication required',
        message: 'User ID not found in request'
      };
      res.status(401).json(response);
      return;
    }

    // Index the event for search
    await searchService.indexUserSubmittedEvent(eventId);

    const response: ApiResponse<null> = {
      success: true,
      message: 'Event indexed for search successfully'
    };
    res.status(200).json(response);

  } catch (error: any) {
    console.error('Index event endpoint error:', error);
    
    let statusCode = 500;
    if (error.message?.includes('not found')) {
      statusCode = 404;
    } else if (error.message?.includes('Unauthorized')) {
      statusCode = 403;
    }

    const response: ApiResponse<null> = {
      success: false,
      error: statusCode === 500 ? 'Internal server error' : 'Request failed',
      message: error.message || 'An unexpected error occurred while indexing the event'
    };
    res.status(statusCode).json(response);
  }
});

export default router;