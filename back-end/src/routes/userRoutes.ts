import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { userProfileService } from '../services/userProfileService';
import { authMiddleware } from '../middleware/authMiddleware';
import { UserProfile, UserPreferences, ApiResponse } from '../types';

const router = Router();

// Validation schemas
const profileUpdateSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).optional().messages({
    'string.min': 'First name must be at least 2 characters long',
    'string.max': 'First name cannot exceed 50 characters'
  }),
  lastName: Joi.string().min(2).max(50).optional().messages({
    'string.min': 'Last name must be at least 2 characters long',
    'string.max': 'Last name cannot exceed 50 characters'
  }),
  timezone: Joi.string().optional(),
  interests: Joi.array().items(Joi.string()).optional(),
  location: Joi.object({
    venue: Joi.string().required(),
    address: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    zipCode: Joi.string().required(),
    coordinates: Joi.object({
      latitude: Joi.number().min(-90).max(90).required(),
      longitude: Joi.number().min(-180).max(180).required()
    }).required()
  }).optional()
});

const preferencesUpdateSchema = Joi.object({
  eventCategories: Joi.array().items(Joi.string()).optional(),
  maxDistance: Joi.number().min(1).max(500).optional().messages({
    'number.min': 'Maximum distance must be at least 1 mile',
    'number.max': 'Maximum distance cannot exceed 500 miles'
  }),
  priceRange: Joi.object({
    min: Joi.number().min(0).required(),
    max: Joi.number().min(0).required(),
    currency: Joi.string().length(3).required()
  }).optional(),
  notificationSettings: Joi.object({
    emailNotifications: Joi.boolean().required(),
    pushNotifications: Joi.boolean().required(),
    reminderTime: Joi.number().min(0).max(10080).required().messages({
      'number.min': 'Reminder time must be at least 0 minutes',
      'number.max': 'Reminder time cannot exceed 1 week (10080 minutes)'
    })
  }).optional()
});

/**
 * Middleware to check if user can access the requested user profile
 */
const checkUserAccess = (req: Request, res: Response, next: Function) => {
  const requestedUserId = req.params.id;
  const currentUserId = req.user?.userId;

  if (!currentUserId) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Authentication required',
      message: 'You must be logged in to access this resource'
    };
    res.status(401).json(response);
    return;
  }

  if (requestedUserId !== currentUserId) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Access denied',
      message: 'You can only access your own profile'
    };
    res.status(403).json(response);
    return;
  }

  next();
};

/**
 * GET /users/:id/profile
 * Get user profile information
 */
router.get('/:id/profile', authMiddleware.authenticate, checkUserAccess, async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;

    const profile = await userProfileService.getUserProfile(userId);

    if (!profile) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Profile not found',
        message: 'User profile could not be found'
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<UserProfile> = {
      success: true,
      data: profile,
      message: 'Profile retrieved successfully'
    };
    res.status(200).json(response);

  } catch (error) {
    console.error('Get profile endpoint error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred while retrieving profile'
    };
    res.status(500).json(response);
  }
});

/**
 * PUT /users/:id/profile
 * Update user profile information
 */
router.put('/:id/profile', authMiddleware.authenticate, checkUserAccess, async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;

    // Validate request body
    const { error, value } = profileUpdateSchema.validate(req.body);
    if (error) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Validation failed',
        message: error.details.map(detail => detail.message).join(', ')
      };
      res.status(400).json(response);
      return;
    }

    const profileData: Partial<UserProfile> = value;

    const updatedProfile = await userProfileService.updateUserProfile(userId, profileData);

    if (!updatedProfile) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Update failed',
        message: 'Profile could not be updated'
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<UserProfile> = {
      success: true,
      data: updatedProfile,
      message: 'Profile updated successfully'
    };
    res.status(200).json(response);

  } catch (error) {
    console.error('Update profile endpoint error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred while updating profile'
    };
    res.status(500).json(response);
  }
});

/**
 * GET /users/:id/preferences
 * Get user preferences
 */
router.get('/:id/preferences', authMiddleware.authenticate, checkUserAccess, async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;

    const preferences = await userProfileService.getUserPreferences(userId);

    if (!preferences) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Preferences not found',
        message: 'User preferences could not be found'
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<UserPreferences> = {
      success: true,
      data: preferences,
      message: 'Preferences retrieved successfully'
    };
    res.status(200).json(response);

  } catch (error) {
    console.error('Get preferences endpoint error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred while retrieving preferences'
    };
    res.status(500).json(response);
  }
});

/**
 * PUT /users/:id/preferences
 * Update user preferences
 */
router.put('/:id/preferences', authMiddleware.authenticate, checkUserAccess, async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;

    // Validate request body
    const { error, value } = preferencesUpdateSchema.validate(req.body);
    if (error) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Validation failed',
        message: error.details.map(detail => detail.message).join(', ')
      };
      res.status(400).json(response);
      return;
    }

    const preferencesData: Partial<UserPreferences> = value;

    const updatedPreferences = await userProfileService.updateUserPreferences(userId, preferencesData);

    if (!updatedPreferences) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Update failed',
        message: 'Preferences could not be updated'
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<UserPreferences> = {
      success: true,
      data: updatedPreferences,
      message: 'Preferences updated successfully'
    };
    res.status(200).json(response);

  } catch (error) {
    console.error('Update preferences endpoint error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred while updating preferences'
    };
    res.status(500).json(response);
  }
});

