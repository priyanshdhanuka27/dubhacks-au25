import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Event } from '../../types';
import { CalendarModal } from '../search/CalendarModal';
import { featuredEventsService } from '../../services/featuredEventsService';
import './FeaturedEvents.css';

interface FeaturedEventsProps {
  className?: string;
  limit?: number;
  category?: string;
}
export const FeaturedEvents: React.FC<FeaturedEventsProps> = ({ 
  className = '', 
  limit = 6, 
  category 
}) => {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [featuredEvents, setFeaturedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeaturedEvents = async () => {
      setLoading(true);
      setError(null);
      
      try {
        let events: Event[];
        
        if (category) {
          events = await featuredEventsService.getFeaturedEventsByCategory(category, limit);
        } else {
          events = await featuredEventsService.getFeaturedEvents(limit);
        }
        
        setFeaturedEvents(events);
      } catch (err) {
        console.error('Error fetching featured events:', err);
        setError('Failed to load featured events. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedEvents();
  }, [limit, category]);

  const handleAddToCalendar = (event: Event) => {
    setSelectedEvent(event);
    setIsCalendarModalOpen(true);
  };

  const handleCloseCalendarModal = () => {
    setIsCalendarModalOpen(false);
    setSelectedEvent(null);
  };

  const formatEventDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatEventTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      'Technology': '💻',
      'Music': '🎵',
      'Food & Drink': '🍽️',
      'Business': '💼',
      'Cultural': '🎎',
      'Arts & Culture': '🎨',
      'Sports': '⚽',
      'Education': '📚',
      'Health': '🏥',
      'Entertainment': '🎭'
    };
    return icons[category] || '📅';
  };

  if (loading) {
    return (
      <div className={`featured-events ${className}`}>
        <div className="featured-events-header">
          <h2>Featured Events</h2>
          <p>Discover amazing events happening in your area</p>
        </div>
        <div className="loading-grid">
          {[...Array(limit)].map((_, index) => (
            <div key={index} className="event-card-skeleton">
              <div className="skeleton-image"></div>
              <div className="skeleton-content">
                <div className="skeleton-title"></div>
                <div className="skeleton-text"></div>
                <div className="skeleton-text short"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`featured-events ${className}`}>
        <div className="featured-events-header">
          <h2>Featured Events</h2>
          <p>Discover amazing events happening in your area</p>
        </div>
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3>Unable to Load Events</h3>
          <p>{error}</p>
          <button 
            className="retry-button"
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (featuredEvents.length === 0) {
    return (
      <div className={`featured-events ${className}`}>
        <div className="featured-events-header">
          <h2>Featured Events</h2>
          <p>Discover amazing events happening in your area</p>
        </div>
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <h3>No Featured Events</h3>
          <p>Check back soon for exciting events in your area!</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`featured-events ${className}`}>
      <div className="featured-events-header">
        <h2>Featured Events</h2>
        <p>Discover amazing events happening in your area</p>
      </div>

      <div className="events-grid">
        {featuredEvents.map((event) => (
          <div key={event.eventId} className="featured-event-card">
            <div className="event-card-header">
              <div className="event-category">
                <span className="category-icon">{getCategoryIcon(event.category)}</span>
                <span className="category-text">{event.category}</span>
              </div>
              <div className="event-price">
                {event.price.isFree ? (
                  <span className="price-free">FREE</span>
                ) : (
                  <span className="price-paid">${event.price.amount}</span>
                )}
              </div>
            </div>

            <div className="event-card-content">
              <h3 className="event-title">{event.title}</h3>
              
              <div className="event-datetime">
                <div className="event-date">
                  📅 {formatEventDate(event.startDateTime)}
                </div>
                <div className="event-time">
                  🕐 {formatEventTime(event.startDateTime)} - {formatEventTime(event.endDateTime)}
                </div>
              </div>

              <div className="event-location">
                📍 {event.location.venue}, {event.location.city}, {event.location.state}
              </div>

              <p className="event-description">
                {event.description.length > 120 
                  ? `${event.description.substring(0, 120)}...` 
                  : event.description
                }
              </p>

              <div className="event-tags">
                {event.tags.slice(0, 3).map((tag, index) => (
                  <span key={index} className="event-tag">
                    #{tag}
                  </span>
                ))}
                {event.tags.length > 3 && (
                  <span className="event-tag more">+{event.tags.length - 3} more</span>
                )}
              </div>
            </div>

            <div className="event-card-actions">
              <button 
                className="add-to-calendar-btn"
                onClick={() => handleAddToCalendar(event)}
              >
                📅 Add to Calendar
              </button>
              <div className="event-organizer">
                by {event.organizer.name}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="featured-events-footer">
        <p>Want to see more events? <strong>Sign up</strong> for personalized recommendations!</p>
        <div className="cta-buttons">
          <Link to="/auth" className="cta-primary">Create Account</Link>
          <Link to="/search" className="cta-secondary">Browse All Events</Link>
        </div>
      </div>

      {/* Calendar Modal */}
      {selectedEvent && (
        <CalendarModal
          event={{
            eventId: selectedEvent.eventId,
            title: selectedEvent.title,
            description: selectedEvent.description,
            startDateTime: selectedEvent.startDateTime.toISOString(),
            endDateTime: selectedEvent.endDateTime.toISOString(),
            location: selectedEvent.location,
            relevanceScore: 1.0,
            source: selectedEvent.source.url || '',
            isUserSubmitted: selectedEvent.source.type === 'user_submitted'
          }}
          isOpen={isCalendarModalOpen}
          onClose={handleCloseCalendarModal}
        />
      )}
    </div>
  );
};