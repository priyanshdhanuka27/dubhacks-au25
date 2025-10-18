import { v4 as uuidv4 } from 'uuid';
import { Event, EventSubmission, SearchFilters } from '../../types';
import { dynamoDBService, TABLES } from '../dynamodb';
import { EventTableSchema, formatSortKey, formatLocationGSI, formatStartDateGSI } from '../schemas';

export class EventRepository {
  /**
   * Create a new event
   */
  async createEvent(eventData: EventSubmission, createdBy?: string): Promise<Event> {
    const eventId = uuidv4();
    const now = new Date().toISOString();
    const startDateTime = new Date(eventData.startDateTime);
    const endDateTime = new Date(eventData.endDateTime);

    const eventRecord: EventTableSchema = {
      eventId,
      sortKey: formatSortKey(startDateTime),
      title: eventData.title,
      description: eventData.description,
      startDateTime: startDateTime.toISOString(),
      endDateTime: endDateTime.toISOString(),
      location: eventData.location,
      organizer: eventData.organizer,
      category: eventData.category,
      price: eventData.price,
      tags: eventData.tags,
      source: {
        type: createdBy ? 'user-submitted' : 'crawled',
      },
      createdBy,
      createdAt: now,
      updatedAt: now,
      category_gsi: eventData.category,
      location_gsi: formatLocationGSI(eventData.location.state, eventData.location.city),
      createdBy_gsi: createdBy,
      startDate_gsi: formatStartDateGSI(startDateTime),
    };

    await dynamoDBService.putItem(TABLES.EVENTS, eventRecord);

    return this.transformToEvent(eventRecord);
  }

  /**
   * Get event by ID
   */
  async getEventById(eventId: string): Promise<Event | null> {
    // Since we need the sort key, we'll query by eventId
    const events = await dynamoDBService.queryItems<EventTableSchema>(
      TABLES.EVENTS,
      'eventId = :eventId',
      undefined,
      { ':eventId': eventId },
      undefined,
      1
    );

    return events.length > 0 ? this.transformToEvent(events[0]) : null;
  }

  /**
   * Update an event
   */
  async updateEvent(eventId: string, eventData: Partial<EventSubmission>, userId?: string): Promise<Event | null> {
    // First get the current event to get the sort key
    const currentEvent = await this.getEventById(eventId);
    if (!currentEvent) return null;

    // Check if user has permission to update (if userId provided)
    if (userId && currentEvent.createdBy !== userId) {
      throw new Error('Unauthorized: User does not own this event');
    }

    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    if (eventData.title) {
      updateExpressions.push('#title = :title');
      expressionAttributeNames['#title'] = 'title';
      expressionAttributeValues[':title'] = eventData.title;
    }

    if (eventData.description) {
      updateExpressions.push('#description = :description');
      expressionAttributeNames['#description'] = 'description';
      expressionAttributeValues[':description'] = eventData.description;
    }

    if (eventData.startDateTime) {
      const startDateTime = new Date(eventData.startDateTime);
      updateExpressions.push('#startDateTime = :startDateTime');
      updateExpressions.push('#startDate_gsi = :startDate_gsi');
      expressionAttributeNames['#startDateTime'] = 'startDateTime';
      expressionAttributeNames['#startDate_gsi'] = 'startDate_gsi';
      expressionAttributeValues[':startDateTime'] = startDateTime.toISOString();
      expressionAttributeValues[':startDate_gsi'] = formatStartDateGSI(startDateTime);
    }

    if (eventData.endDateTime) {
      updateExpressions.push('#endDateTime = :endDateTime');
      expressionAttributeNames['#endDateTime'] = 'endDateTime';
      expressionAttributeValues[':endDateTime'] = new Date(eventData.endDateTime).toISOString();
    }

    if (eventData.location) {
      updateExpressions.push('#location = :location');
      updateExpressions.push('#location_gsi = :location_gsi');
      expressionAttributeNames['#location'] = 'location';
      expressionAttributeNames['#location_gsi'] = 'location_gsi';
      expressionAttributeValues[':location'] = eventData.location;
      expressionAttributeValues[':location_gsi'] = formatLocationGSI(eventData.location.state, eventData.location.city);
    }

    if (eventData.organizer) {
      updateExpressions.push('#organizer = :organizer');
      expressionAttributeNames['#organizer'] = 'organizer';
      expressionAttributeValues[':organizer'] = eventData.organizer;
    }

    if (eventData.category) {
      updateExpressions.push('#category = :category');
      updateExpressions.push('#category_gsi = :category_gsi');
      expressionAttributeNames['#category'] = 'category';
      expressionAttributeNames['#category_gsi'] = 'category_gsi';
      expressionAttributeValues[':category'] = eventData.category;
      expressionAttributeValues[':category_gsi'] = eventData.category;
    }

    if (eventData.price) {
      updateExpressions.push('#price = :price');
      expressionAttributeNames['#price'] = 'price';
      expressionAttributeValues[':price'] = eventData.price;
    }

    if (eventData.tags) {
      updateExpressions.push('#tags = :tags');
      expressionAttributeNames['#tags'] = 'tags';
      expressionAttributeValues[':tags'] = eventData.tags;
    }

    if (updateExpressions.length === 0) {
      return currentEvent;
    }

    // Always update the updatedAt timestamp
    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    const updateExpression = `SET ${updateExpressions.join(', ')}`;

    const updatedRecord = await dynamoDBService.updateItem<EventTableSchema>(
      TABLES.EVENTS,
      { 
        eventId, 
        sortKey: formatSortKey(currentEvent.startDateTime) 
      },
      updateExpression,
      expressionAttributeNames,
      expressionAttributeValues
    );

    return updatedRecord ? this.transformToEvent(updatedRecord) : null;
  }