/**
 * POST /users/:id/saved-events/:eventId
 * Save an event for the user
 */
router.post('/:id/saved-events/:eventId', authMiddleware.authenticate, checkUserAccess, async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const eventId = req.params.eventId;

    if (!eventId) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Invalid event ID',
        message: 'Event ID is required'
      };
      res.status(400).json(response);
      return;
    }

    const success = await userProfileService.saveEvent(userId, eventId);

    if (!success) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Save failed',
        message: 'Event could not be saved'
      };
      res.status(400).json(response);
      return;
    }

    const response: ApiResponse<{ eventId: string }> = {
      success: true,
      data: { eventId },
      message: 'Event saved successfully'
    };
    res.status(200).json(response);

  } catch (error) {
    console.error('Save event endpoint error:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Event not found') {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Event not found',
          message: 'The specified event does not exist'
        };
        res.status(404).json(response);
        return;
      }
      
      if (error.message === 'User not found') {
        const response: ApiResponse<null> = {
          success: false,
          error: 'User not found',
          message: 'User account could not be found'
        };
        res.status(404).json(response);
        return;
      }
    }

    const response: ApiResponse<null> = {
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred while saving event'
    };
    res.status(500).json(response);
  }
});

/**
 * DELETE /users/:id/saved-events/:eventId
 * Remove a saved event for the user
 */
router.delete('/:id/saved-events/:eventId', authMiddleware.authenticate, checkUserAccess, async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const eventId = req.params.eventId;

    if (!eventId) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Invalid event ID',
        message: 'Event ID is required'
      };
      res.status(400).json(response);
      return;
    }

    const success = await userProfileService.unsaveEvent(userId, eventId);

    if (!success) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Remove failed',
        message: 'Event could not be removed from saved events'
      };
      res.status(400).json(response);
      return;
    }

    const response: ApiResponse<{ eventId: string }> = {
      success: true,
      data: { eventId },
      message: 'Event removed from saved events successfully'
    };
    res.status(200).json(response);

  } catch (error) {
    console.error('Remove saved event endpoint error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred while removing saved event'
    };
    res.status(500).json(response);
  }
});

/**
 * GET /users/:id/saved-events
 * Get all saved events for the user
 */
router.get('/:id/saved-events', authMiddleware.authenticate, checkUserAccess, async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;

    const savedEvents = await userProfileService.getSavedEvents(userId);

    const response: ApiResponse<typeof savedEvents> = {
      success: true,
      data: savedEvents,
      message: 'Saved events retrieved successfully'
    };
    res.status(200).json(response);

  } catch (error) {
    console.error('Get saved events endpoint error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred while retrieving saved events'
    };
    res.status(500).json(response);
  }
});

/**
 * GET /users/:id/recommendations
 * Get personalized event recommendations for the user
 */
router.get('/:id/recommendations', authMiddleware.authenticate, checkUserAccess, async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const limit = parseInt(req.query.limit as string) || 20;

    if (limit < 1 || limit > 100) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Invalid limit',
        message: 'Limit must be between 1 and 100'
      };
      res.status(400).json(response);
      return;
    }

    const recommendations = await userProfileService.getPersonalizedRecommendations(userId, limit);

    const response: ApiResponse<typeof recommendations> = {
      success: true,
      data: recommendations,
      message: 'Recommendations retrieved successfully'
    };
    res.status(200).json(response);

  } catch (error) {
    console.error('Get recommendations endpoint error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred while retrieving recommendations'
    };
    res.status(500).json(response);
  }
});

/**
 * GET /users/:id/complete-profile
 * Get complete user profile including statistics
 */
router.get('/:id/complete-profile', authMiddleware.authenticate, checkUserAccess, async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;

    const completeProfile = await userProfileService.getCompleteUserProfile(userId);

    if (!completeProfile) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Profile not found',
        message: 'User profile could not be found'
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<typeof completeProfile> = {
      success: true,
      data: completeProfile,
      message: 'Complete profile retrieved successfully'
    };
    res.status(200).json(response);

  } catch (error) {
    console.error('Get complete profile endpoint error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred while retrieving complete profile'
    };
    res.status(500).json(response);
  }
});

/**
 * POST /users/:id/update-interests
 * Update user interests based on activity (saved events)
 */
router.post('/:id/update-interests', authMiddleware.authenticate, checkUserAccess, async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;

    await userProfileService.updateUserInterestsFromActivity(userId);

    const response: ApiResponse<null> = {
      success: true,
      message: 'User interests updated based on activity'
    };
    res.status(200).json(response);

  } catch (error) {
    console.error('Update interests endpoint error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred while updating interests'
    };
    res.status(500).json(response);
  }
});

export default router;