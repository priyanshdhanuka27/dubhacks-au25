import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { eventService } from '../services/eventService';
import { calendarService } from '../services/calendarService';
import { authMiddleware } from '../middleware/authMiddleware';
import { EventSubmission, ApiResponse, SearchFilters } from '../types';

const router = Router();

// Validation schemas
const locationSchema = Joi.object({
  venue: Joi.string().required().min(1).max(200),
  address: Joi.string().required().min(1).max(300),
  city: Joi.string().required().min(1).max(100),
  state: Joi.string().required().min(2).max(50),
  zipCode: Joi.string().required().pattern(/^\d{5}(-\d{4})?$/),
  coordinates: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
  }).required(),
});

const organizerSchema = Joi.object({
  name: Joi.string().required().min(1).max(200),
  email: Joi.string().email().optional(),
  website: Joi.string().uri().optional(),
  phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).optional(),
});

const priceSchema = Joi.object({
  amount: Joi.number().min(0).required(),
  currency: Joi.string().length(3).uppercase().required(),
  isFree: Joi.boolean().optional(),
});

const eventSubmissionSchema = Joi.object({
  title: Joi.string().required().min(1).max(200),
  description: Joi.string().required().min(10).max(2000),
  startDateTime: Joi.date().required().greater('now'),
  endDateTime: Joi.date().required().greater(Joi.ref('startDateTime')),
  location: locationSchema.required(),
  organizer: organizerSchema.required(),
  category: Joi.string().required().min(1).max(50),
  price: priceSchema.required(),
  tags: Joi.array().items(Joi.string().min(1).max(50)).max(10).default([]),
});

const eventUpdateSchema = eventSubmissionSchema.fork(
  Object.keys(eventSubmissionSchema.describe().keys),
  (schema) => schema.optional()
);

const searchFiltersSchema = Joi.object({
  dateRange: Joi.object({
    startDate: Joi.date().required(),
    endDate: Joi.date().greater(Joi.ref('startDate')).optional(),
  }).optional(),
  location: Joi.object({
    city: Joi.string().optional(),
    state: Joi.string().optional(),
    zipCode: Joi.string().optional(),
    coordinates: Joi.object({
      latitude: Joi.number().min(-90).max(90).required(),
      longitude: Joi.number().min(-180).max(180).required(),
    }).optional(),
    radius: Joi.number().min(1).max(500).optional(),
  }).optional(),
  categories: Joi.array().items(Joi.string()).optional(),
  priceRange: Joi.object({
    min: Joi.number().min(0).required(),
    max: Joi.number().min(Joi.ref('min')).required(),
    currency: Joi.string().length(3).uppercase().required(),
  }).optional(),
  distance: Joi.number().min(1).max(500).optional(),
});

/**
 * POST /events
 * Create a new event (authenticated users only)
 */
router.post('/', authMiddleware.authenticate, async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error, value } = eventSubmissionSchema.validate(req.body);
    if (error) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Validation failed',
        message: error.details.map(detail => detail.message).join(', ')
      };
      res.status(400).json(response);
      return;
    }

    const eventData: EventSubmission = value;
    const userId = req.user?.userId;

    if (!userId) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Authentication required',
        message: 'User ID not found in request'
      };
      res.status(401).json(response);
      return;
    }

    // Create event
    const event = await eventService.createEvent(eventData, userId);

    const response: ApiResponse<typeof event> = {
      success: true,
      data: event,
      message: 'Event created successfully'
    };
    res.status(201).json(response);

  } catch (error: any) {
    console.error('Create event endpoint error:', error);
    
    const statusCode = error.message?.includes('Validation failed') ? 400 : 500;
    const response: ApiResponse<null> = {
      success: false,
      error: statusCode === 400 ? 'Validation error' : 'Internal server error',
      message: error.message || 'An unexpected error occurred while creating the event'
    };
    res.status(statusCode).json(response);
  }
});

/**
 * GET /events/:id
 * Get a specific event by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const eventId = req.params.id;

    if (!eventId) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Invalid request',
        message: 'Event ID is required'
      };
      res.status(400).json(response);
      return;
    }

    const event = await eventService.getEventById(eventId);

    if (!event) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Event not found',
        message: 'The requested event does not exist'
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<typeof event> = {
      success: true,
      data: event,
      message: 'Event retrieved successfully'
    };
    res.status(200).json(response);

  } catch (error: any) {
    console.error('Get event endpoint error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred while retrieving the event'
    };
    res.status(500).json(response);
  }
});

/**
 * PUT /events/:id
 * Update an existing event (owner only)
 */
