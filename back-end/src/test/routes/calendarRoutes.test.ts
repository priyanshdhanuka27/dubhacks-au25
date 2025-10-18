import request from 'supertest';
import express from 'express';
import { calendarRoutes } from '../../routes/calendarRoutes';
import { CalendarService } from '../../services/calendarService';
import { EventService } from '../../services/eventService';

// Mock the services
jest.mock('../../services/calendarService');
jest.mock('../../services/eventService');

const MockedCalendarService = CalendarService as jest.MockedClass<typeof CalendarService>;
const MockedEventService = EventService as jest.MockedClass<typeof EventService>;

describe('Calendar Routes', () => {
  let app: express.Application;
  let mockCalendarService: jest.Mocked<CalendarService>;
  let mockEventService: jest.Mocked<EventService>;

  const mockEvent = {
    eventId: 'test-event-123',
    title: 'Test Event',
    description: 'Test event description',
    startDateTime: new Date('2024-12-01T10:00:00Z'),
    endDateTime: new Date('2024-12-01T12:00:00Z'),
    location: {
      venue: 'Test Venue',
      address: '123 Test St',
      city: 'Test City',
      state: 'TS',
      zipCode: '12345',
      coordinates: { latitude: 40.7128, longitude: -74.0060 }
    },
    organizer: {
      name: 'Test Organizer',
      email: 'organizer@test.com'
    },
    category: 'Technology',
    price: { amount: 50, currency: 'USD' },
    tags: ['tech'],
    source: { type: 'user-submitted', url: null },
    createdBy: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockICSContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//EventSync//EventSync Platform//EN
BEGIN:VEVENT
UID:test-event-123@eventsync.com
DTSTART:20241201T100000Z
DTEND:20241201T120000Z
SUMMARY:Test Event
DESCRIPTION:Test event description
LOCATION:Test Venue, 123 Test St, Test City, TS 12345
ORGANIZER;CN=Test Organizer:MAILTO:organizer@test.com
DTSTAMP:20241118T120000Z
END:VEVENT
END:VCALENDAR`;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Reset mocks
    MockedCalendarService.mockClear();
    MockedEventService.mockClear();
    
    mockCalendarService = new MockedCalendarService() as jest.Mocked<CalendarService>;
    mockEventService = new MockedEventService() as jest.Mocked<EventService>;
    
    // Setup default mock implementations
    mockEventService.getEventById.mockResolvedValue(mockEvent);
    mockCalendarService.generateICSContent.mockReturnValue(mockICSContent);
    mockCalendarService.validateICSFormat.mockReturnValue(true);
    
    app.use('/api/calendar', calendarRoutes);
  });

  describe('GET /events/:id/calendar', () => {
    it('should return ICS file for valid event', async () => {
      const response = await request(app)
        .get('/api/calendar/events/test-event-123/calendar')
        .expect(200);

      expect(response.headers['content-type']).toBe('text/calendar; charset=utf-8');
      expect(response.headers['content-disposition']).toBe('attachment; filename="test-event.ics"');
      expect(response.text).toBe(mockICSContent);
      
      expect(mockEventService.getEventById).toHaveBeenCalledWith('test-event-123');
      expect(mockCalendarService.generateICSContent).toHaveBeenCalledWith(mockEvent);
    });

    it('should return 404 for non-existent event', async () => {
      mockEventService.getEventById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/calendar/events/non-existent/calendar')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Event not found'
      });
    });

    it('should return 500 when ICS generation fails', async () => {
      mockCalendarService.generateICSContent.mockImplementation(() => {
        throw new Error('ICS generation failed');
      });

      const response = await request(app)
        .get('/api/calendar/events/test-event-123/calendar')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to generate calendar file'
      });
    });

    it('should return 500 when generated ICS is invalid', async () => {
      mockCalendarService.validateICSFormat.mockReturnValue(false);

      const response = await request(app)
        .get('/api/calendar/events/test-event-123/calendar')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Generated calendar file is invalid'
      });
    });

    it('should handle database errors gracefully', async () => {
      mockEventService.getEventById.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/calendar/events/test-event-123/calendar')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Internal server error'
      });
    });
  });

  describe('GET /events/:id/calendar-link', () => {
    it('should return calendar integration links', async () => {
      const response = await request(app)
        .get('/api/calendar/events/test-event-123/calendar-link')
        .expect(200);

      expect(response.body).toHaveProperty('googleCalendar');
      expect(response.body).toHaveProperty('outlookCalendar');
      expect(response.body).toHaveProperty('appleCalendar');
      expect(response.body).toHaveProperty('downloadICS');
      
      expect(response.body.googleCalendar).toContain('calendar.google.com');
      expect(response.body.outlookCalendar).toContain('outlook.live.com');
      expect(response.body.downloadICS).toContain('/api/calendar/events/test-event-123/calendar');
    });

    it('should return 404 for non-existent event', async () => {
      mockEventService.getEventById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/calendar/events/non-existent/calendar-link')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Event not found'
      });
    });

    it('should generate proper Google Calendar URL', async () => {
      const response = await request(app)
        .get('/api/calendar/events/test-event-123/calendar-link')
        .expect(200);

      const googleUrl = response.body.googleCalendar;
      expect(googleUrl).toContain('action=TEMPLATE');
      expect(googleUrl).toContain('text=Test%20Event');
      expect(googleUrl).toContain('dates=20241201T100000Z/20241201T120000Z');
      expect(googleUrl).toContain('location=Test%20Venue');
    });

    it('should generate proper Outlook Calendar URL', async () => {
      const response = await request(app)
        .get('/api/calendar/events/test-event-123/calendar-link')
        .expect(200);

      const outlookUrl = response.body.outlookCalendar;
      expect(outlookUrl).toContain('outlook.live.com');
      expect(outlookUrl).toContain('subject=Test%20Event');
      expect(outlookUrl).toContain('startdt=2024-12-01T10:00:00Z');
      expect(outlookUrl).toContain('enddt=2024-12-01T12:00:00Z');
    });
  });

  describe('Content-Type and Headers', () => {
    it('should set correct MIME type for ICS files', async () => {
      const response = await request(app)
        .get('/api/calendar/events/test-event-123/calendar')
        .expect(200);

      expect(response.headers['content-type']).toBe('text/calendar; charset=utf-8');
    });

    it('should set correct filename in Content-Disposition header', async () => {
      const response = await request(app)
        .get('/api/calendar/events/test-event-123/calendar')
        .expect(200);

      expect(response.headers['content-disposition']).toMatch(/attachment; filename=".+\.ics"/);
    });

    it('should set cache control headers for ICS files', async () => {
      const response = await request(app)
        .get('/api/calendar/events/test-event-123/calendar')
        .expect(200);

      expect(response.headers['cache-control']).toBe('no-cache, no-store, must-revalidate');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed event IDs', async () => {
      const response = await request(app)
        .get('/api/calendar/events/invalid-id-with-special-chars!@#/calendar')
        .expect(400);

      expect(response.body).toEqual({
        error: 'Invalid event ID format'
      });
    });

    it('should handle concurrent requests properly', async () => {
      const requests = Array(5).fill(null).map(() =>
        request(app).get('/api/calendar/events/test-event-123/calendar')
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.text).toBe(mockICSContent);
      });
    });
  });
});