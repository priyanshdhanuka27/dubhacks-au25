import { CalendarService } from '../../services/calendarService';
import { Event } from '../../types';

describe('CalendarService', () => {
  let calendarService: CalendarService;
  
  const mockEvent: Event = {
    eventId: 'test-event-123',
    title: 'Test Event',
    description: 'This is a test event for calendar integration',
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
      email: 'organizer@test.com',
      website: 'https://test.com'
    },
    category: 'Technology',
    price: { amount: 50, currency: 'USD' },
    tags: ['tech', 'conference'],
    source: { type: 'user-submitted', url: null },
    createdBy: 'user-123',
    createdAt: new Date('2024-11-01T00:00:00Z'),
    updatedAt: new Date('2024-11-01T00:00:00Z')
  };

  beforeEach(() => {
    calendarService = new CalendarService();
  });

  describe('generateICSContent', () => {
    it('should generate RFC 5545 compliant ICS content', () => {
      const icsContent = calendarService.generateICSContent(mockEvent);
      
      // Check basic ICS structure
      expect(icsContent).toContain('BEGIN:VCALENDAR');
      expect(icsContent).toContain('END:VCALENDAR');
      expect(icsContent).toContain('BEGIN:VEVENT');
      expect(icsContent).toContain('END:VEVENT');
      
      // Check version and product ID
      expect(icsContent).toContain('VERSION:2.0');
      expect(icsContent).toContain('PRODID:-//EventSync//EventSync Platform//EN');
    });

    it('should include all required event details', () => {
      const icsContent = calendarService.generateICSContent(mockEvent);
      
      // Check event details
      expect(icsContent).toContain('SUMMARY:Test Event');
      expect(icsContent).toContain('DESCRIPTION:This is a test event for calendar integration');
      expect(icsContent).toContain('DTSTART:20241201T100000Z');
      expect(icsContent).toContain('DTEND:20241201T120000Z');
      expect(icsContent).toContain('LOCATION:Test Venue\\, 123 Test St\\, Test City\\, TS 12345');
      expect(icsContent).toContain('ORGANIZER;CN=Test Organizer:MAILTO:organizer@test.com');
    });

    it('should generate unique UID for each event', () => {
      const icsContent1 = calendarService.generateICSContent(mockEvent);
      const icsContent2 = calendarService.generateICSContent({
        ...mockEvent,
        eventId: 'different-event-456'
      });
      
      const uid1Match = icsContent1.match(/UID:(.+)/);
      const uid2Match = icsContent2.match(/UID:(.+)/);
      
      expect(uid1Match).toBeTruthy();
      expect(uid2Match).toBeTruthy();
      expect(uid1Match![1]).not.toBe(uid2Match![1]);
    });

    it('should handle events without optional fields', () => {
      const minimalEvent: Event = {
        ...mockEvent,
        description: '',
        organizer: { name: 'Organizer' },
        location: {
          venue: 'Venue',
          address: '',
          city: 'City',
          state: 'ST',
          zipCode: '',
          coordinates: { latitude: 0, longitude: 0 }
        }
      };

      const icsContent = calendarService.generateICSContent(minimalEvent);
      
      expect(icsContent).toContain('BEGIN:VCALENDAR');
      expect(icsContent).toContain('SUMMARY:Test Event');
      expect(icsContent).toContain('LOCATION:Venue\\, City\\, ST');
    });

    it('should properly escape special characters in ICS content', () => {
      const eventWithSpecialChars: Event = {
        ...mockEvent,
        title: 'Event with "quotes" and \\backslashes\\',
        description: 'Description with\nnewlines and, commas;',
        location: {
          ...mockEvent.location,
          venue: 'Venue with "quotes"'
        }
      };

      const icsContent = calendarService.generateICSContent(eventWithSpecialChars);
      
      expect(icsContent).toContain('SUMMARY:Event with \\"quotes\\" and \\\\backslashes\\\\');
      expect(icsContent).toContain('DESCRIPTION:Description with\\nnewlines and\\, commas\\;');
      expect(icsContent).toContain('LOCATION:Venue with \\"quotes\\"');
    });
  });

  describe('validateICSFormat', () => {
    it('should validate correct ICS format', () => {
      const validICS = calendarService.generateICSContent(mockEvent);
      const isValid = calendarService.validateICSFormat(validICS);
      
      expect(isValid).toBe(true);
    });

    it('should reject ICS without required BEGIN/END tags', () => {
      const invalidICS = 'VERSION:2.0\nSUMMARY:Test';
      const isValid = calendarService.validateICSFormat(invalidICS);
      
      expect(isValid).toBe(false);
    });

    it('should reject ICS without VERSION', () => {
      const invalidICS = 'BEGIN:VCALENDAR\nEND:VCALENDAR';
      const isValid = calendarService.validateICSFormat(invalidICS);
      
      expect(isValid).toBe(false);
    });

    it('should reject ICS with malformed VEVENT', () => {
      const invalidICS = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:Test
END:VCALENDAR`;
      const isValid = calendarService.validateICSFormat(invalidICS);
      
      expect(isValid).toBe(false);
    });
  });

  describe('RFC 5545 compliance', () => {
    it('should generate dates in UTC format', () => {
      const icsContent = calendarService.generateICSContent(mockEvent);
      
      // Check that dates end with Z (UTC)
      expect(icsContent).toMatch(/DTSTART:\d{8}T\d{6}Z/);
      expect(icsContent).toMatch(/DTEND:\d{8}T\d{6}Z/);
    });

    it('should include DTSTAMP with current timestamp', () => {
      const icsContent = calendarService.generateICSContent(mockEvent);
      
      expect(icsContent).toMatch(/DTSTAMP:\d{8}T\d{6}Z/);
    });

    it('should limit line length to 75 characters', () => {
      const eventWithLongDescription: Event = {
        ...mockEvent,
        description: 'This is a very long description that should be folded according to RFC 5545 specifications when it exceeds 75 characters per line to ensure proper formatting and compatibility with calendar applications.'
      };

      const icsContent = calendarService.generateICSContent(eventWithLongDescription);
      const lines = icsContent.split('\n');
      
      // Check that no line exceeds 75 characters (except continuation lines starting with space)
      lines.forEach(line => {
        if (!line.startsWith(' ')) {
          expect(line.length).toBeLessThanOrEqual(75);
        }
      });
    });
  });
});