export interface User {
    userId: string;
    email: string;
    passwordHash: string;
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
    reminderTime: number;
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
export interface SearchFilters {
    dateRange?: DateRange;
    location?: LocationFilter;
    categories?: string[];
    priceRange?: PriceRange;
    distance?: number;
}
export interface DateRange {
    startDate: Date;
    endDate: Date;
}
export interface LocationFilter {
    city?: string;
    state?: string;
    zipCode?: string;
    coordinates?: Coordinates;
    radius?: number;
}
export interface RAGResponse {
    events: Event[];
    relevanceScores: number[];
    totalResults: number;
    query: string;
}
export interface CalendarEvent {
    title: string;
    description: string;
    startDateTime: Date;
    endDateTime: Date;
    location: string;
    organizer?: string;
    url?: string;
}
export interface UserCredentials {
    email: string;
    password: string;
}
export interface UserRegistration {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    timezone: string;
}
export interface AuthToken {
    token: string;
    refreshToken: string;
    expiresAt: Date;
    userId: string;
}
export interface AuthResult {
    success: boolean;
    user?: User | Omit<User, 'passwordHash'>;
    token?: AuthToken;
    error?: string;
}
export interface EventSubmission {
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
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
}
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
export interface CrawlerAction {
    action: 'start' | 'stop' | 'status';
    crawlerId?: string;
}
export interface CrawlerStatus {
    crawlerId: string;
    status: 'running' | 'stopped' | 'error';
    lastCrawl?: Date;
    documentsIndexed: number;
    errors?: string[];
}
export interface EventDocument {
    content: string;
    metadata: {
        url: string;
        title: string;
        crawlDate: Date;
        eventData?: Partial<Event>;
    };
}
export interface ErrorContext {
    userId?: string;
    endpoint?: string;
    timestamp: Date;
    requestId?: string;
}
export interface ErrorResponse {
    error: string;
    message: string;
    statusCode: number;
    timestamp: Date;
    requestId?: string;
}
//# sourceMappingURL=index.d.ts.map