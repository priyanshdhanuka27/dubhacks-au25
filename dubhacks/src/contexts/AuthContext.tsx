import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { authService, AuthResult } from '../services/authService';
import { User, LoginCredentials, RegisterData, AuthState } from '../types';

// Auth Actions
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_LOADING'; payload: boolean };

// Auth Context Interface
interface AuthContextType {
  state: AuthState;
  login: (credentials: LoginCredentials) => Promise<AuthResult>;
  register: (userData: RegisterData) => Promise<AuthResult>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<AuthResult>;
  clearError: () => void;
  isAuthenticated: boolean;
}

// Initial state
const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  loading: true, // Start with loading true to check stored auth
  error: null,
};

// Auth reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        loading: true,
        error: null,
      };

    case 'AUTH_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        loading: false,
        error: null,
      };

    case 'AUTH_FAILURE':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
        error: action.payload,
      };

    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
        error: null,
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };

    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };

    default:
      return state;
  }
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth Provider Props
interface AuthProviderProps {
  children: ReactNode;
}

// Auth Provider Component
export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for stored authentication on mount
  useEffect(() => {
    const checkStoredAuth = () => {
      try {
        const token = authService.getStoredToken();
        const user = authService.getCurrentUser();

        if (token && user) {
          dispatch({
            type: 'AUTH_SUCCESS',
            payload: { user, token }
          });
        } else {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } catch (error) {
        console.error('Error checking stored auth:', error);
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    checkStoredAuth();
  }, []);

  // Login function
  const login = async (credentials: LoginCredentials): Promise<AuthResult> => {
    dispatch({ type: 'AUTH_START' });

    try {
      // Validate credentials
      const validation = authService.validateLoginCredentials(credentials);
      if (!validation.isValid) {
        const error = validation.errors.join(', ');
        dispatch({ type: 'AUTH_FAILURE', payload: error });
        return { success: false, error };
      }

      // Attempt login
      const result = await authService.login(credentials);

      if (result.success && result.user && result.token) {
        dispatch({
          type: 'AUTH_SUCCESS',
          payload: {
            user: result.user,
            token: result.token.token
          }
        });
      } else {
        dispatch({
          type: 'AUTH_FAILURE',
          payload: result.error || 'Login failed'
        });
      }

      return result;
    } catch (error) {
      const errorMessage = 'An unexpected error occurred during login';
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  };

  // Register function
  const register = async (userData: RegisterData): Promise<AuthResult> => {
    dispatch({ type: 'AUTH_START' });

    try {
      // Validate registration data
      const validation = authService.validateRegistrationData(userData);
      if (!validation.isValid) {
        const error = validation.errors.join(', ');
        dispatch({ type: 'AUTH_FAILURE', payload: error });
        return { success: false, error };
      }

      // Attempt registration
      const result = await authService.register(userData);

      if (result.success && result.user && result.token) {
        dispatch({
          type: 'AUTH_SUCCESS',
          payload: {
            user: result.user,
            token: result.token.token
          }
        });
      } else {
        dispatch({
          type: 'AUTH_FAILURE',
          payload: result.error || 'Registration failed'
        });
      }

      return result;
    } catch (error) {
      const errorMessage = 'An unexpected error occurred during registration';
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      dispatch({ type: 'LOGOUT' });
    }
  };

  // Refresh token function
  const refreshToken = async (): Promise<AuthResult> => {
    try {
      const result = await authService.refreshToken();

      if (result.success && result.user && result.token) {
        dispatch({
          type: 'AUTH_SUCCESS',
          payload: {
            user: result.user,
            token: result.token.token
          }
        });
      } else {
        dispatch({ type: 'LOGOUT' });
      }

      return result;
    } catch (error) {
      dispatch({ type: 'LOGOUT' });
      return { success: false, error: 'Token refresh failed' };
    }
  };

  // Clear error function
  const clearError = (): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // Context value
  const contextValue: AuthContextType = {
    state,
    login,
    register,
    logout,
    refreshToken,
    clearError,
    isAuthenticated: state.isAuthenticated,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}