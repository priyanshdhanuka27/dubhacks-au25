import React, { useState } from 'react';
import { SearchEvent, SearchFilters } from '../../types';
import { EventCard } from './EventCard';
import { FilterPanel } from './FilterPanel';
import './SearchComponents.css';

interface EventFeedProps {
  events: SearchEvent[];
  loading?: boolean;
  error?: string | null;
  onLoadMore?: () => void;
  hasMore?: boolean;
  onEventSave?: (eventId: string) => void;
  onEventCalendarAdd?: (event: SearchEvent) => void;
  showFilters?: boolean;
  filters?: SearchFilters;
  onFiltersChange?: (filters: SearchFilters) => void;
  emptyMessage?: string;
}

export const EventFeed: React.FC<EventFeedProps> = ({
  events,
  loading = false,
  error = null,
  onLoadMore,
  hasMore = false,
  onEventSave,
  onEventCalendarAdd,
  showFilters = false,
  filters,
  onFiltersChange,
  emptyMessage = 'No events found',
}) => {
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'distance'>('relevance');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const sortedEvents = React.useMemo(() => {
    const sorted = [...events];
    
    switch (sortBy) {
      case 'date':
        return sorted.sort((a, b) => 
          new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
        );
      case 'relevance':
        return sorted.sort((a, b) => b.relevanceScore - a.relevanceScore);
      case 'distance':
        // For now, just sort by relevance since we don't have distance data
        return sorted.sort((a, b) => b.relevanceScore - a.relevanceScore);
      default:
        return sorted;
    }
  }, [events, sortBy]);

  if (error) {
    return (
      <div className="event-feed-error">
        <div className="error-icon">⚠️</div>
        <h3>Something went wrong</h3>
        <p>{error}</p>
        <button onClick={() => window.location.reload()} className="retry-btn">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="event-feed">
      {showFilters && filters && onFiltersChange && (
        <FilterPanel 
          filters={filters}
          onFiltersChange={onFiltersChange}
        />
      )}

      <div className="feed-controls">
        <div className="results-info">
          {events.length > 0 && (
            <span>{events.length} event{events.length !== 1 ? 's' : ''} found</span>
          )}
        </div>

        <div className="feed-actions">
          <div className="sort-controls">
            <label htmlFor="sort-select">Sort by:</label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="sort-select"
            >
              <option value="relevance">Relevance</option>
              <option value="date">Date</option>
              <option value="distance">Distance</option>
            </select>
          </div>

          <div className="view-controls">
            <button
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              ⊞
            </button>
            <button
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {loading && events.length === 0 ? (
        <div className="feed-loading">
          <div className="loading-spinner"></div>
          <p>Finding events for you...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="feed-empty">
          <div className="empty-icon">🔍</div>
          <h3>No events found</h3>
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <>
          <div className={`events-container ${viewMode}`}>
            {sortedEvents.map((event) => (
              <EventCard
                key={event.eventId}
                event={event}
                onSave={onEventSave}
                onCalendarAdd={onEventCalendarAdd}
                viewMode={viewMode}
              />
            ))}
          </div>

          {loading && (
            <div className="feed-loading-more">
              <div className="loading-spinner small"></div>
              <span>Loading more events...</span>
            </div>
          )}

          {hasMore && !loading && onLoadMore && (
            <div className="load-more-container">
              <button onClick={onLoadMore} className="load-more-btn">
                Load More Events
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};