router.put('/:id', authMiddleware.authenticate, async (req: Request, res: Response) => {
  try {
    const eventId = req.params.id;
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

    // Validate request body
    const { error, value } = eventUpdateSchema.validate(req.body);
    if (error) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Validation failed',
        message: error.details.map(detail => detail.message).join(', ')
      };
      res.status(400).json(response);
      return;
    }

    const eventData: Partial<EventSubmission> = value;

    // Update event
    const updatedEvent = await eventService.updateEvent(eventId, eventData, userId);

    const response: ApiResponse<typeof updatedEvent> = {
      success: true,
      data: updatedEvent,
      message: 'Event updated successfully'
    };
    res.status(200).json(response);

  } catch (error: any) {
    console.error('Update event endpoint error:', error);
    
    let statusCode = 500;
    if (error.message?.includes('not found')) {
      statusCode = 404;
    } else if (error.message?.includes('Unauthorized') || error.message?.includes('permission')) {
      statusCode = 403;
    } else if (error.message?.includes('Validation failed')) {
      statusCode = 400;
    }

    const response: ApiResponse<null> = {
      success: false,
      error: statusCode === 500 ? 'Internal server error' : 'Request failed',
      message: error.message || 'An unexpected error occurred while updating the event'
    };
    res.status(statusCode).json(response);
  }
});

/**
 * DELETE /events/:id
 * Delete an event (owner only)
 */
router.delete('/:id', authMiddleware.authenticate, async (req: Request, res: Response) => {
  try {
    const eventId = req.params.id;
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

    // Delete event
    await eventService.deleteEvent(eventId, userId);

    const response: ApiResponse<null> = {
      success: true,
      message: 'Event deleted successfully'
    };
    res.status(200).json(response);

  } catch (error: any) {
    console.error('Delete event endpoint error:', error);
    
    let statusCode = 500;
    if (error.message?.includes('not found')) {
      statusCode = 404;
    } else if (error.message?.includes('Unauthorized') || error.message?.includes('permission')) {
      statusCode = 403;
    }

    const response: ApiResponse<null> = {
      success: false,
      error: statusCode === 500 ? 'Internal server error' : 'Request failed',
      message: error.message || 'An unexpected error occurred while deleting the event'
    };
    res.status(statusCode).json(response);
  }
});

/**
 * GET /events/user/:userId
 * Get events created by a specific user
 */
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

    if (!userId) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Invalid request',
        message: 'User ID is required'
      };
      res.status(400).json(response);
      return;
    }

    // Validate limit parameter
    if (limit !== undefined && (isNaN(limit) || limit < 1 || limit > 100)) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Invalid parameter',
        message: 'Limit must be a number between 1 and 100'
      };
      res.status(400).json(response);
      return;
    }

    const events = await eventService.getUserEvents(userId, limit);

    const response: ApiResponse<typeof events> = {
      success: true,
      data: events,
      message: 'User events retrieved successfully'
    };
    res.status(200).json(response);

  } catch (error: any) {
    console.error('Get user events endpoint error:', error);
    
    const statusCode = error.message?.includes('not found') ? 404 : 500;
    const response: ApiResponse<null> = {
      success: false,
      error: statusCode === 404 ? 'User not found' : 'Internal server error',
      message: error.message || 'An unexpected error occurred while retrieving user events'
    };
    res.status(statusCode).json(response);
  }
});

/**
 * GET /events/:id/calendar
 * Download .ics calendar file for a specific event
 */
router.get('/:id/calendar', async (req: Request, res: Response) => {
  try {
    const eventId = req.params.id;

    if (!eventId) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Invalid request',
        message: 'Event ID is required'
      };
      res.status(400).json(response);
      return;
    }

    // Get the event
    const event = await eventService.getEventById(eventId);

    if (!event) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Event not found',
        message: 'The requested event does not exist'
      };
      res.status(404).json(response);
      return;
    }

    // Generate .ics content
    const icsContent = calendarService.generateICSContent(event);
    
    // Validate the generated .ics content
    const validation = calendarService.validateICSFormat(icsContent);
    if (!validation.isValid) {
      console.error('Generated .ics file validation failed:', validation.errors);
      const response: ApiResponse<null> = {
        success: false,
        error: 'Calendar generation failed',
        message: 'Failed to generate valid calendar file'
      };
      res.status(500).json(response);
      return;
    }

    // Generate filename and headers
    const filename = calendarService.generateFilename(event);
    const headers = calendarService.getDownloadHeaders(filename);

    // Set headers and send file
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    res.status(200).send(icsContent);

  } catch (error: any) {
    console.error('Calendar download endpoint error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred while generating the calendar file'
    };
    res.status(500).json(response);
  }
});

