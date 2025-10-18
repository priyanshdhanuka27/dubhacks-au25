import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { RegisterData } from '../../types';
import './AuthForms.css';

interface RegisterFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

// Common timezones for the dropdown
const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'UTC', label: 'UTC' },
];

export function RegisterForm({ onSuccess, onSwitchToLogin }: RegisterFormProps) {
  const { register, state, clearError } = useAuth();
  const [formData, setFormData] = useState<RegisterData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    timezone: 'America/New_York', // Default to Eastern Time
  });
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear errors when user starts typing
    if (formErrors.length > 0) {
      setFormErrors([]);
    }
    if (state.error) {
      clearError();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors([]);

    // Client-side validation
    const errors: string[] = [];
    
    if (!formData.email.trim()) {
      errors.push('Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.push('Please enter a valid email address');
    }

    if (!formData.password) {
      errors.push('Password is required');
    } else if (formData.password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.push('Password must contain at least one uppercase letter, one lowercase letter, and one number');
    }

    if (formData.password !== formData.confirmPassword) {
      errors.push('Passwords do not match');
    }

    if (!formData.firstName.trim()) {
      errors.push('First name is required');
    } else if (formData.firstName.trim().length < 2) {
      errors.push('First name must be at least 2 characters long');
    }

    if (!formData.lastName.trim()) {
      errors.push('Last name is required');
    } else if (formData.lastName.trim().length < 2) {
      errors.push('Last name must be at least 2 characters long');
    }

    if (!formData.timezone) {
      errors.push('Please select a timezone');
    }

    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      const result = await register(formData);
      if (result.success && onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Registration form error:', error);
    }
  };

  const displayErrors = formErrors.length > 0 ? formErrors : (state.error ? [state.error] : []);

  return (
    <div className="auth-form-container">
      <form onSubmit={handleSubmit} className="auth-form">
        <h2 className="auth-form-title">Create Account</h2>
        
        {displayErrors.length > 0 && (
          <div className="auth-form-errors">
            {displayErrors.map((error, index) => (
              <div key={index} className="auth-form-error">
                {error}
              </div>
            ))}
          </div>
        )}

        <div className="auth-form-row">
          <div className="auth-form-group">
            <label htmlFor="firstName" className="auth-form-label">
              First Name
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              className="auth-form-input"
              placeholder="Enter your first name"
              required
              autoComplete="given-name"
            />
          </div>

          <div className="auth-form-group">
            <label htmlFor="lastName" className="auth-form-label">
              Last Name
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              className="auth-form-input"
              placeholder="Enter your last name"
              required
              autoComplete="family-name"
            />
          </div>
        </div>

        <div className="auth-form-group">
          <label htmlFor="email" className="auth-form-label">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className="auth-form-input"
            placeholder="Enter your email"
            required
            autoComplete="email"
          />
        </div>

        <div className="auth-form-group">
          <label htmlFor="timezone" className="auth-form-label">
            Timezone
          </label>
          <select
            id="timezone"
            name="timezone"
            value={formData.timezone}
            onChange={handleInputChange}
            className="auth-form-select"
            required
          >
            {COMMON_TIMEZONES.map(tz => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>

        <div className="auth-form-group">
          <label htmlFor="password" className="auth-form-label">
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            className="auth-form-input"
            placeholder="Create a password"
            required
            autoComplete="new-password"
          />
          <div className="auth-form-hint">
            Password must be at least 8 characters with uppercase, lowercase, and number
          </div>
        </div>

        <div className="auth-form-group">
          <label htmlFor="confirmPassword" className="auth-form-label">
            Confirm Password
          </label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            className="auth-form-input"
            placeholder="Confirm your password"
            required
            autoComplete="new-password"
          />
        </div>

        <button
          type="submit"
          className="auth-form-submit"
          disabled={state.loading}
        >
          {state.loading ? 'Creating Account...' : 'Create Account'}
        </button>

        {onSwitchToLogin && (
          <div className="auth-form-switch">
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="auth-form-switch-button"
              >
                Sign In
              </button>
            </p>
          </div>
        )}
      </form>
    </div>
  );
}