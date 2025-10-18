import Joi from 'joi';
import { Event, EventSubmission, ValidationResult, SearchFilters } from '../types';
import { eventRepository } from '../database/repositories/eventRepository';
import { userRepository } from '../database/repositories/userRepository';

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

export class EventService {
  /**
   * Create a new event with validation
   */
  async createEvent(eventData: EventSubmission, userId?: string): Promise<Event> {
    // Validate event data
    const validation = this.validateEventData(eventData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // If userId provided, verify user exists
    if (userId) {
      const user = await userRepository.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }
    }

    // Process and enhance event data
    const processedEventData = await this.processEventData(eventData);

    // Create event in database
    const event = await eventRepository.createEvent(processedEventData, userId);

    return event;
  }

  /**
   * Update an existing event with validation and permission checks
   */
  async updateEvent(eventId: string, eventData: Partial<EventSubmission>, userId: string): Promise<Event> {
    // Get existing event to check ownership
    const existingEvent = await eventRepository.getEventById(eventId);
    if (!existingEvent) {
      throw new Error('Event not found');
    }

    // Check if user has permission to update
    if (existingEvent.createdBy !== userId) {
      throw new Error('Unauthorized: You can only update events you created');
    }

    // Validate partial event data
    if (Object.keys(eventData).length > 0) {
      const validation = this.validatePartialEventData(eventData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }
    }

    // Process and enhance partial event data
    const processedEventData = await this.processPartialEventData(eventData);

    // Update event in database
    const updatedEvent = await eventRepository.updateEvent(eventId, processedEventData, userId);
    if (!updatedEvent) {
      throw new Error('Failed to update event');
    }

    return updatedEvent;
  }

  /**
   * Delete an event with permission checks
   */
  async deleteEvent(eventId: string, userId: string): Promise<void> {
    // Get existing event to check ownership
    const existingEvent = await eventRepository.getEventById(eventId);
    if (!existingEvent) {
      throw new Error('Event not found');
    }

    // Check if user has permission to delete
    if (existingEvent.createdBy !== userId) {
      throw new Error('Unauthorized: You can only delete events you created');
    }

    // Delete event from database
    await eventRepository.deleteEvent(eventId, userId);
  }

  /**
   * Get event by ID
   */
  async getEventById(eventId: string): Promise<Event | null> {
    return await eventRepository.getEventById(eventId);
  }

  /**
   * Get events created by a specific user
   */
  async getUserEvents(userId: string, limit?: number): Promise<Event[]> {
    // Verify user exists
    const user = await userRepository.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return await eventRepository.getEventsByUserId(userId, limit);
  }

  /**
   * Get public events (all events, with optional filters)
   */
  async getPublicEvents(filters?: SearchFilters, limit?: number): Promise<Event[]> {
    if (filters) {
      return await eventRepository.searchEvents(filters, limit);
    }

    // Get recent events by default
    const defaultStartDate = new Date();
    return await eventRepository.getEventsByDateRange(defaultStartDate, undefined, limit);
  }

  /**
   * Get events by category
   */
  async getEventsByCategory(category: string, startDate?: Date, limit?: number): Promise<Event[]> {
    return await eventRepository.getEventsByCategory(category, startDate, limit);
  }

  /**
   * Get events by location
   */
  async getEventsByLocation(state: string, city: string, startDate?: Date, limit?: number): Promise<Event[]> {
    return await eventRepository.getEventsByLocation(state, city, startDate, limit);
  }

  /**
   * Get events by date range
   */
  async getEventsByDateRange(startDate: Date, endDate?: Date, limit?: number): Promise<Event[]> {
    return await eventRepository.getEventsByDateRange(startDate, endDate, limit);
  }

  /**
   * Search events with filters
   */
  async searchEvents(filters: SearchFilters, limit?: number): Promise<Event[]> {
    return await eventRepository.searchEvents(filters, limit);
  }

  /**
   * Get user's saved events
   */
  async getUserSavedEvents(userId: string): Promise<Event[]> {
    const user = await userRepository.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.savedEvents.length === 0) {
      return [];
    }

    return await eventRepository.getEventsByIds(user.savedEvents);
  }

  /**
   * Validate complete event data
   */
  validateEventData(eventData: EventSubmission): ValidationResult {
    const { error } = eventSubmissionSchema.validate(eventData, { abortEarly: false });
    
    if (error) {
      return {
        isValid: false,
        errors: error.details.map(detail => detail.message),
      };
    }

    // Additional business logic validation
    const businessValidation = this.validateBusinessRules(eventData);
    if (!businessValidation.isValid) {
      return businessValidation;
    }

    return { isValid: true, errors: [] };
  }

  /**
   * Validate partial event data for updates
   */
  validatePartialEventData(eventData: Partial<EventSubmission>): ValidationResult {
    // Create a schema that allows partial updates
    const partialSchema = eventSubmissionSchema.fork(
      Object.keys(eventSubmissionSchema.describe().keys),
      (schema) => schema.optional()
    );

    const { error } = partialSchema.validate(eventData, { abortEarly: false });
    
    if (error) {
      return {
        isValid: false,
        errors: error.details.map(detail => detail.message),
      };
    }

    // Additional business logic validation for partial data
    const businessValidation = this.validatePartialBusinessRules(eventData);
    if (!businessValidation.isValid) {
      return businessValidation;
    }

    return { isValid: true, errors: [] };
  }

  /**
   * Validate business rules for complete event data
   */
  private validateBusinessRules(eventData: EventSubmission): ValidationResult {
    const errors: string[] = [];

    // Check if event duration is reasonable (not more than 7 days)
    const duration = eventData.endDateTime.getTime() - eventData.startDateTime.getTime();
    const maxDuration = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    if (duration > maxDuration) {
      errors.push('Event duration cannot exceed 7 days');
    }

    // Check if event is not too far in the future (not more than 2 years)
    const maxFutureDate = new Date();
    maxFutureDate.setFullYear(maxFutureDate.getFullYear() + 2);
    if (eventData.startDateTime > maxFutureDate) {
      errors.push('Event cannot be scheduled more than 2 years in advance');
    }

    // Validate price consistency
    if (eventData.price.isFree && eventData.price.amount > 0) {
      errors.push('Free events cannot have a price amount greater than 0');
    }

    // Validate category (you might want to maintain a list of valid categories)
    const validCategories = [
      'music', 'sports', 'technology', 'business', 'education', 'arts', 'food',
      'health', 'community', 'entertainment', 'networking', 'workshop', 'conference'
    ];
    if (!validCategories.includes(eventData.category.toLowerCase())) {
      errors.push(`Invalid category. Must be one of: ${validCategories.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate business rules for partial event data
   */
  private validatePartialBusinessRules(eventData: Partial<EventSubmission>): ValidationResult {
    const errors: string[] = [];

    // If both start and end dates are provided, validate duration
    if (eventData.startDateTime && eventData.endDateTime) {
      const duration = eventData.endDateTime.getTime() - eventData.startDateTime.getTime();
      const maxDuration = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
      if (duration > maxDuration) {
        errors.push('Event duration cannot exceed 7 days');
      }
    }

    // If start date is provided, check future limit
    if (eventData.startDateTime) {
      const maxFutureDate = new Date();
      maxFutureDate.setFullYear(maxFutureDate.getFullYear() + 2);
      if (eventData.startDateTime > maxFutureDate) {
        errors.push('Event cannot be scheduled more than 2 years in advance');
      }
    }

    // Validate price consistency if price is provided
    if (eventData.price && eventData.price.isFree && eventData.price.amount > 0) {
      errors.push('Free events cannot have a price amount greater than 0');
    }

    // Validate category if provided
    if (eventData.category) {
      const validCategories = [
        'music', 'sports', 'technology', 'business', 'education', 'arts', 'food',
        'health', 'community', 'entertainment', 'networking', 'workshop', 'conference'
      ];
      if (!validCategories.includes(eventData.category.toLowerCase())) {
        errors.push(`Invalid category. Must be one of: ${validCategories.join(', ')}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Process and enhance event data before storage
   */
  private async processEventData(eventData: EventSubmission): Promise<EventSubmission> {
    const processedData = { ...eventData };

    // Normalize category to lowercase
    processedData.category = eventData.category.toLowerCase();

    // Normalize tags to lowercase and remove duplicates
    processedData.tags = [...new Set(eventData.tags.map(tag => tag.toLowerCase().trim()))];

    // Set isFree flag based on price amount
    if (processedData.price.amount === 0) {
      processedData.price.isFree = true;
    }

    // Trim and normalize text fields
    processedData.title = eventData.title.trim();
    processedData.description = eventData.description.trim();
    processedData.organizer.name = eventData.organizer.name.trim();

    // Normalize location data
    processedData.location.venue = eventData.location.venue.trim();
    processedData.location.address = eventData.location.address.trim();
    processedData.location.city = eventData.location.city.trim();
    processedData.location.state = eventData.location.state.trim().toUpperCase();

    return processedData;
  }

  /**
   * Process and enhance partial event data before storage
   */
  private async processPartialEventData(eventData: Partial<EventSubmission>): Promise<Partial<EventSubmission>> {
    const processedData = { ...eventData };

    // Normalize category to lowercase if provided
    if (processedData.category) {
      processedData.category = eventData.category!.toLowerCase();
    }

    // Normalize tags to lowercase and remove duplicates if provided
    if (processedData.tags) {
      processedData.tags = [...new Set(eventData.tags!.map(tag => tag.toLowerCase().trim()))];
    }

    // Set isFree flag based on price amount if price is provided
    if (processedData.price && processedData.price.amount === 0) {
      processedData.price.isFree = true;
    }

    // Trim and normalize text fields if provided
    if (processedData.title) {
      processedData.title = eventData.title!.trim();
    }
    if (processedData.description) {
      processedData.description = eventData.description!.trim();
    }
    if (processedData.organizer?.name) {
      processedData.organizer.name = eventData.organizer!.name.trim();
    }

    // Normalize location data if provided
    if (processedData.location) {
      if (processedData.location.venue) {
        processedData.location.venue = eventData.location!.venue.trim();
      }
      if (processedData.location.address) {
        processedData.location.address = eventData.location!.address.trim();
      }
      if (processedData.location.city) {
        processedData.location.city = eventData.location!.city.trim();
      }
      if (processedData.location.state) {
        processedData.location.state = eventData.location!.state.trim().toUpperCase();
      }
    }

    return processedData;
  }
}

// Export singleton instance
export const eventService = new EventService();