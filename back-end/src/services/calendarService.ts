import { Event, CalendarEvent, ValidationResult } from '../types';

/**
 * Calendar Service for generating RFC 5545 compliant .ics files
 * Handles event data conversion to iCalendar format
 */
export class CalendarService {
  
  /**
   * Generates RFC 5545 compliant .ics file content from an Event
   * @param event - Event object to convert
   * @returns .ics file content as string
   */
  generateICSContent(event: Event): string {
    const calendarEvent = this.convertEventToCalendarEvent(event);
    return this.buildICSContent(calendarEvent);
  }

  /**
   * Converts Event model to CalendarEvent format
   * @param event - Event object
   * @returns CalendarEvent object
   */
  private convertEventToCalendarEvent(event: Event): CalendarEvent {
    const locationString = this.formatLocationString(event.location);
    
    return {
      title: event.title,
      description: event.description,
      startDateTime: event.startDateTime,
      endDateTime: event.endDateTime,
      location: locationString,
      organizer: event.organizer.name,
      url: event.organizer.website
    };
  }

  /**
   * Formats location object into a single string for .ics format
   * @param location - Location object
   * @returns Formatted location string
   */
  private formatLocationString(location: any): string {
    const parts = [
      location.venue,
      location.address,
      location.city,
      location.state,
      location.zipCode
    ].filter(part => part && part.trim());
    
    return parts.join(', ');
  }

  /**
   * Builds the complete .ics file content
   * @param calendarEvent - CalendarEvent object
   * @returns RFC 5545 compliant .ics content
   */
  private buildICSContent(calendarEvent: CalendarEvent): string {
    const uid = this.generateUID();
    const timestamp = this.formatDateTime(new Date());
    const startTime = this.formatDateTime(calendarEvent.startDateTime);
    const endTime = this.formatDateTime(calendarEvent.endDateTime);
    
    let icsContent = 'BEGIN:VCALENDAR\r\n';
    icsContent += 'VERSION:2.0\r\n';
    icsContent += 'PRODID:-//EventSync Platform//EventSync Calendar//EN\r\n';
    icsContent += 'CALSCALE:GREGORIAN\r\n';
    icsContent += 'METHOD:PUBLISH\r\n';
    icsContent += 'BEGIN:VEVENT\r\n';
    icsContent += `UID:${uid}\r\n`;
    icsContent += `DTSTAMP:${timestamp}\r\n`;
    icsContent += `DTSTART:${startTime}\r\n`;
    icsContent += `DTEND:${endTime}\r\n`;
    icsContent += `SUMMARY:${this.escapeText(calendarEvent.title)}\r\n`;
    
    if (calendarEvent.description) {
      icsContent += `DESCRIPTION:${this.escapeText(calendarEvent.description)}\r\n`;
    }
    
    if (calendarEvent.location) {
      icsContent += `LOCATION:${this.escapeText(calendarEvent.location)}\r\n`;
    }
    
    if (calendarEvent.organizer) {
      icsContent += `ORGANIZER:CN=${this.escapeText(calendarEvent.organizer)}\r\n`;
    }
    
    if (calendarEvent.url) {
      icsContent += `URL:${calendarEvent.url}\r\n`;
    }
    
    icsContent += 'STATUS:CONFIRMED\r\n';
    icsContent += 'TRANSP:OPAQUE\r\n';
    icsContent += 'END:VEVENT\r\n';
    icsContent += 'END:VCALENDAR\r\n';
    
    return icsContent;
  }

  /**
   * Formats Date object to RFC 5545 datetime format (YYYYMMDDTHHMMSSZ)
   * @param date - Date object to format
   * @returns Formatted datetime string
   */
  private formatDateTime(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
  }

  /**
   * Generates a unique identifier for the calendar event
   * @returns Unique identifier string
   */
  private generateUID(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return `${timestamp}-${random}@eventsync.platform`;
  }

  /**
   * Escapes special characters in text fields according to RFC 5545
   * @param text - Text to escape
   * @returns Escaped text
   */
  private escapeText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')  // Escape backslashes
      .replace(/;/g, '\\;')    // Escape semicolons
      .replace(/,/g, '\\,')    // Escape commas
      .replace(/\n/g, '\\n')   // Escape newlines
      .replace(/\r/g, '')      // Remove carriage returns
      .substring(0, 75);       // Limit line length as per RFC 5545
  }

  /**
   * Validates .ics file format compliance
   * @param icsContent - .ics file content to validate
   * @returns ValidationResult with validation status and errors
   */
  validateICSFormat(icsContent: string): ValidationResult {
    const errors: string[] = [];
    
    // Check required components
    if (!icsContent.includes('BEGIN:VCALENDAR')) {
      errors.push('Missing required BEGIN:VCALENDAR');
    }
    
    if (!icsContent.includes('END:VCALENDAR')) {
      errors.push('Missing required END:VCALENDAR');
    }
    
    if (!icsContent.includes('VERSION:2.0')) {
      errors.push('Missing required VERSION:2.0');
    }
    
    if (!icsContent.includes('PRODID:')) {
      errors.push('Missing required PRODID');
    }
    
    if (!icsContent.includes('BEGIN:VEVENT')) {
      errors.push('Missing required BEGIN:VEVENT');
    }
    
    if (!icsContent.includes('END:VEVENT')) {
      errors.push('Missing required END:VEVENT');
    }
    
    if (!icsContent.includes('UID:')) {
      errors.push('Missing required UID');
    }
    
    if (!icsContent.includes('DTSTAMP:')) {
      errors.push('Missing required DTSTAMP');
    }
    
    if (!icsContent.includes('DTSTART:')) {
      errors.push('Missing required DTSTART');
    }
    
    // Check line endings (should be CRLF)
    if (!icsContent.includes('\r\n')) {
      errors.push('Invalid line endings - should use CRLF (\\r\\n)');
    }
    
    // Check for proper structure
    const lines = icsContent.split('\r\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.length > 75 && !line.includes('DESCRIPTION:')) {
        errors.push(`Line ${i + 1} exceeds 75 character limit`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generates calendar download filename
   * @param event - Event object
   * @returns Sanitized filename for download
   */
  generateFilename(event: Event): string {
    const sanitizedTitle = event.title
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase()
      .substring(0, 50);
    
    const dateStr = event.startDateTime.toISOString().split('T')[0];
    return `${sanitizedTitle}-${dateStr}.ics`;
  }

  /**
   * Gets MIME type for .ics files
   * @returns MIME type string
   */
  getMimeType(): string {
    return 'text/calendar; charset=utf-8';
  }

  /**
   * Gets appropriate headers for .ics file download
   * @param filename - Filename for the download
   * @returns Headers object
   */
  getDownloadHeaders(filename: string): Record<string, string> {
    return {
      'Content-Type': this.getMimeType(),
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    };
  }
}

// Export singleton instance
export const calendarService = new CalendarService();