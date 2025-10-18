import React from 'react';
import './ErrorComponents.css';

interface ErrorMessageProps {
  error?: string | Error | null;
  title?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  variant?: 'error' | 'warning' | 'info';
  className?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  error,
  title = 'Error',
  onRetry,
  onDismiss,
  variant = 'error',
  className = '',
}) => {
  if (!error) return null;

  const errorMessage = typeof error === 'string' ? error : error.message;

  return (
    <div className={`error-message ${variant} ${className}`}>
      <div className="error-message-content">
        <div className="error-message-header">
          <h4>{title}</h4>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="error-dismiss-button"
              aria-label="Dismiss error"
            >
              ×
            </button>
          )}
        </div>
        <p className="error-message-text">{errorMessage}</p>
        {onRetry && (
          <div className="error-message-actions">
            <button onClick={onRetry} className="error-retry-button">
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

interface ErrorToastProps {
  error: string | Error;
  duration?: number;
  onClose?: () => void;
}

export const ErrorToast: React.FC<ErrorToastProps> = ({
  error,
  duration = 5000,
  onClose,
}) => {
  React.useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const errorMessage = typeof error === 'string' ? error : error.message;

  return (
    <div className="error-toast">
      <div className="error-toast-content">
        <span className="error-toast-message">{errorMessage}</span>
        {onClose && (
          <button
            onClick={onClose}
            className="error-toast-close"
            aria-label="Close notification"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};