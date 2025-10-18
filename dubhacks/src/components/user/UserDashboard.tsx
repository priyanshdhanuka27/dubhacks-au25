import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile as UserProfileType, UserPreferences as UserPreferencesType, Event } from '../../types';
import { userService, CompleteUserProfile } from '../../services/userService';
import { useAuth } from '../../contexts/AuthContext';
import UserProfile from './UserProfile';
import UserPreferences from './UserPreferences';
import SavedEvents from './SavedEvents';
import './UserComponents.css';

interface UserDashboardProps {
  onCalendarAdd?: (event: Event) => void;
}

type ActiveTab = 'overview' | 'profile' | 'preferences' | 'saved-events';

const UserDashboard: React.FC<UserDashboardProps> = ({ onCalendarAdd }) => {
  const { state } = useAuth();
  const { user } = state;
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [completeProfile, setCompleteProfile] = useState<CompleteUserProfile | null>(null);
  const [recommendations, setRecommendations] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    if (!user?.userId) return;

    try {
      setLoading(true);
      setError(null);
      
      const [profileData, recommendationsData] = await Promise.all([
        userService.getCompleteUserProfile(user.userId),
        userService.getPersonalizedRecommendations(user.userId, 6)
      ]);
      
      setCompleteProfile(profileData);
      setRecommendations(recommendationsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [user?.userId]);

  useEffect(() => {
    if (user?.userId) {
      loadDashboardData();
    }
  }, [user?.userId, loadDashboardData]);

  const handleProfileUpdate = (profile: UserProfileType) => {
    if (completeProfile) {
      setCompleteProfile({
        ...completeProfile,
        profile
      });
    }
  };

  const handlePreferencesUpdate = (preferences: UserPreferencesType) => {
    if (completeProfile) {
      setCompleteProfile({
        ...completeProfile,
        preferences
      });
    }
    // Reload recommendations when preferences change
    loadRecommendations();
  };

  const loadRecommendations = async () => {
    if (!user?.userId) return;
    
    try {
      const recommendationsData = await userService.getPersonalizedRecommendations(user.userId, 6);
      setRecommendations(recommendationsData);
    } catch (err) {
      console.error('Failed to reload recommendations:', err);
    }
  };

  const handleEventUnsave = () => {
    // Reload dashboard data to update saved events count
    loadDashboardData();
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'profile':
        return <UserProfile onProfileUpdate={handleProfileUpdate} />;
      case 'preferences':
        return <UserPreferences onPreferencesUpdate={handlePreferencesUpdate} />;
      case 'saved-events':
        return <SavedEvents onEventUnsave={handleEventUnsave} onCalendarAdd={onCalendarAdd} />;
      default:
        return renderOverview();
    }
  };

  const renderOverview = () => {
    if (loading) {
      return (
        <div className="dashboard-overview">
          <div className="loading-spinner">Loading dashboard...</div>
        </div>
      );
    }

    if (!completeProfile) {
      return (
        <div className="dashboard-overview">
          <div className="error-message">Failed to load profile data</div>
        </div>
      );
    }

    return (
      <div className="dashboard-overview">
        <div className="welcome-section">
          <h2>Welcome back, {completeProfile.profile.firstName}!</h2>
          <p>Here's your personalized event dashboard.</p>
        </div>

        {/* Quick Stats */}
        <div className="quick-stats">
          <div className="stat-card">
            <div className="stat-icon">📅</div>
            <div className="stat-content">
              <div className="stat-number">{completeProfile.savedEventsCount}</div>
              <div className="stat-label">Saved Events</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">🎯</div>
            <div className="stat-content">
              <div className="stat-number">{completeProfile.preferences.eventCategories.length}</div>
              <div className="stat-label">Preferred Categories</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">📍</div>
            <div className="stat-content">
              <div className="stat-number">{completeProfile.preferences.maxDistance}</div>
              <div className="stat-label">Max Distance (mi)</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">✨</div>
            <div className="stat-content">
              <div className="stat-number">{completeProfile.recentActivity.eventsCreated}</div>
              <div className="stat-label">Events Created</div>
            </div>
          </div>
        </div>

        {/* Personalized Recommendations */}
        <div className="recommendations-section">
          <div className="section-header">
            <h3>Recommended for You</h3>
            <button 
              className="refresh-button"
              onClick={loadRecommendations}
              title="Refresh recommendations"
            >
              🔄
            </button>
          </div>
          
          {recommendations.length > 0 ? (
            <div className="recommendations-grid">
              {recommendations.map(event => (
                <div key={event.eventId} className="recommendation-card">
                  <div className="event-info">
                    <h4>{event.title}</h4>
                    <p className="event-date">
                      {event.startDateTime.toLocaleDateString()} at {event.startDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="event-location">{event.location.city}, {event.location.state}</p>
                    <p className="event-category">{event.category}</p>
                  </div>
                  <div className="event-actions">
                    <button 
                      className="save-event-button"
                      onClick={() => handleSaveEvent(event.eventId)}
                    >
                      Save
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-recommendations">
              <p>No recommendations available. Update your preferences to get personalized suggestions!</p>
            </div>
          )}
        </div>

        {/* Profile Summary */}
        <div className="profile-summary">
          <h3>Profile Summary</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <strong>Location:</strong> 
              {completeProfile.profile.location 
                ? `${completeProfile.profile.location.city}, ${completeProfile.profile.location.state}`
                : 'Not specified'
              }
            </div>
            <div className="summary-item">
              <strong>Interests:</strong> 
              {completeProfile.profile.interests.length > 0 
                ? completeProfile.profile.interests.slice(0, 3).join(', ') + (completeProfile.profile.interests.length > 3 ? '...' : '')
                : 'None specified'
              }
            </div>
            <div className="summary-item">
              <strong>Price Range:</strong> 
              ${completeProfile.preferences.priceRange.min} - ${completeProfile.preferences.priceRange.max} {completeProfile.preferences.priceRange.currency}
            </div>
            <div className="summary-item">
              <strong>Notifications:</strong> 
              {completeProfile.preferences.notificationSettings.emailNotifications ? 'Email enabled' : 'Email disabled'}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleSaveEvent = async (eventId: string) => {
    if (!user?.userId) return;

    try {
      await userService.saveEvent(user.userId, eventId);
      // Reload dashboard data to update saved events count
      loadDashboardData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save event');
    }
  };

  return (
    <div className="user-dashboard">
      {/* Tab Navigation */}
      <div className="dashboard-tabs">
        <button
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          Profile
        </button>
        <button
          className={`tab-button ${activeTab === 'preferences' ? 'active' : ''}`}
          onClick={() => setActiveTab('preferences')}
        >
          Preferences
        </button>
        <button
          className={`tab-button ${activeTab === 'saved-events' ? 'active' : ''}`}
          onClick={() => setActiveTab('saved-events')}
        >
          Saved Events
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Tab Content */}
      <div className="dashboard-content">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default UserDashboard;