  /**
   * Delete an event
   */
  async deleteEvent(eventId: string, userId?: string): Promise<void> {
    // First get the current event to get the sort key and check permissions
    const currentEvent = await this.getEventById(eventId);
    if (!currentEvent) {
      throw new Error('Event not found');
    }

    // Check if user has permission to delete (if userId provided)
    if (userId && currentEvent.createdBy !== userId) {
      throw new Error('Unauthorized: User does not own this event');
    }

    await dynamoDBService.deleteItem(TABLES.EVENTS, {
      eventId,
      sortKey: formatSortKey(currentEvent.startDateTime),
    });
  }

  /**
   * Get events by user ID (events created by user)
   */
  async getEventsByUserId(userId: string, limit?: number): Promise<Event[]> {
    const eventRecords = await dynamoDBService.queryItems<EventTableSchema>(
      TABLES.EVENTS,
      'createdBy_gsi = :userId',
      undefined,
      { ':userId': userId },
      'UserEventsIndex',
      limit
    );

    return eventRecords.map(record => this.transformToEvent(record));
  }

  /**
   * Get events by category
   */
  async getEventsByCategory(category: string, startDate?: Date, limit?: number): Promise<Event[]> {
    let keyConditionExpression = 'category_gsi = :category';
    const expressionAttributeValues: Record<string, any> = { ':category': category };

    if (startDate) {
      keyConditionExpression += ' AND startDate_gsi >= :startDate';
      expressionAttributeValues[':startDate'] = formatStartDateGSI(startDate);
    }

    const eventRecords = await dynamoDBService.queryItems<EventTableSchema>(
      TABLES.EVENTS,
      keyConditionExpression,
      undefined,
      expressionAttributeValues,
      'CategoryIndex',
      limit
    );

    return eventRecords.map(record => this.transformToEvent(record));
  }

  /**
   * Get events by location
   */
  async getEventsByLocation(state: string, city: string, startDate?: Date, limit?: number): Promise<Event[]> {
    let keyConditionExpression = 'location_gsi = :location';
    const expressionAttributeValues: Record<string, any> = { 
      ':location': formatLocationGSI(state, city) 
    };

    if (startDate) {
      keyConditionExpression += ' AND startDate_gsi >= :startDate';
      expressionAttributeValues[':startDate'] = formatStartDateGSI(startDate);
    }

    const eventRecords = await dynamoDBService.queryItems<EventTableSchema>(
      TABLES.EVENTS,
      keyConditionExpression,
      undefined,
      expressionAttributeValues,
      'LocationIndex',
      limit
    );

    return eventRecords.map(record => this.transformToEvent(record));
  }

