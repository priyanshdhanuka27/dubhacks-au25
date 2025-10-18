// Shared TypeScript interfaces for EventSync Frontend

export interface User {
  userId: string;
  email: string;
  profile: UserProfile;
  preferences: UserPreferences;
  savedEvents: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  location?: Location;
  interests: string[];
  timezone: string;
}

export interface UserPreferences {
  eventCategories: string[];
  maxDistance: number;
  priceRange: PriceRange;
  notificationSettings: NotificationSettings;
}

export interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  reminderTime: number; // minutes before event
}

export interface Event {
  eventId: string;
  title: string;
  description: string;
  startDateTime: Date;
  endDateTime: Date;
  location: Location;
  organizer: Organizer;
  category: string;
  price: Price;
  tags: string[];
  source: EventSource;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Location {
  venue: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  coordinates: Coordinates;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Organizer {
  name: string;
  email?: string;
  website?: string;
  phone?: string;
}

export interface Price {
  amount: number;
  currency: string;
  isFree: boolean;
}

export interface PriceRange {
  min: number;
  max: number;
  currency: string;
}

export interface EventSource {
  type: 'crawled' | 'user_submitted';
  url?: string;
  crawlDate?: Date;
}

// Search related interfaces
export interface SearchFilters {
  dateRange?: DateRange;
  location?: LocationFilter;
  categories?: string[];
  priceRange?: PriceRange;
  keywords?: string[];
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface LocationFilter {
  city?: string;
  state?: string;
  radius?: number;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface SearchResult {
  events: SearchEvent[];
  totalResults: number;
  query: string;
  filters?: SearchFilters;
}

export interface SearchEvent {
  eventId: string;
  title: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  location: {
    venue: string;
    address: string;
    city: string;
    state: string;
  };
  relevanceScore: number;
  source: string;
  isUserSubmitted?: boolean;
  isSaved?: boolean;
}

export interface RAGResponse {
  answer: string;
  sources: Array<{
    title: string;
    url: string;
    excerpt: string;
    relevanceScore: number;
  }>;
  sessionId?: string;
}

export interface ConversationalSearchRequest {
  query: string;
  sessionId?: string;
}

export interface SemanticSearchRequest {
  query: string;
  filters?: SearchFilters;
}

export interface PersonalizedFeedOptions {
  maxResults?: number;
  includeUserSubmitted?: boolean;
  boostSavedEvents?: boolean;
}

// Authentication interfaces
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  timezone: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

// Event submission interfaces
export interface EventFormData {
  title: string;
  description: string;
  startDateTime: Date;
  endDateTime: Date;
  location: Location;
  organizer: Organizer;
  category: string;
  price: Price;
  tags: string[];
}

// Calendar interfaces
export interface CalendarEvent {
  title: string;
  description: string;
  startDateTime: Date;
  endDateTime: Date;
  location: string;
  organizer?: string;
  url?: string;
}

// API Response interfaces
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// UI Component interfaces
export interface EventCardProps {
  event: Event;
  onSave?: (eventId: string) => void;
  onCalendarAdd?: (event: Event) => void;
  isSaved?: boolean;
}

export interface SearchBarProps {
  onSearch: (query: string, filters?: SearchFilters) => void;
  loading?: boolean;
  placeholder?: string;
}

export interface FilterPanelProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  categories: string[];
}

export interface EventFeedProps {
  events: Event[];
  loading?: boolean;
  error?: string | null;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

// Form validation interfaces
export interface ValidationError {
  field: string;
  message: string;
}

export interface FormState<T> {
  data: T;
  errors: ValidationError[];
  isValid: boolean;
  isSubmitting: boolean;
}

// Route interfaces
export interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

// Theme interfaces
export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    error: string;
    success: string;
    warning: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  breakpoints: {
    mobile: string;
    tablet: string;
    desktop: string;
  };
}