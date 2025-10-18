import { apiClient } from './apiClient';

interface CalendarLinks {
  ics: string;
  google: string;
  outlook: string;
  yahoo: string;
  apple: string;
}

interface CalendarLinkResponse {
  success: boolean;
  data: CalendarLinks;
  message: string;
}

/**
 * Calendar service for frontend calendar integration
 */
class CalendarService {
  
  /**
   * Get calendar links for all supported calendar providers
   * @param eventId - Event ID to generate links for
   * @returns Promise with calendar links
   */
  async getCalendarLinks(eventId: string): Promise<CalendarLinks> {
    try {
      const response = await apiClient.get<CalendarLinkResponse>(`/events/${eventId}/calendar/link`);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to generate calendar links');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Error fetching calendar links:', error);
      throw new Error(error.response?.data?.message || 'Failed to generate calendar links');
    }
  }

  /**
   * Get calendar link for a specific provider
   * @param eventId - Event ID
   * @param provider - Calendar provider (google, outlook, yahoo, apple, ics)
   * @returns Promise with calendar link
   */
  async getCalendarLink(eventId: string, provider: string): Promise<string> {
    try {
      const response = await apiClient.get<{ success: boolean; data: { link: string; type: string }; message: string }>(
        `/events/${eventId}/calendar/link?type=${provider}`
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to generate calendar link');
      }
      
      return response.data.data.link;
    } catch (error: any) {
      console.error('Error fetching calendar link:', error);
      throw new Error(error.response?.data?.message || 'Failed to generate calendar link');
    }
  }

  /**
   * Download .ics calendar file for an event
   * @param eventId - Event ID
   * @param eventTitle - Event title for filename
   */
  async downloadICSFile(eventId: string, eventTitle: string): Promise<void> {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api'}/events/${eventId}/calendar`, {
        method: 'GET',
        headers: {
          'Accept': 'text/calendar',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download calendar file');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename
      const sanitizedTitle = eventTitle
        .replace(/[^a-zA-Z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .toLowerCase()
        .substring(0, 50);
      
      const dateStr = new Date().toISOString().split('T')[0];
      link.download = `${sanitizedTitle}-${dateStr}.ics`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error downloading .ics file:', error);
      throw new Error('Failed to download calendar file');
    }
  }

  /**
   * Open calendar provider in new tab
   * @param url - Calendar provider URL
   */
  openCalendarProvider(url: string): void {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  /**
   * Check if calendar integration is supported
   * @returns boolean indicating support
   */
  isCalendarIntegrationSupported(): boolean {
    // Check if we're in a browser environment
    return typeof window !== 'undefined' && typeof document !== 'undefined';
  }

  /**
   * Get user's preferred calendar provider from localStorage
   * @returns string with preferred provider or null
   */
  getPreferredCalendarProvider(): string | null {
    if (!this.isCalendarIntegrationSupported()) return null;
    
    try {
      return localStorage.getItem('preferredCalendarProvider');
    } catch (error) {
      console.warn('Failed to get preferred calendar provider from localStorage');
      return null;
    }
  }

  /**
   * Set user's preferred calendar provider in localStorage
   * @param provider - Calendar provider to set as preferred
   */
  setPreferredCalendarProvider(provider: string): void {
    if (!this.isCalendarIntegrationSupported()) return;
    
    try {
      localStorage.setItem('preferredCalendarProvider', provider);
    } catch (error) {
      console.warn('Failed to save preferred calendar provider to localStorage');
    }
  }

  /**
   * Quick add to preferred calendar provider
   * @param eventId - Event ID
   * @returns Promise that resolves when calendar action is complete
   */
  async quickAddToCalendar(eventId: string): Promise<void> {
    const preferredProvider = this.getPreferredCalendarProvider();
    
    if (!preferredProvider) {
      throw new Error('No preferred calendar provider set');
    }

    try {
      const link = await this.getCalendarLink(eventId, preferredProvider);
      
      if (preferredProvider === 'ics' || preferredProvider === 'apple') {
        // For .ics files, trigger download
        const response = await fetch(link);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = `event-${eventId}.ics`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        window.URL.revokeObjectURL(url);
      } else {
        // For web-based calendars, open in new tab
        this.openCalendarProvider(link);
      }
    } catch (error: any) {
      console.error('Error in quick add to calendar:', error);
      throw new Error('Failed to add event to calendar');
    }
  }
}

// Export singleton instance
export const calendarService = new CalendarService();