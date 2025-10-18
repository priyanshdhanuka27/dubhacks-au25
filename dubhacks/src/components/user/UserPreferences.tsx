import React, { useState, useEffect, useCallback } from 'react';
import { UserPreferences as UserPreferencesType, PriceRange, NotificationSettings } from '../../types';
import { userService } from '../../services/userService';
import { useAuth } from '../../contexts/AuthContext';
import './UserComponents.css';

interface UserPreferencesProps {
  onPreferencesUpdate?: (preferences: UserPreferencesType) => void;
}

const eventCategories = [
  'Music',
  'Sports',
  'Technology',
  'Business',
  'Arts & Culture',
  'Food & Drink',
  'Health & Wellness',
  'Education',
  'Community',
  'Entertainment',
  'Networking',
  'Outdoor',
  'Family',
  'Fashion',
  'Gaming',
  'Travel',
  'Charity',
  'Religion',
  'Politics',
  'Other'
];

const UserPreferences: React.FC<UserPreferencesProps> = ({ onPreferencesUpdate }) => {
  const { state } = useAuth();
  const { user } = state;
  const [preferences, setPreferences] = useState<UserPreferencesType | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<UserPreferencesType>>({});

  const loadPreferences = useCallback(async () => {
    if (!user?.userId) return;

    try {
      setLoading(true);
      setError(null);
      const preferencesData = await userService.getUserPreferences(user.userId);
      setPreferences(preferencesData);
      setFormData(preferencesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preferences');
    } finally {
      setLoading(false);
    }
  }, [user?.userId]);

  useEffect(() => {
    if (user?.userId) {
      loadPreferences();
    }
  }, [user?.userId, loadPreferences]);

  const handleEdit = () => {
    setIsEditing(true);
    setFormData(preferences || {});
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData(preferences || {});
    setError(null);
  };

  const handleSave = async () => {
    if (!user?.userId || !formData) return;

    try {
      setSaving(true);
      setError(null);
      
      const updatedPreferences = await userService.updateUserPreferences(user.userId, formData);
      setPreferences(updatedPreferences);
      setIsEditing(false);
      
      if (onPreferencesUpdate) {
        onPreferencesUpdate(updatedPreferences);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleCategoryToggle = (category: string) => {
    const currentCategories = formData.eventCategories || [];
    const updatedCategories = currentCategories.includes(category)
      ? currentCategories.filter(c => c !== category)
      : [...currentCategories, category];
    
    setFormData(prev => ({
      ...prev,
      eventCategories: updatedCategories
    }));
  };

  const handlePriceRangeChange = (field: keyof PriceRange, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      priceRange: {
        ...prev.priceRange,
        [field]: field === 'currency' ? value : Number(value)
      } as PriceRange
    }));
  };

  const handleNotificationChange = (field: keyof NotificationSettings, value: boolean | number) => {
    setFormData(prev => ({
      ...prev,
      notificationSettings: {
        ...prev.notificationSettings,
        [field]: value
      } as NotificationSettings
    }));
  };

  const handleMaxDistanceChange = (value: string) => {
    const numValue = Number(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setFormData(prev => ({
        ...prev,
        maxDistance: numValue
      }));
    }
  };

  if (loading) {
    return (
      <div className="user-preferences">
        <div className="loading-spinner">Loading preferences...</div>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="user-preferences">
        <div className="error-message">Preferences not found</div>
      </div>
    );
  }

  return (
    <div className="user-preferences">
      <div className="preferences-header">
        <h2>User Preferences</h2>
        {!isEditing && (
          <button className="edit-button" onClick={handleEdit}>
            Edit Preferences
          </button>
        )}
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="preferences-content">
        {/* Event Categories */}
        <div className="preferences-section">
          <h3>Event Categories</h3>
          <p className="section-description">
            Select the types of events you're interested in to get personalized recommendations.
          </p>
          
          <div className="categories-grid">
            {eventCategories.map(category => (
              <label key={category} className="category-checkbox">
                <input
                  type="checkbox"
                  checked={(formData.eventCategories || []).includes(category)}
                  onChange={() => handleCategoryToggle(category)}
                  disabled={!isEditing}
                />
                <span className="category-label">{category}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Location Preferences */}
        <div className="preferences-section">
          <h3>Location Preferences</h3>
          
          <div className="form-group">
            <label>Maximum Distance (miles)</label>
            <p className="field-description">
              How far are you willing to travel for events?
            </p>
            {isEditing ? (
              <input
                type="number"
                min="1"
                max="500"
                value={formData.maxDistance || ''}
                onChange={(e) => handleMaxDistanceChange(e.target.value)}
                placeholder="Enter maximum distance"
              />
            ) : (
              <span className="preference-value">{preferences.maxDistance} miles</span>
            )}
          </div>
        </div>

        {/* Price Range */}
        <div className="preferences-section">
          <h3>Price Range</h3>
          <p className="section-description">
            Set your preferred price range for events.
          </p>
          
          <div className="form-row">
            <div className="form-group">
              <label>Minimum Price</label>
              {isEditing ? (
                <input
                  type="number"
                  min="0"
                  value={formData.priceRange?.min || ''}
                  onChange={(e) => handlePriceRangeChange('min', e.target.value)}
                  placeholder="Min price"
                />
              ) : (
                <span className="preference-value">
                  ${preferences.priceRange.min} {preferences.priceRange.currency}
                </span>
              )}
            </div>

            <div className="form-group">
              <label>Maximum Price</label>
              {isEditing ? (
                <input
                  type="number"
                  min="0"
                  value={formData.priceRange?.max || ''}
                  onChange={(e) => handlePriceRangeChange('max', e.target.value)}
                  placeholder="Max price"
                />
              ) : (
                <span className="preference-value">
                  ${preferences.priceRange.max} {preferences.priceRange.currency}
                </span>
              )}
            </div>

            <div className="form-group">
              <label>Currency</label>
              {isEditing ? (
                <select
                  value={formData.priceRange?.currency || 'USD'}
                  onChange={(e) => handlePriceRangeChange('currency', e.target.value)}
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="CAD">CAD</option>
                </select>
              ) : (
                <span className="preference-value">{preferences.priceRange.currency}</span>
              )}
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="preferences-section">
          <h3>Notification Settings</h3>
          <p className="section-description">
            Choose how you'd like to be notified about events and updates.
          </p>
          
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.notificationSettings?.emailNotifications ?? false}
                onChange={(e) => handleNotificationChange('emailNotifications', e.target.checked)}
                disabled={!isEditing}
              />
              <span>Email Notifications</span>
            </label>
            <p className="field-description">
              Receive email updates about new events and recommendations.
            </p>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.notificationSettings?.pushNotifications ?? false}
                onChange={(e) => handleNotificationChange('pushNotifications', e.target.checked)}
                disabled={!isEditing}
              />
              <span>Push Notifications</span>
            </label>
            <p className="field-description">
              Receive push notifications on your device.
            </p>
          </div>

          <div className="form-group">
            <label>Event Reminder Time</label>
            <p className="field-description">
              How many minutes before an event would you like to be reminded?
            </p>
            {isEditing ? (
              <select
                value={formData.notificationSettings?.reminderTime || 60}
                onChange={(e) => handleNotificationChange('reminderTime', Number(e.target.value))}
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={120}>2 hours</option>
                <option value={1440}>1 day</option>
                <option value={2880}>2 days</option>
                <option value={10080}>1 week</option>
              </select>
            ) : (
              <span className="preference-value">
                {preferences.notificationSettings.reminderTime >= 1440 
                  ? `${Math.floor(preferences.notificationSettings.reminderTime / 1440)} day(s)`
                  : preferences.notificationSettings.reminderTime >= 60
                  ? `${Math.floor(preferences.notificationSettings.reminderTime / 60)} hour(s)`
                  : `${preferences.notificationSettings.reminderTime} minutes`
                }
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {isEditing && (
          <div className="preferences-actions">
            <button 
              className="save-button" 
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
            <button 
              className="cancel-button" 
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserPreferences;