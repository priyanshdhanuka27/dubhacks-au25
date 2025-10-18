import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LoginCredentials } from '../../types';
import './AuthForms.css';

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
}


export function LoginForm({ onSuccess, onSwitchToRegister }: LoginFormProps) {
  const { login, state, clearError } = useAuth();
  const [formData, setFormData] = useState<LoginCredentials>({
    email: '',
    password: '',
  });
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    }
    if (!formData.password) {
      errors.push('Password is required');
    }

    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      const result = await login(formData);
      if (result.success && onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Login form error:', error);
    }
  };

  const displayErrors = formErrors.length > 0 ? formErrors : (state.error ? [state.error] : []);

  return (
    <div className="auth-form-container">
      <form onSubmit={handleSubmit} className="auth-form">
        <h2 className="auth-form-title">Sign In</h2>
        
        {displayErrors.length > 0 && (
          <div className="auth-form-errors">
            {displayErrors.map((error, index) => (
              <div key={index} className="auth-form-error">
                {error}
              </div>
            ))}
          </div>
        )}

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
            placeholder="Enter your password"
            required
            autoComplete="current-password"
          />
        </div>

        <button
          type="submit"
          className="auth-form-submit"
          disabled={state.loading}
        >
          {state.loading ? 'Signing In...' : 'Sign In'}
        </button>

        {onSwitchToRegister && (
          <div className="auth-form-switch">
            <p>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToRegister}
                className="auth-form-switch-button"
              >
                Sign Up
              </button>
            </p>
          </div>
        )}
      </form>
    </div>
  );
}