import { useState, useCallback } from 'react';

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  requestId?: string;
}

export interface ErrorState {
  error: ApiError | null;
  isError: boolean;
  isLoading: boolean;
}

export const useErrorHandler = () => {
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isError: false,
    isLoading: false,
  });

  const setError = useCallback((error: ApiError | Error | string) => {
    let apiError: ApiError;

    if (typeof error === 'string') {
      apiError = {
        code: 'UNKNOWN_ERROR',
        message: error,
        timestamp: new Date().toISOString(),
      };
    } else if (error instanceof Error) {
      apiError = {
        code: 'UNKNOWN_ERROR',
        message: error.message,
        timestamp: new Date().toISOString(),
      };
    } else {
      apiError = error;
    }

    setErrorState({
      error: apiError,
      isError: true,
      isLoading: false,
    });
  }, []);

  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      isError: false,
      isLoading: false,
    });
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setErrorState(prev => ({
      ...prev,
      isLoading: loading,
      ...(loading && { error: null, isError: false }),
    }));
  }, []);

  const handleApiError = useCallback((error: any) => {
    console.error('API Error:', error);

    if (error.response?.data?.error) {
      // Handle structured API error response
      setError(error.response.data.error);
    } else if (error.response?.status) {
      // Handle HTTP error without structured response
      const statusCode = error.response.status;
      let message = 'An error occurred';

      switch (statusCode) {
        case 400:
          message = 'Invalid request. Please check your input.';
          break;
        case 401:
          message = 'Authentication required. Please log in.';
          break;
        case 403:
          message = 'Access denied. You do not have permission.';
          break;
        case 404:
          message = 'Resource not found.';
          break;
        case 409:
          message = 'Conflict. Resource already exists.';
          break;
        case 429:
          message = 'Too many requests. Please try again later.';
          break;
        case 500:
          message = 'Server error. Please try again later.';
          break;
        case 502:
          message = 'Service temporarily unavailable.';
          break;
        case 503:
          message = 'Service unavailable. Please try again later.';
          break;
        default:
          message = `Request failed with status ${statusCode}`;
      }

      setError({
        code: `HTTP_${statusCode}`,
        message,
        timestamp: new Date().toISOString(),
      });
    } else if (error.code === 'NETWORK_ERROR' || !error.response) {
      // Handle network errors
      setError({
        code: 'NETWORK_ERROR',
        message: 'Network error. Please check your connection and try again.',
        timestamp: new Date().toISOString(),
      });
    } else {
      // Handle unknown errors
      setError({
        code: 'UNKNOWN_ERROR',
        message: error.message || 'An unexpected error occurred',
        timestamp: new Date().toISOString(),
      });
    }
  }, [setError]);

  const executeWithErrorHandling = useCallback(async <T>(
    asyncFunction: () => Promise<T>,
    options?: {
      onSuccess?: (result: T) => void;
      onError?: (error: ApiError) => void;
      showLoading?: boolean;
    }
  ): Promise<T | null> => {
    try {
      if (options?.showLoading !== false) {
        setLoading(true);
      }

      const result = await asyncFunction();
      
      clearError();
      options?.onSuccess?.(result);
      
      return result;
    } catch (error) {
      handleApiError(error);
      
      if (errorState.error) {
        options?.onError?.(errorState.error);
      }
      
      return null;
    } finally {
      if (options?.showLoading !== false) {
        setLoading(false);
      }
    }
  }, [setLoading, clearError, handleApiError, errorState.error]);

  const retry = useCallback(async <T>(
    asyncFunction: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T | null> => {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        setLoading(true);
        const result = await asyncFunction();
        clearError();
        return result;
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          handleApiError(error);
          return null;
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      } finally {
        setLoading(false);
      }
    }

    return null;
  }, [setLoading, clearError, handleApiError]);

  return {
    ...errorState,
    setError,
    clearError,
    setLoading,
    handleApiError,
    executeWithErrorHandling,
    retry,
  };
};