import React, { useState } from 'react';
import { SearchEvent } from '../../types';
import { CalendarModal } from './CalendarModal';
import './SearchComponents.css';

interface EventCardProps {
  event: SearchEvent;
  onSave?: (eventId: string) => void;
  onCalendarAdd?: (event: SearchEvent) => void;
  viewMode?: 'grid' | 'list';
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  onSave,
  onCalendarAdd,
  viewMode = 'grid',
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingToCalendar, setIsAddingToCalendar] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      }),
    };
  };

  const handleSave = async () => {
    if (!onSave || isSaving) return;
    
    setIsSaving(true);
    try {
      await onSave(event.eventId);
    } catch (error) {
      console.error('Error saving event:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCalendarAdd = async () => {
    if (onCalendarAdd) {
      // Use legacy callback if provided
      if (isAddingToCalendar) return;
      
      setIsAddingToCalendar(true);
      try {
        await onCalendarAdd(event);
      } catch (error) {
        console.error('Error adding to calendar:', error);
      } finally {
        setIsAddingToCalendar(false);
      }
    } else {
      // Use new modal approach
      setShowCalendarModal(true);
    }
  };

  const startDate = formatDate(event.startDateTime);
  const endDate = formatDate(event.endDateTime);
  const isMultiDay = new Date(event.startDateTime).toDateString() !== new Date(event.endDateTime).toDateString();

  const getSourceIcon = (source: string) => {
    if (source === 'user-submitted') return '👤';
    if (source.includes('eventbrite')) return '🎫';
    if (source.includes('meetup')) return '👥';
    if (source.includes('facebook')) return '📘';
    return '🌐';
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 0.8) return '#4CAF50';
    if (score >= 0.6) return '#FF9800';
    return '#757575';
  };

  return (
    <div className={`event-card ${viewMode}`}>
      <div className="event-card-header">
        <div className="event-date">
          <div className="date-primary">{startDate.date}</div>
          <div className="time-primary">{startDate.time}</div>
          {isMultiDay && (
            <div className="date-end">to {endDate.date}</div>
          )}
        </div>
        
        <div className="event-meta">
          <div className="source-indicator" title={`Source: ${event.source}`}>
            {getSourceIcon(event.source)}
          </div>
          <div 
            className="relevance-score"
            style={{ color: getRelevanceColor(event.relevanceScore) }}
            title={`Relevance: ${Math.round(event.relevanceScore * 100)}%`}
          >
            {Math.round(event.relevanceScore * 100)}%
          </div>
        </div>
      </div>

      <div className="event-card-content">
        <h3 className="event-title">{event.title}</h3>
        
        <div className="event-location">
          <span className="location-icon">📍</span>
          <span className="location-text">
            {event.location.venue}
            {event.location.city && `, ${event.location.city}`}
            {event.location.state && `, ${event.location.state}`}
          </span>
        </div>

        <p className="event-description">
          {event.description.length > 150 
            ? `${event.description.substring(0, 150)}...` 
            : event.description
          }
        </p>

        {event.isUserSubmitted && (
          <div className="user-submitted-badge">
            <span>👤 User Submitted</span>
          </div>
        )}

        {event.isSaved && (
          <div className="saved-badge">
            <span>💾 Saved</span>
          </div>
        )}
      </div>

      <div className="event-card-actions">
        <button 
          className="view-details-btn"
          onClick={() => {
            // Navigate to event details page
            window.open(`/events/${event.eventId}`, '_blank');
          }}
        >
          View Details
        </button>

        {onSave && (
          <button 
            className={`save-btn ${event.isSaved ? 'saved' : ''}`}
            onClick={handleSave}
            disabled={isSaving}
            title={event.isSaved ? 'Remove from saved' : 'Save event'}
          >
            {isSaving ? '⏳' : event.isSaved ? '💾' : '🔖'}
          </button>
        )}

        <button 
          className="calendar-btn"
          onClick={handleCalendarAdd}
          disabled={isAddingToCalendar}
          title="Add to calendar"
        >
          {isAddingToCalendar ? '⏳' : '📅'}
        </button>
      </div>

      <CalendarModal
        event={event}
        isOpen={showCalendarModal}
        onClose={() => setShowCalendarModal(false)}
      />
    </div>
  );
};