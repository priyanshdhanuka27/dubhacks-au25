import React, { useState, useEffect, useCallback } from 'react';
import { Event } from '../../types';
import { userService } from '../../services/userService';
import { useAuth } from '../../contexts/AuthContext';
import { EventCard } from '../search/EventCard';
import './UserComponents.css';

interface SavedEventsProps {
  onEventUnsave?: (eventId: string) => void;
  onCalendarAdd?: (event: Event) => void;
}

const SavedEvents: React.FC<SavedEventsProps> = ({ onEventUnsave, onCalendarAdd }) => {
  const { state } = useAuth();
  const { user } = state;
  const [savedEvents, setSavedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'category'>('date');
  const [filterCategory, setFilterCategory] = useState<string>('');

  const loadSavedEvents = useCallback(async () => {
    if (!user?.userId) return;

    try {
      setLoading(true);
      setError(null);
      const events = await userService.getSavedEvents(user.userId);
      setSavedEvents(events);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load saved events');
    } finally {
      setLoading(false);
    }
  }, [user?.userId]);

  useEffect(() => {
    if (user?.userId) {
      loadSavedEvents();
    }
  }, [user?.userId, loadSavedEvents]);

  const handleUnsaveEvent = async (eventId: string) => {
    if (!user?.userId) return;

    try {
      await userService.unsaveEvent(user.userId, eventId);
      setSavedEvents(prev => prev.filter(event => event.eventId !== eventId));
      
      if (onEventUnsave) {
        onEventUnsave(eventId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove event');
    }
  };

  const handleCalendarAdd = (event: Event) => {
    if (onCalendarAdd) {
      onCalendarAdd(event);
    }
  };

  // Get unique categories for filter dropdown
  const categories = Array.from(new Set(savedEvents.map(event => event.category))).sort();

  // Filter and sort events
  const filteredAndSortedEvents = savedEvents
    .filter(event => {
      const matchesSearch = searchTerm === '' || 
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = filterCategory === '' || event.category === filterCategory;
      
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return a.startDateTime.getTime() - b.startDateTime.getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        case 'category':
          return a.category.localeCompare(b.category);
        default:
          return 0;
      }
    });

  if (loading) {
    return (
      <div className="saved-events">
        <div className="loading-spinner">Loading saved events...</div>
      </div>
    );
  }

  return (
    <div className="saved-events">
      <div className="saved-events-header">
        <h2>Saved Events</h2>
        <div className="events-count">
          {savedEvents.length} event{savedEvents.length !== 1 ? 's' : ''} saved
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {savedEvents.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <h3>No Saved Events</h3>
          <p>You haven't saved any events yet. Start exploring events and save the ones you're interested in!</p>
        </div>
      ) : (
        <>
          {/* Search and Filter Controls */}
          <div className="saved-events-controls">
            <div className="search-control">
              <input
                type="text"
                placeholder="Search saved events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="filter-controls">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="filter-select"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'title' | 'category')}
                className="sort-select"
              >
                <option value="date">Sort by Date</option>
                <option value="title">Sort by Title</option>
                <option value="category">Sort by Category</option>
              </select>
            </div>
          </div>

          {/* Events List */}
          <div className="saved-events-list">
            {filteredAndSortedEvents.length === 0 ? (
              <div className="no-results">
                <p>No events match your search criteria.</p>
              </div>
            ) : (
              filteredAndSortedEvents.map(event => {
                // Convert Event to SearchEvent for EventCard compatibility
                const searchEvent = {
                  eventId: event.eventId,
                  title: event.title,
                  description: event.description,
                  startDateTime: event.startDateTime.toISOString(),
                  endDateTime: event.endDateTime.toISOString(),
                  location: {
                    venue: event.location.venue,
                    address: event.location.address,
                    city: event.location.city,
                    state: event.location.state,
                  },
                  relevanceScore: 1.0, // Default high relevance for saved events
                  source: event.source?.type || 'user-submitted',
                  isUserSubmitted: !!event.createdBy,
                  isSaved: true,
                };
                
                return (
                <div key={event.eventId} className="saved-event-item">
                  <EventCard
                    event={searchEvent}
                    onSave={() => handleUnsaveEvent(event.eventId)}
                    onCalendarAdd={() => handleCalendarAdd(event)}
                  />
                  <div className="saved-event-actions">
                    <button
                      className="unsave-button"
                      onClick={() => handleUnsaveEvent(event.eventId)}
                      title="Remove from saved events"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )})
            )}
          </div>

          {/* Summary Stats */}
          <div className="saved-events-stats">
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">{savedEvents.length}</div>
                <div className="stat-label">Total Saved</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{categories.length}</div>
                <div className="stat-label">Categories</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">
                  {savedEvents.filter(event => event.startDateTime > new Date()).length}
                </div>
                <div className="stat-label">Upcoming</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">
                  {savedEvents.filter(event => event.price.isFree).length}
                </div>
                <div className="stat-label">Free Events</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SavedEvents;