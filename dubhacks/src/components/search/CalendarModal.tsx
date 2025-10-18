import React, { useState, useEffect, useCallback } from 'react';
import { SearchEvent } from '../../types';
import { calendarService } from '../../services/calendarService';
import './SearchComponents.css';

interface CalendarModalProps {
  event: SearchEvent;
  isOpen: boolean;
  onClose: () => void;
}

interface CalendarLinks {
  ics: string;
  google: string;
  outlook: string;
  yahoo: string;
  apple: string;
}

export const CalendarModal: React.FC<CalendarModalProps> = ({
  event,
  isOpen,
  onClose,
}) => {
  const [calendarLinks, setCalendarLinks] = useState<CalendarLinks | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);

  const fetchCalendarLinks = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const links = await calendarService.getCalendarLinks(event.eventId);
      setCalendarLinks(links);
    } catch (err: any) {
      setError(err.message || 'Failed to generate calendar links');
    } finally {
      setLoading(false);
    }
  }, [event]);

  useEffect(() => {
    if (isOpen && event) {
      fetchCalendarLinks();
    }
  }, [isOpen, event, fetchCalendarLinks]);

  const handleCalendarAction = async (type: keyof CalendarLinks) => {
    if (!calendarLinks) return;

    try {
      setDownloadStatus(`Opening ${type} calendar...`);
      
      if (type === 'ics' || type === 'apple') {
        // For .ics files, trigger download
        await calendarService.downloadICSFile(event.eventId, event.title);
        setDownloadStatus('Calendar file downloaded successfully!');
      } else {
        // For web-based calendars, open in new tab
        window.open(calendarLinks[type], '_blank');
        setDownloadStatus(`Opened ${type} calendar in new tab`);
      }

      // Clear status after 3 seconds
      setTimeout(() => {
        setDownloadStatus(null);
      }, 3000);
    } catch (err: any) {
      setError(err.message || `Failed to open ${type} calendar`);
    }
  };

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="calendar-modal-overlay" onClick={onClose}>
      <div className="calendar-modal" onClick={(e) => e.stopPropagation()}>
        <div className="calendar-modal-header">
          <h3>Add to Calendar</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="calendar-modal-content">
          <div className="event-summary">
            <h4>{event.title}</h4>
            <p className="event-date">
              📅 {formatEventDate(event.startDateTime)}
            </p>
            <p className="event-location">
              📍 {event.location.venue}, {event.location.city}, {event.location.state}
            </p>
          </div>

          {loading && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Generating calendar links...</p>
            </div>
          )}

          {error && (
            <div className="error-state">
              <p className="error-message">❌ {error}</p>
              <button className="retry-btn" onClick={fetchCalendarLinks}>
                Try Again
              </button>
            </div>
          )}

          {downloadStatus && (
            <div className="success-state">
              <p className="success-message">✅ {downloadStatus}</p>
            </div>
          )}

          {calendarLinks && !loading && (
            <div className="calendar-options">
              <h5>Choose your calendar app:</h5>
              
              <div className="calendar-buttons">
                <button
                  className="calendar-option google"
                  onClick={() => handleCalendarAction('google')}
                >
                  <span className="calendar-icon">🗓️</span>
                  <div className="calendar-info">
                    <strong>Google Calendar</strong>
                    <small>Opens in browser</small>
                  </div>
                </button>

                <button
                  className="calendar-option outlook"
                  onClick={() => handleCalendarAction('outlook')}
                >
                  <span className="calendar-icon">📧</span>
                  <div className="calendar-info">
                    <strong>Outlook</strong>
                    <small>Opens in browser</small>
                  </div>
                </button>

                <button
                  className="calendar-option apple"
                  onClick={() => handleCalendarAction('apple')}
                >
                  <span className="calendar-icon">🍎</span>
                  <div className="calendar-info">
                    <strong>Apple Calendar</strong>
                    <small>Downloads .ics file</small>
                  </div>
                </button>

                <button
                  className="calendar-option yahoo"
                  onClick={() => handleCalendarAction('yahoo')}
                >
                  <span className="calendar-icon">🟣</span>
                  <div className="calendar-info">
                    <strong>Yahoo Calendar</strong>
                    <small>Opens in browser</small>
                  </div>
                </button>

                <button
                  className="calendar-option ics"
                  onClick={() => handleCalendarAction('ics')}
                >
                  <span className="calendar-icon">📄</span>
                  <div className="calendar-info">
                    <strong>Download .ics file</strong>
                    <small>Works with most calendar apps</small>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="calendar-modal-footer">
          <button className="cancel-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};