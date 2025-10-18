import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile as UserProfileType, Location } from '../../types';
import { userService } from '../../services/userService';
import { useAuth } from '../../contexts/AuthContext';
import './UserComponents.css';

interface UserProfileProps {
  onProfileUpdate?: (profile: UserProfileType) => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ onProfileUpdate }) => {
  const { state } = useAuth();
  const { user } = state;
  const [profile, setProfile] = useState<UserProfileType | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<UserProfileType>>({});

  const loadProfile = useCallback(async () => {
    if (!user?.userId) return;

    try {
      setLoading(true);
      setError(null);
      const profileData = await userService.getUserProfile(user.userId);
      setProfile(profileData);
      setFormData(profileData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [user?.userId]);

  useEffect(() => {
    if (user?.userId) {
      loadProfile();
    }
  }, [user?.userId, loadProfile]);

  const handleEdit = () => {
    setIsEditing(true);
    setFormData(profile || {});
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData(profile || {});
    setError(null);
  };

  const handleSave = async () => {
    if (!user?.userId || !formData) return;

    try {
      setSaving(true);
      setError(null);
      
      const updatedProfile = await userService.updateUserProfile(user.userId, formData);
      setProfile(updatedProfile);
      setIsEditing(false);
      
      if (onProfileUpdate) {
        onProfileUpdate(updatedProfile);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof UserProfileType, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLocationChange = (field: keyof Location, value: string) => {
    setFormData(prev => ({
      ...prev,
      location: {
        ...prev.location,
        [field]: value
      } as Location
    }));
  };

  const handleCoordinatesChange = (field: 'latitude' | 'longitude', value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    setFormData(prev => ({
      ...prev,
      location: {
        ...prev.location,
        coordinates: {
          ...prev.location?.coordinates,
          [field]: numValue
        }
      } as Location
    }));
  };

  const handleInterestsChange = (value: string) => {
    const interests = value.split(',').map(interest => interest.trim()).filter(Boolean);
    handleInputChange('interests', interests);
  };

  if (loading) {
    return (
      <div className="user-profile">
        <div className="loading-spinner">Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="user-profile">
        <div className="error-message">Profile not found</div>
      </div>
    );
  }

  return (
    <div className="user-profile">
      <div className="profile-header">
        <h2>User Profile</h2>
        {!isEditing && (
          <button className="edit-button" onClick={handleEdit}>
            Edit Profile
          </button>
        )}
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="profile-content">
        {/* Basic Information */}
        <div className="profile-section">
          <h3>Basic Information</h3>
          
          <div className="form-group">
            <label>First Name</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.firstName || ''}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                placeholder="Enter first name"
              />
            ) : (
              <span className="profile-value">{profile.firstName}</span>
            )}
          </div>

          <div className="form-group">
            <label>Last Name</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.lastName || ''}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                placeholder="Enter last name"
              />
            ) : (
              <span className="profile-value">{profile.lastName}</span>
            )}
          </div>

          <div className="form-group">
            <label>Timezone</label>
            {isEditing ? (
              <select
                value={formData.timezone || ''}
                onChange={(e) => handleInputChange('timezone', e.target.value)}
              >
                <option value="">Select timezone</option>
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
                <option value="America/Anchorage">Alaska Time</option>
                <option value="Pacific/Honolulu">Hawaii Time</option>
              </select>
            ) : (
              <span className="profile-value">{profile.timezone}</span>
            )}
          </div>

          <div className="form-group">
            <label>Interests</label>
            {isEditing ? (
              <textarea
                value={formData.interests?.join(', ') || ''}
                onChange={(e) => handleInterestsChange(e.target.value)}
                placeholder="Enter interests separated by commas (e.g., music, sports, technology)"
                rows={3}
              />
            ) : (
              <div className="interests-list">
                {profile.interests.length > 0 ? (
                  profile.interests.map((interest, index) => (
                    <span key={index} className="interest-tag">
                      {interest}
                    </span>
                  ))
                ) : (
                  <span className="profile-value">No interests specified</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Location Information */}
        <div className="profile-section">
          <h3>Location</h3>
          
          {isEditing ? (
            <>
              <div className="form-group">
                <label>Venue/Building</label>
                <input
                  type="text"
                  value={formData.location?.venue || ''}
                  onChange={(e) => handleLocationChange('venue', e.target.value)}
                  placeholder="Enter venue or building name"
                />
              </div>

              <div className="form-group">
                <label>Address</label>
                <input
                  type="text"
                  value={formData.location?.address || ''}
                  onChange={(e) => handleLocationChange('address', e.target.value)}
                  placeholder="Enter street address"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>City</label>
                  <input
                    type="text"
                    value={formData.location?.city || ''}
                    onChange={(e) => handleLocationChange('city', e.target.value)}
                    placeholder="Enter city"
                  />
                </div>

                <div className="form-group">
                  <label>State</label>
                  <input
                    type="text"
                    value={formData.location?.state || ''}
                    onChange={(e) => handleLocationChange('state', e.target.value)}
                    placeholder="Enter state"
                  />
                </div>

                <div className="form-group">
                  <label>ZIP Code</label>
                  <input
                    type="text"
                    value={formData.location?.zipCode || ''}
                    onChange={(e) => handleLocationChange('zipCode', e.target.value)}
                    placeholder="Enter ZIP code"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.location?.coordinates?.latitude || ''}
                    onChange={(e) => handleCoordinatesChange('latitude', e.target.value)}
                    placeholder="Enter latitude"
                  />
                </div>

                <div className="form-group">
                  <label>Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.location?.coordinates?.longitude || ''}
                    onChange={(e) => handleCoordinatesChange('longitude', e.target.value)}
                    placeholder="Enter longitude"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              {profile.location ? (
                <div className="location-display">
                  <div className="location-line">
                    <strong>{profile.location.venue}</strong>
                  </div>
                  <div className="location-line">
                    {profile.location.address}
                  </div>
                  <div className="location-line">
                    {profile.location.city}, {profile.location.state} {profile.location.zipCode}
                  </div>
                  {profile.location.coordinates && (
                    <div className="location-line coordinates">
                      Coordinates: {profile.location.coordinates.latitude.toFixed(6)}, {profile.location.coordinates.longitude.toFixed(6)}
                    </div>
                  )}
                </div>
              ) : (
                <span className="profile-value">No location specified</span>
              )}
            </>
          )}
        </div>

        {/* Action Buttons */}
        {isEditing && (
          <div className="profile-actions">
            <button 
              className="save-button" 
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
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

export default UserProfile;