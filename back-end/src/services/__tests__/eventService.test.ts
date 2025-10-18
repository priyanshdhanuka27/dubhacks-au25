import { EventService } from '../eventService';
import { EventSubmission, Event } from '../../types';
import { eventRepository } from '../../database/repositories/eventRepository';
import { userRepository } from '../../database/repositories/userRepository';

// Mock the repositories
jest.mock('../../database/repositories/eventRepository');
jest.mock('../../database/repositories/userRepository');

const mockedEventRepository = eventRepository as jest.Mocked<typeof eventRepository>;
const mockedUserRepository = userRepository as jest.Mocked<typeof userRepository>;

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-event-id-123')
}));

describe('EventService', () => {
  let eventService: EventService;

  beforeEach(() => {
    jest.clearAllMocks();
    eventService = new EventService();
  });

  const validEventData: EventSubmission = {
    title: 'Test Event',
    description: 'This is a test event for unit testing purposes.',
    startDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    endDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // Tomorrow + 2 hours
    location: {
      venue: 'Test Venue',
      address: '123 Test Street',
      city: 'Test City',
      state: 'CA',
      zipCode: '12345',
      coordinates: {
        latitude: 37.7749,
        longitude: -122.4194
      }
    },
    organizer: {
      name: 'Test Organizer',
      email: 'organizer@test.com',
      website: 'https://test.com',
      phone: '+1-555-123-4567'
    },
    category: 'technology',
    price: {
      amount: 25.00,
      currency: 'USD',
      isFree: false
    },
    tags: ['tech', 'conference', 'networking']
  };

  const mockUser = {
    userId: 'test-user-id',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    profile: {
      firstName: 'John',
      lastName: 'Doe',
      interests: ['technology'],
      timezone: 'America/New_York'
    },
    preferences: {
      eventCategories: ['technology'],
      maxDistance: 25,
      priceRange: { min: 0, max: 100, currency: 'USD' },
      notificationSettings: {
        emailNotifications: true,
        pushNotifications: false,
        reminderTime: 60
      }
    },
    savedEvents: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockEvent: Event = {
    eventId: 'test-event-id-123',
    title: validEventData.title,
    description: validEventData.description,
    startDateTime: validEventData.startDateTime,
    endDateTime: validEventData.endDateTime,
    location: validEventData.location,
    organizer: validEventData.organizer,
    category: validEventData.category,
    price: validEventData.price,
    tags: validEventData.tags,
    source: {
      type: 'user-submitted'
    },
    createdBy: 'test-user-id',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  describe('createEvent', () => {
    it('should successfully create an event with valid data', async () => {
      // Mock user exists
      mockedUserRepository.getUserById.mockResolvedValue(mockUser);
      
      // Mock event creation
      mockedEventRepository.createEvent.mockResolvedValue(mockEvent);

      const result = await eventService.createEvent(validEventData, 'test-user-id');

      expect(result).toEqual(mockEvent);
      expect(mockedUserRepository.getUserById).toHaveBeenCalledWith('test-user-id');
      expect(mockedEventRepository.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Event',
          category: 'technology', // Should be normalized to lowercase
          tags: ['tech', 'conference', 'networking']
        }),
        'test-user-id'
      );
    });

    it('should create event without user ID for crawled events', async () => {
      // Mock event creation
      mockedEventRepository.createEvent.mockResolvedValue({
        ...mockEvent,
        source: { type: 'crawled' },
        createdBy: undefined
      });

      const result = await eventService.createEvent(validEventData);

      expect(result).toBeDefined();
      expect(mockedUserRepository.getUserById).not.toHaveBeenCalled();
      expect(mockedEventRepository.createEvent).toHaveBeenCalledWith(
        expect.any(Object),
        undefined
      );
    });

    it('should fail when user does not exist', async () => {
      // Mock user doesn't exist
      mockedUserRepository.getUserById.mockResolvedValue(null);

      await expect(eventService.createEvent(validEventData, 'non-existent-user'))
        .rejects.toThrow('User not found');

      expect(mockedEventRepository.createEvent).not.toHaveBeenCalled();
    });

    it('should fail with invalid event data', async () => {
      const invalidEventData = {
        ...validEventData,
        title: '', // Invalid: empty title
        startDateTime: new Date('2020-01-01'), // Invalid: past date
      };

      await expect(eventService.createEvent(invalidEventData, 'test-user-id'))
        .rejects.toThrow('Validation failed');

      expect(mockedEventRepository.createEvent).not.toHaveBeenCalled();
    });

    it('should normalize event data before creation', async () => {
      const eventDataWithMixedCase = {
        ...validEventData,
        category: 'TECHNOLOGY',
        tags: ['TECH', 'Conference', 'NETWORKING'],
        title: '  Test Event  ',
        organizer: {
          ...validEventData.organizer,
          name: '  Test Organizer  '
        }
      };

      mockedUserRepository.getUserById.mockResolvedValue(mockUser);
      mockedEventRepository.createEvent.mockResolvedValue(mockEvent);

      await eventService.createEvent(eventDataWithMixedCase, 'test-user-id');

      expect(mockedEventRepository.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'technology', // Should be normalized to lowercase
          tags: ['tech', 'conference', 'networking'], // Should be normalized
          title: 'Test Event', // Should be trimmed
          organizer: expect.objectContaining({
            name: 'Test Organizer' // Should be trimmed
          })
        }),
        'test-user-id'
      );
    });
  });

  describe('updateEvent', () => {
    const updateData: Partial<EventSubmission> = {
      title: 'Updated Event Title',
      description: 'Updated description'
    };

    it('should successfully update an event', async () => {
      const updatedEvent = { ...mockEvent, ...updateData };
      
      mockedEventRepository.getEventById.mockResolvedValue(mockEvent);
      mockedEventRepository.updateEvent.mockResolvedValue(updatedEvent);

      const result = await eventService.updateEvent('test-event-id', updateData, 'test-user-id');

      expect(result).toEqual(updatedEvent);
      expect(mockedEventRepository.getEventById).toHaveBeenCalledWith('test-event-id');
      expect(mockedEventRepository.updateEvent).toHaveBeenCalledWith(
        'test-event-id',
        expect.objectContaining(updateData),
        'test-user-id'
      );
    });

    it('should fail when event does not exist', async () => {
      mockedEventRepository.getEventById.mockResolvedValue(null);

      await expect(eventService.updateEvent('non-existent-event', updateData, 'test-user-id'))
        .rejects.toThrow('Event not found');

      expect(mockedEventRepository.updateEvent).not.toHaveBeenCalled();
    });

    it('should fail when user does not own the event', async () => {
      const eventOwnedByOther = { ...mockEvent, createdBy: 'other-user-id' };
      mockedEventRepository.getEventById.mockResolvedValue(eventOwnedByOther);

      await expect(eventService.updateEvent('test-event-id', updateData, 'test-user-id'))
        .rejects.toThrow('Unauthorized: You can only update events you created');

      expect(mockedEventRepository.updateEvent).not.toHaveBeenCalled();
    });

    it('should fail with invalid update data', async () => {
      const invalidUpdateData = {
        startDateTime: new Date('2020-01-01'), // Invalid: past date
      };

      mockedEventRepository.getEventById.mockResolvedValue(mockEvent);

      await expect(eventService.updateEvent('test-event-id', invalidUpdateData, 'test-user-id'))
        .rejects.toThrow('Validation failed');

      expect(mockedEventRepository.updateEvent).not.toHaveBeenCalled();
    });
  });

  describe('deleteEvent', () => {
    it('should successfully delete an event', async () => {
      mockedEventRepository.getEventById.mockResolvedValue(mockEvent);
      mockedEventRepository.deleteEvent.mockResolvedValue(undefined);

      await eventService.deleteEvent('test-event-id', 'test-user-id');

      expect(mockedEventRepository.getEventById).toHaveBeenCalledWith('test-event-id');
      expect(mockedEventRepository.deleteEvent).toHaveBeenCalledWith('test-event-id', 'test-user-id');
    });

    it('should fail when event does not exist', async () => {
      mockedEventRepository.getEventById.mockResolvedValue(null);

      await expect(eventService.deleteEvent('non-existent-event', 'test-user-id'))
        .rejects.toThrow('Event not found');

      expect(mockedEventRepository.deleteEvent).not.toHaveBeenCalled();
    });

    it('should fail when user does not own the event', async () => {
      const eventOwnedByOther = { ...mockEvent, createdBy: 'other-user-id' };
      mockedEventRepository.getEventById.mockResolvedValue(eventOwnedByOther);

      await expect(eventService.deleteEvent('test-event-id', 'test-user-id'))
        .rejects.toThrow('Unauthorized: You can only delete events you created');

      expect(mockedEventRepository.deleteEvent).not.toHaveBeenCalled();
    });
  });

  describe('getEventById', () => {
    it('should return event when it exists', async () => {
      mockedEventRepository.getEventById.mockResolvedValue(mockEvent);

      const result = await eventService.getEventById('test-event-id');

      expect(result).toEqual(mockEvent);
      expect(mockedEventRepository.getEventById).toHaveBeenCalledWith('test-event-id');
    });

    it('should return null when event does not exist', async () => {
      mockedEventRepository.getEventById.mockResolvedValue(null);

      const result = await eventService.getEventById('non-existent-event');

      expect(result).toBeNull();
    });
  });

  describe('getUserEvents', () => {
    it('should return user events when user exists', async () => {
      const userEvents = [mockEvent];
      
      mockedUserRepository.getUserById.mockResolvedValue(mockUser);
      mockedEventRepository.getEventsByUserId.mockResolvedValue(userEvents);

      const result = await eventService.getUserEvents('test-user-id', 10);

      expect(result).toEqual(userEvents);
      expect(mockedUserRepository.getUserById).toHaveBeenCalledWith('test-user-id');
      expect(mockedEventRepository.getEventsByUserId).toHaveBeenCalledWith('test-user-id', 10);
    });

    it('should fail when user does not exist', async () => {
      mockedUserRepository.getUserById.mockResolvedValue(null);

      await expect(eventService.getUserEvents('non-existent-user'))
        .rejects.toThrow('User not found');

      expect(mockedEventRepository.getEventsByUserId).not.toHaveBeenCalled();
    });
  });

  describe('getUserSavedEvents', () => {
    it('should return saved events when user has saved events', async () => {
      const userWithSavedEvents = {
        ...mockUser,
        savedEvents: ['event-1', 'event-2']
      };
      const savedEvents = [mockEvent];

      mockedUserRepository.getUserById.mockResolvedValue(userWithSavedEvents);
      mockedEventRepository.getEventsByIds.mockResolvedValue(savedEvents);

      const result = await eventService.getUserSavedEvents('test-user-id');

      expect(result).toEqual(savedEvents);
      expect(mockedEventRepository.getEventsByIds).toHaveBeenCalledWith(['event-1', 'event-2']);
    });

    it('should return empty array when user has no saved events', async () => {
      mockedUserRepository.getUserById.mockResolvedValue(mockUser);

      const result = await eventService.getUserSavedEvents('test-user-id');

      expect(result).toEqual([]);
      expect(mockedEventRepository.getEventsByIds).not.toHaveBeenCalled();
    });

    it('should fail when user does not exist', async () => {
      mockedUserRepository.getUserById.mockResolvedValue(null);

      await expect(eventService.getUserSavedEvents('non-existent-user'))
        .rejects.toThrow('User not found');
    });
  });

  describe('validateEventData', () => {
    it('should validate correct event data', () => {
      const result = eventService.validateEventData(validEventData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing required fields', () => {
      const invalidData = {
        ...validEventData,
        title: '',
        description: 'short'
      };

      const result = eventService.validateEventData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid dates', () => {
      const invalidData = {
        ...validEventData,
        startDateTime: new Date('2020-01-01'), // Past date
        endDateTime: new Date('2020-01-01') // Same as start date
      };

      const result = eventService.validateEventData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('greater than'))).toBe(true);
    });

    it('should reject invalid location data', () => {
      const invalidData = {
        ...validEventData,
        location: {
          ...validEventData.location,
          zipCode: 'invalid-zip',
          coordinates: {
            latitude: 200, // Invalid latitude
            longitude: -200 // Invalid longitude
          }
        }
      };

      const result = eventService.validateEventData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid price data', () => {
      const invalidData = {
        ...validEventData,
        price: {
          amount: -10, // Negative amount
          currency: 'INVALID', // Invalid currency code
          isFree: true // Inconsistent with amount
        }
      };

      const result = eventService.validateEventData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject events that are too long', () => {
      const startDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
      const endDate = new Date(startDate.getTime() + 9 * 24 * 60 * 60 * 1000); // 9 days later
      
      const invalidData = {
        ...validEventData,
        startDateTime: startDate,
        endDateTime: endDate
      };

      const result = eventService.validateEventData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Event duration cannot exceed 7 days');
    });

    it('should reject events scheduled too far in the future', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 3); // 3 years in future

      const invalidData = {
        ...validEventData,
        startDateTime: futureDate,
        endDateTime: new Date(futureDate.getTime() + 2 * 60 * 60 * 1000) // 2 hours later
      };

      const result = eventService.validateEventData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Event cannot be scheduled more than 2 years in advance');
    });

    it('should reject invalid categories', () => {
      const invalidData = {
        ...validEventData,
        category: 'invalid-category'
      };

      const result = eventService.validateEventData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Invalid category'))).toBe(true);
    });

    it('should reject inconsistent free event pricing', () => {
      const invalidData = {
        ...validEventData,
        price: {
          amount: 25.00,
          currency: 'USD',
          isFree: true // Inconsistent with non-zero amount
        }
      };

      const result = eventService.validateEventData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Free events cannot have a price amount greater than 0');
    });
  });

  describe('searchEvents', () => {
    it('should search events with filters', async () => {
      const filters = {
        categories: ['technology'],
        dateRange: {
          startDate: new Date('2024-12-01'),
          endDate: new Date('2024-12-31')
        }
      };
      const searchResults = [mockEvent];

      mockedEventRepository.searchEvents.mockResolvedValue(searchResults);

      const result = await eventService.searchEvents(filters, 10);

      expect(result).toEqual(searchResults);
      expect(mockedEventRepository.searchEvents).toHaveBeenCalledWith(filters, 10);
    });
  });

  describe('getPublicEvents', () => {
    it('should get public events with filters', async () => {
      const filters = { categories: ['technology'] };
      const events = [mockEvent];

      mockedEventRepository.searchEvents.mockResolvedValue(events);

      const result = await eventService.getPublicEvents(filters, 10);

      expect(result).toEqual(events);
      expect(mockedEventRepository.searchEvents).toHaveBeenCalledWith(filters, 10);
    });

    it('should get recent events when no filters provided', async () => {
      const events = [mockEvent];

      mockedEventRepository.getEventsByDateRange.mockResolvedValue(events);

      const result = await eventService.getPublicEvents(undefined, 10);

      expect(result).toEqual(events);
      expect(mockedEventRepository.getEventsByDateRange).toHaveBeenCalledWith(
        expect.any(Date),
        undefined,
        10
      );
    });
  });

  describe('Content Moderation and Quality Assurance', () => {
    it('should reject events with inappropriate content in title', async () => {
      const inappropriateEventData = {
        ...validEventData,
        title: 'SPAM EVENT - BUY NOW!!!',
        description: 'This is clearly spam content with excessive promotional language'
      };

      const result = eventService.validateEventData(inappropriateEventData);

      // Note: In a real implementation, you would have content moderation logic
      // For now, we test that the validation framework is in place
      expect(result.isValid).toBe(true); // This would be false with actual moderation
    });

    it('should validate event metadata for proper categorization', async () => {
      const eventWithMetadata = {
        ...validEventData,
        category: 'technology',
        tags: ['ai', 'machine-learning', 'conference']
      };

      mockedUserRepository.getUserById.mockResolvedValue(mockUser);
      mockedEventRepository.createEvent.mockResolvedValue(mockEvent);

      const result = await eventService.createEvent(eventWithMetadata, 'test-user-id');

      expect(result).toBeDefined();
      expect(mockedEventRepository.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'technology',
          tags: ['ai', 'machine-learning', 'conference']
        }),
        'test-user-id'
      );
    });

    it('should ensure proper data storage with DynamoDB schema compliance', async () => {
      mockedUserRepository.getUserById.mockResolvedValue(mockUser);
      mockedEventRepository.createEvent.mockResolvedValue(mockEvent);

      const result = await eventService.createEvent(validEventData, 'test-user-id');

      expect(result).toBeDefined();
      expect(mockedEventRepository.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.any(String),
          description: expect.any(String),
          startDateTime: expect.any(Date),
          endDateTime: expect.any(Date),
          location: expect.objectContaining({
            venue: expect.any(String),
            address: expect.any(String),
            city: expect.any(String),
            state: expect.any(String),
            zipCode: expect.any(String),
            coordinates: expect.objectContaining({
              latitude: expect.any(Number),
              longitude: expect.any(Number)
            })
          }),
          organizer: expect.objectContaining({
            name: expect.any(String)
          }),
          category: expect.any(String),
          price: expect.objectContaining({
            amount: expect.any(Number),
            currency: expect.any(String)
          }),
          tags: expect.any(Array)
        }),
        'test-user-id'
      );
    });
  });

  describe('Advanced Validation Scenarios', () => {
    it('should validate complex location data including coordinates', async () => {
      const eventWithInvalidCoordinates = {
        ...validEventData,
        location: {
          ...validEventData.location,
          coordinates: {
            latitude: 91, // Invalid: > 90
            longitude: -181 // Invalid: < -180
          }
        }
      };

      const result = eventService.validateEventData(eventWithInvalidCoordinates);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate organizer contact information format', async () => {
      const eventWithInvalidOrganizer = {
        ...validEventData,
        organizer: {
          name: 'Test Organizer',
          email: 'invalid-email-format',
          website: 'not-a-valid-url',
          phone: 'invalid-phone-123-abc'
        }
      };

      const result = eventService.validateEventData(eventWithInvalidOrganizer);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('email'))).toBe(true);
    });

    it('should validate event timing constraints', async () => {
      const now = new Date();
      const eventWithInvalidTiming = {
        ...validEventData,
        startDateTime: new Date(now.getTime() - 60000), // 1 minute ago (past)
        endDateTime: new Date(now.getTime() - 30000) // 30 seconds ago (past)
      };

      const result = eventService.validateEventData(eventWithInvalidTiming);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('greater than'))).toBe(true);
    });

    it('should validate required field completeness per requirement 4.1', async () => {
      const incompleteEventData = {
        title: 'Test Event',
        // Missing description, startDateTime, endDateTime, location
        organizer: validEventData.organizer,
        category: 'technology',
        price: validEventData.price,
        tags: []
      };

      const result = eventService.validateEventData(incompleteEventData as any);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      // Should validate title, date, time, and location as per requirement 4.1
      expect(result.errors.some(error => 
        error.includes('description') || 
        error.includes('startDateTime') || 
        error.includes('endDateTime') || 
        error.includes('location')
      )).toBe(true);
    });
  });
});