/**
 * GET /events/:id/calendar/link
 * Generate calendar integration links for various calendar applications
 */
router.get('/:id/calendar/link', async (req: Request, res: Response) => {
  try {
    const eventId = req.params.id;
    const calendarType = req.query.type as string;

    if (!eventId) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Invalid request',
        message: 'Event ID is required'
      };
      res.status(400).json(response);
      return;
    }

    // Get the event
    const event = await eventService.getEventById(eventId);

    if (!event) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Event not found',
        message: 'The requested event does not exist'
      };
      res.status(404).json(response);
      return;
    }

    // Generate calendar links for different providers
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const icsDownloadUrl = `${baseUrl}/api/events/${eventId}/calendar`;
    
    const calendarLinks = {
      ics: icsDownloadUrl,
      google: generateGoogleCalendarLink(event),
      outlook: generateOutlookCalendarLink(event),
      yahoo: generateYahooCalendarLink(event),
      apple: icsDownloadUrl, // Apple Calendar uses .ics files
    };

    // If specific calendar type requested, return just that link
    if (calendarType && calendarLinks[calendarType as keyof typeof calendarLinks]) {
      const response: ApiResponse<{ link: string; type: string }> = {
        success: true,
        data: {
          link: calendarLinks[calendarType as keyof typeof calendarLinks],
          type: calendarType
        },
        message: `${calendarType} calendar link generated successfully`
      };
      res.status(200).json(response);
      return;
    }

    // Return all calendar links
    const response: ApiResponse<typeof calendarLinks> = {
      success: true,
      data: calendarLinks,
      message: 'Calendar links generated successfully'
    };
    res.status(200).json(response);

  } catch (error: any) {
    console.error('Calendar link generation endpoint error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred while generating calendar links'
    };
    res.status(500).json(response);
  }
});

/**
 * GET /events
 * Get public events with optional filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    
    // Validate limit parameter
    if (limit !== undefined && (isNaN(limit) || limit < 1 || limit > 100)) {
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
    
    if (Object.keys(req.query).length > 1 || (Object.keys(req.query).length === 1 && !req.query.limit)) {
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
      if (req.query.city || req.query.state || req.query.zipCode) {
        filterData.location = {};
        if (req.query.city) filterData.location.city = req.query.city;
        if (req.query.state) filterData.location.state = req.query.state;
        if (req.query.zipCode) filterData.location.zipCode = req.query.zipCode;
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
          currency: (req.query.currency as string) || 'USD',
        };
      }
      
      // Parse distance
      if (req.query.distance) {
        filterData.distance = parseFloat(req.query.distance as string);
      }
      
      // Validate filters
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

    const events = await eventService.getPublicEvents(filters, limit);

    const response: ApiResponse<typeof events> = {
      success: true,
      data: events,
      message: 'Events retrieved successfully'
    };
    res.status(200).json(response);

  } catch (error: any) {
    console.error('Get events endpoint error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred while retrieving events'
    };
    res.status(500).json(response);
  }
});

// Helper functions for generating calendar provider links
function generateGoogleCalendarLink(event: any): string {
  const startTime = event.startDateTime.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const endTime = event.endDateTime.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const location = `${event.location.venue}, ${event.location.address}, ${event.location.city}, ${event.location.state}`;
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${startTime}/${endTime}`,
    details: event.description,
    location: location,
    trp: 'false'
  });
  
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function generateOutlookCalendarLink(event: any): string {
  const startTime = event.startDateTime.toISOString();
  const endTime = event.endDateTime.toISOString();
  const location = `${event.location.venue}, ${event.location.address}, ${event.location.city}, ${event.location.state}`;
  
  const params = new URLSearchParams({
    subject: event.title,
    startdt: startTime,
    enddt: endTime,
    body: event.description,
    location: location,
    allday: 'false',
    uid: event.eventId
  });
  
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

function generateYahooCalendarLink(event: any): string {
  const startTime = event.startDateTime.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const endTime = event.endDateTime.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const location = `${event.location.venue}, ${event.location.address}, ${event.location.city}, ${event.location.state}`;
  
  const params = new URLSearchParams({
    v: '60',
    title: event.title,
    st: startTime,
    et: endTime,
    desc: event.description,
    in_loc: location
  });
  
  return `https://calendar.yahoo.com/?${params.toString()}`;
}

export default router;