import request from 'supertest';
import { app } from '../../server';
import { CalendarService } from '../../services/calendarService';
import { EventService } from '../../services/eventService';

describe('Calendar Integration Tests', () => {
  let calendarService: CalendarService;
  let eventService: EventService;

  const testEvent = {
    eventId: 'integration-test-event',
    title: 'Integration Test Event',
    description: 'This is an integration test event for calendar functionality',
    startDateTime: new Date('2024-12-15T14:00:00Z'),
    endDateTime: new Date('2024-12-15T16:00:00Z'),
    location: {
      venue: 'Integration Test Venue',
      address: '456 Integration Ave',
      city: 'Test City',
      state: 'TC',
      zipCode: '54321',
      coordinates: { latitude: 37.7749, longitude: -122.4194 }
    },
    organizer: {
      name: 'Integration Test Organizer',
      email: 'integration@test.com',
      website: 'https://integration-test.com'
    },
    category: 'Testing',
    price: { amount: 0, currency: 'USD' },
    tags: ['integration', 'test'],
    source: { type: 'user-submitted', url: null },
    createdBy: 'integration-user',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeAll(async () => {
    calendarService = new CalendarService();
    eventService = new EventService();
  });

  describe('End-to-End Calendar File Generation', () => {
    it('should generate and download a complete ICS file', async () => {
      // Mock event retrieval
      jest.spyOn(eventService, 'getEventById').mockResolvedValue(testEvent);

      const response = await request(app)
        .get(`/api/calendar/events/${testEvent.eventId}/calendar`)
        .expect(200);

      // Verify response headers
      expect(response.headers['content-type']).toBe('text/calendar; charset=utf-8');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('.ics');

      // Verify ICS content structure
      const icsContent = response.text;
      expect(icsContent).toContain('BEGIN:VCALENDAR');
      expect(icsContent).toContain('END:VCALENDAR');
      expect(icsContent).toContain('BEGIN:VEVENT');
      expect(icsContent).toContain('END:VEVENT');
      expect(icsContent).toContain('VERSION:2.0');

      // Verify event details
      expect(icsContent).toContain('SUMMARY:Integration Test Event');
      expect(icsContent).toContain('DTSTART:20241215T140000Z');
      expect(icsContent).toContain('DTEND:20241215T160000Z');
      expect(icsContent).toContain('LOCATION:Integration Test Venue');
      expect(icsContent).toContain('ORGANIZER;CN=Integration Test Organizer:MAILTO:integration@test.com');
    });

    it('should generate calendar links for multiple platforms', async () => {
      jest.spyOn(eventService, 'getEventById').mockResolvedValue(testEvent);

      const response = await request(app)
        .get(`/api/calendar/events/${testEvent.eventId}/calendar-link`)
        .expect(200);

      const links = response.body;

      // Verify all platform links are present
      expect(links).toHaveProperty('googleCalendar');
      expect(links).toHaveProperty('outlookCalendar');
      expect(links).toHaveProperty('appleCalendar');
      expect(links).toHaveProperty('downloadICS');

      // Verify Google Calendar link format
      expect(links.googleCalendar).toMatch(/^https:\/\/calendar\.google\.com\/calendar\/render/);
      expect(links.googleCalendar).toContain('action=TEMPLATE');
      expect(links.googleCalendar).toContain('text=Integration%20Test%20Event');

      // Verify Outlook link format
      expect(links.outlookCalendar).toMatch(/^https:\/\/outlook\.live\.com\/calendar\/0\/deeplink\/compose/);
      expect(links.outlookCalendar).toContain('subject=Integration%20Test%20Event');

      // Verify download link
      expect(links.downloadICS).toContain(`/api/calendar/events/${testEvent.eventId}/calendar`);
    });
  });

  describe('Calendar File Format Compliance', () => {
    it('should generate RFC 5545 compliant calendar files', async () => {
      const icsContent = calendarService.generateICSContent(testEvent);

      // Test basic structure compliance
      expect(icsContent).toMatch(/^BEGIN:VCALENDAR\r?\n/);
      expect(icsContent).toMatch(/\r?\nEND:VCALENDAR\r?\n?$/);
      expect(icsContent).toContain('VERSION:2.0');
      expect(icsContent).toContain('PRODID:');

      // Test VEVENT structure
      expect(icsContent).toContain('BEGIN:VEVENT');
      expect(icsContent).toContain('END:VEVENT');
      expect(icsContent).toMatch(/UID:.+/);
      expect(icsContent).toMatch(/DTSTAMP:\d{8}T\d{6}Z/);

      // Test required properties
      expect(icsContent).toContain('DTSTART:');
      expect(icsContent).toContain('DTEND:');
      expect(icsContent).toContain('SUMMARY:');
    });

    it('should properly format dates in UTC', async () => {
      const icsContent = calendarService.generateICSContent(testEvent);

      // Extract date values
      const dtStartMatch = icsContent.match(/DTSTART:(\d{8}T\d{6}Z)/);
      const dtEndMatch = icsContent.match(/DTEND:(\d{8}T\d{6}Z)/);
      const dtStampMatch = icsContent.match(/DTSTAMP:(\d{8}T\d{6}Z)/);

      expect(dtStartMatch).toBeTruthy();
      expect(dtEndMatch).toBeTruthy();
      expect(dtStampMatch).toBeTruthy();

      // Verify UTC format (ends with Z)
      expect(dtStartMatch![1]).toMatch(/\d{8}T\d{6}Z/);
      expect(dtEndMatch![1]).toMatch(/\d{8}T\d{6}Z/);
      expect(dtStampMatch![1]).toMatch(/\d{8}T\d{6}Z/);
    });

    it('should properly escape special characters', async () => {
      const eventWithSpecialChars = {
        ...testEvent,
        title: 'Event with "quotes", commas, and; semicolons',
        description: 'Description with\nnewlines and \\backslashes\\',
        location: {
          ...testEvent.location,
          venue: 'Venue with "special" characters'
        }
      };

      const icsContent = calendarService.generateICSContent(eventWithSpecialChars);

      // Check proper escaping
      expect(icsContent).toContain('SUMMARY:Event with \\"quotes\\"\\, commas\\, and\\; semicolons');
      expect(icsContent).toContain('DESCRIPTION:Description with\\nnewlines and \\\\backslashes\\\\');
      expect(icsContent).toContain('LOCATION:Venue with \\"special\\" characters');
    });

    it('should fold long lines according to RFC 5545', async () => {
      const eventWithLongContent = {
        ...testEvent,
        description: 'This is a very long description that exceeds the 75-character limit specified in RFC 5545 and should be properly folded with continuation lines starting with a space character to maintain compatibility with calendar applications and ensure proper parsing of the calendar data.'
      };

      const icsContent = calendarService.generateICSContent(eventWithLongContent);
      const lines = icsContent.split(/\r?\n/);

      // Check line folding
      let foundLongLine = false;
      let foundContinuation = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.startsWith('DESCRIPTION:') && line.length > 75) {
          foundLongLine = true;
          // Check if next line is a continuation (starts with space)
          if (i + 1 < lines.length && lines[i + 1].startsWith(' ')) {
            foundContinuation = true;
          }
        }
        
        // Non-continuation lines should not exceed 75 characters
        if (!line.startsWith(' ')) {
          expect(line.length).toBeLessThanOrEqual(75);
        }
      }

      // If we had a long description, it should have been folded
      if (foundLongLine) {
        expect(foundContinuation).toBe(true);
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle events with minimal required data', async () => {
      const minimalEvent = {
        eventId: 'minimal-event',
        title: 'Minimal Event',
        description: '',
        startDateTime: new Date('2024-12-01T10:00:00Z'),
        endDateTime: new Date('2024-12-01T11:00:00Z'),
        location: {
          venue: 'Venue',
          address: '',
          city: 'City',
          state: 'ST',
          zipCode: '',
          coordinates: { latitude: 0, longitude: 0 }
        },
        organizer: { name: 'Organizer' },
        category: 'General',
        price: { amount: 0, currency: 'USD' },
        tags: [],
        source: { type: 'user-submitted', url: null },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const icsContent = calendarService.generateICSContent(minimalEvent);
      const isValid = calendarService.validateICSFormat(icsContent);

      expect(isValid).toBe(true);
      expect(icsContent).toContain('SUMMARY:Minimal Event');
      expect(icsContent).toContain('LOCATION:Venue\\, City\\, ST');
    });

    it('should handle concurrent calendar file requests', async () => {
      jest.spyOn(eventService, 'getEventById').mockResolvedValue(testEvent);

      const concurrentRequests = Array(10).fill(null).map(() =>
        request(app).get(`/api/calendar/events/${testEvent.eventId}/calendar`)
      );

      const responses = await Promise.all(concurrentRequests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toBe('text/calendar; charset=utf-8');
        expect(response.text).toContain('BEGIN:VCALENDAR');
        expect(response.text).toContain('SUMMARY:Integration Test Event');
      });
    });

    it('should validate generated ICS files', async () => {
      const icsContent = calendarService.generateICSContent(testEvent);
      const isValid = calendarService.validateICSFormat(icsContent);

      expect(isValid).toBe(true);

      // Test invalid ICS content
      const invalidICS = 'INVALID ICS CONTENT';
      const isInvalid = calendarService.validateICSFormat(invalidICS);

      expect(isInvalid).toBe(false);
    });
  });

  describe('Performance and Reliability', () => {
    it('should generate calendar files within acceptable time limits', async () => {
      const startTime = Date.now();
      
      const icsContent = calendarService.generateICSContent(testEvent);
      
      const endTime = Date.now();
      const generationTime = endTime - startTime;

      expect(generationTime).toBeLessThan(500); // Should complete within 500ms
      expect(icsContent).toContain('BEGIN:VCALENDAR');
    });

    it('should handle large event descriptions efficiently', async () => {
      const largeEvent = {
        ...testEvent,
        description: 'A'.repeat(5000) // 5KB description
      };

      const startTime = Date.now();
      const icsContent = calendarService.generateICSContent(largeEvent);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(icsContent).toContain('BEGIN:VCALENDAR');
      expect(calendarService.validateICSFormat(icsContent)).toBe(true);
    });
  });
});