  /**
   * Get events by date range
   */
  async getEventsByDateRange(startDate: Date, endDate?: Date, limit?: number): Promise<Event[]> {
    let keyConditionExpression = 'startDate_gsi >= :startDate';
    const expressionAttributeValues: Record<string, any> = { 
      ':startDate': formatStartDateGSI(startDate) 
    };

    if (endDate) {
      keyConditionExpression += ' AND startDate_gsi <= :endDate';
      expressionAttributeValues[':endDate'] = formatStartDateGSI(endDate);
    }

    const eventRecords = await dynamoDBService.queryItems<EventTableSchema>(
      TABLES.EVENTS,
      keyConditionExpression,
      undefined,
      expressionAttributeValues,
      'DateIndex',
      limit
    );

    return eventRecords.map(record => this.transformToEvent(record));
  }

  /**
   * Search events with filters
   */
  async searchEvents(filters: SearchFilters, limit?: number): Promise<Event[]> {
    // This is a basic implementation. For more complex searches, 
    // you would typically use OpenSearch or implement multiple queries
    let events: Event[] = [];

    if (filters.categories && filters.categories.length > 0) {
      // Get events by category
      const categoryPromises = filters.categories.map(category =>
        this.getEventsByCategory(category, filters.dateRange?.startDate, limit)
      );
      const categoryResults = await Promise.all(categoryPromises);
      events = categoryResults.flat();
    } else if (filters.location?.state && filters.location?.city) {
      // Get events by location
      events = await this.getEventsByLocation(
        filters.location.state,
        filters.location.city,
        filters.dateRange?.startDate,
        limit
      );
    } else if (filters.dateRange) {
      // Get events by date range
      events = await this.getEventsByDateRange(
        filters.dateRange.startDate,
        filters.dateRange.endDate,
        limit
      );
    } else {
      // Fallback to scan (not recommended for production)
      const eventRecords = await dynamoDBService.scanItems<EventTableSchema>(
        TABLES.EVENTS,
        undefined,
        undefined,
        undefined,
        limit
      );
      events = eventRecords.map(record => this.transformToEvent(record));
    }

    // Apply additional filters in memory (for basic implementation)
    return this.applyFilters(events, filters);
  }

  /**
   * Get multiple events by IDs
   */
  async getEventsByIds(eventIds: string[]): Promise<Event[]> {
    if (eventIds.length === 0) return [];

    // Since we need sort keys, we'll query each event individually
    // In a production system, you might want to optimize this
    const eventPromises = eventIds.map(eventId => this.getEventById(eventId));
    const events = await Promise.all(eventPromises);
    
    return events.filter((event): event is Event => event !== null);
  }

  /**
   * Get events by filters (alias for searchEvents for compatibility)
   */
  async getEventsByFilters(filters: SearchFilters, limit?: number): Promise<Event[]> {
    return this.searchEvents(filters, limit);
  }

  /**
   * Get events created by a specific user (alias for getEventsByUserId for compatibility)
   */
  async getEventsByCreator(userId: string, limit?: number): Promise<Event[]> {
    return this.getEventsByUserId(userId, limit);
  }

  /**
   * Apply filters to events (in-memory filtering for basic implementation)
   */
  private applyFilters(events: Event[], filters: SearchFilters): Event[] {
    return events.filter(event => {
      // Price range filter
      if (filters.priceRange) {
        const eventPrice = event.price.isFree ? 0 : event.price.amount;
        if (eventPrice < filters.priceRange.min || eventPrice > filters.priceRange.max) {
          return false;
        }
      }

      // Date range filter (if not already applied in query)
      if (filters.dateRange) {
        const eventDate = event.startDateTime;
        if (eventDate < filters.dateRange.startDate || 
            (filters.dateRange.endDate && eventDate > filters.dateRange.endDate)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Transform EventTableSchema to Event interface
   */
  private transformToEvent(eventRecord: EventTableSchema): Event {
    return {
      eventId: eventRecord.eventId,
      title: eventRecord.title,
      description: eventRecord.description,
      startDateTime: new Date(eventRecord.startDateTime),
      endDateTime: new Date(eventRecord.endDateTime),
      location: eventRecord.location,
      organizer: eventRecord.organizer,
      category: eventRecord.category,
      price: eventRecord.price,
      tags: eventRecord.tags,
      source: {
        type: eventRecord.source.type,
        url: eventRecord.source.url,
        crawlDate: eventRecord.source.crawlDate ? new Date(eventRecord.source.crawlDate) : undefined,
      },
      createdBy: eventRecord.createdBy,
      createdAt: new Date(eventRecord.createdAt),
      updatedAt: new Date(eventRecord.updatedAt),
    };
  }
}

// Export singleton instance
export const eventRepository = new EventRepository();