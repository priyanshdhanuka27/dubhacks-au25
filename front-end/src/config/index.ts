// Frontend configuration

export const config = {
  // API configuration
  api: {
    baseUrl: process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api',
    timeout: parseInt(process.env.REACT_APP_API_TIMEOUT || '10000'),
  },
  
  // Authentication configuration
  auth: {
    tokenKey: 'eventsync_token',
    refreshTokenKey: 'eventsync_refresh_token',
    userKey: 'eventsync_user',
  },
  
  // Search configuration
  search: {
    debounceMs: parseInt(process.env.REACT_APP_SEARCH_DEBOUNCE_MS || '300'),
    maxResults: parseInt(process.env.REACT_APP_SEARCH_MAX_RESULTS || '50'),
    defaultRadius: parseInt(process.env.REACT_APP_DEFAULT_SEARCH_RADIUS || '25'),
  },
  
  // Calendar configuration
  calendar: {
    supportedApps: ['google', 'outlook', 'apple', 'yahoo'] as const,
    defaultTimeZone: process.env.REACT_APP_DEFAULT_TIMEZONE || 'America/New_York',
  },
  
  // UI configuration
  ui: {
    itemsPerPage: parseInt(process.env.REACT_APP_ITEMS_PER_PAGE || '20'),
    toastDuration: parseInt(process.env.REACT_APP_TOAST_DURATION || '5000'),
  },
  
  // Feature flags
  features: {
    enableUserSubmissions: process.env.REACT_APP_ENABLE_USER_SUBMISSIONS !== 'false',
    enableSavedEvents: process.env.REACT_APP_ENABLE_SAVED_EVENTS !== 'false',
    enableNotifications: process.env.REACT_APP_ENABLE_NOTIFICATIONS !== 'false',
  },
  
  // Environment
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
};

// Validate required environment variables
export function validateConfig(): void {
  const requiredVars = [
    'REACT_APP_API_BASE_URL',
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0 && config.isProduction) {
    console.error('Missing required environment variables:', missingVars);
  }
}