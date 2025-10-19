import { Event } from '../types';

/**
 * Featured Events Data
 * 
 * This file contains the featured events that will be displayed on the home page.
 * You can easily edit, add, or remove events here.
 * 
 * To add a new event:
 * 1. Copy an existing event object
 * 2. Change the eventId to be unique
 * 3. Update all the details (title, description, dates, location, etc.)
 * 4. Save the file
 * 
 * Event Categories Available:
 * - Technology, Music, Food & Drink, Business, Cultural, Arts & Culture
 * - Health & Wellness, Entertainment, Sports, Education, Networking
 */

export const FEATURED_EVENTS: Event[] = [
  {
    eventId: 'featured-tech-summit-2025',
    title: 'Seattle Tech Summit 2025',
    description: 'Join industry leaders for a day of innovation, networking, and cutting-edge technology discussions. Featuring keynotes from top tech companies, hands-on workshops, and networking opportunities with Seattle\'s brightest minds in technology.',
    startDateTime: new Date('2025-03-15T09:00:00'),
    endDateTime: new Date('2025-03-15T18:00:00'),
    location: {
      venue: 'Washington State Convention Center',
      address: '705 Pike St',
      city: 'Seattle',
      state: 'WA',
      zipCode: '98101',
      coordinates: { latitude: 47.6062, longitude: -122.3321 }
    },
    organizer: {
      name: 'Seattle Tech Alliance',
      website: 'https://seattletech.org',
      email: 'info@seattletech.org',
      phone: '(206) 555-0100'
    },
    category: 'Technology',
    price: { amount: 150, currency: 'USD', isFree: false },
    tags: ['technology', 'networking', 'innovation', 'startups', 'AI', 'cloud'],
    source: { type: 'crawled', url: 'https://seattletech.org/summit' },
    createdAt: new Date('2025-01-15T10:00:00'),
    updatedAt: new Date('2025-01-15T10:00:00')
  },

  {
    eventId: 'featured-capitol-hill-music-fest',
    title: 'Capitol Hill Music Festival',
    description: 'A celebration of local and international artists featuring indie rock, electronic, and folk music across multiple venues in Capitol Hill. Discover new artists, enjoy food trucks, and experience the vibrant music scene of Seattle.',
    startDateTime: new Date('2025-03-22T14:00:00'),
    endDateTime: new Date('2025-03-22T23:00:00'),
    location: {
      venue: 'Cal Anderson Park',
      address: '1635 11th Ave',
      city: 'Seattle',
      state: 'WA',
      zipCode: '98122',
      coordinates: { latitude: 47.6174, longitude: -122.3140 }
    },
    organizer: {
      name: 'Capitol Hill Events',
      website: 'https://capitolhillevents.com',
      email: 'events@capitolhillevents.com'
    },
    category: 'Music',
    price: { amount: 0, currency: 'USD', isFree: true },
    tags: ['music', 'festival', 'indie', 'local artists', 'outdoor', 'free'],
    source: { type: 'user_submitted' },
    createdAt: new Date('2025-01-10T14:30:00'),
    updatedAt: new Date('2025-01-10T14:30:00')
  },

  {
    eventId: 'featured-pike-place-food-tour',
    title: 'Pike Place Market Food Tour',
    description: 'Discover the culinary treasures of Pike Place Market with guided tastings from local vendors, artisans, and historic establishments. Learn about the market\'s history while sampling the best seafood, produce, and artisanal foods Seattle has to offer.',
    startDateTime: new Date('2025-03-18T11:00:00'),
    endDateTime: new Date('2025-03-18T14:00:00'),
    location: {
      venue: 'Pike Place Market',
      address: '85 Pike St',
      city: 'Seattle',
      state: 'WA',
      zipCode: '98101',
      coordinates: { latitude: 47.6089, longitude: -122.3403 }
    },
    organizer: {
      name: 'Seattle Food Tours',
      website: 'https://seattlefoodtours.com',
      email: 'tours@seattlefoodtours.com',
      phone: '(206) 555-0123'
    },
    category: 'Food & Drink',
    price: { amount: 75, currency: 'USD', isFree: false },
    tags: ['food', 'tour', 'local', 'market', 'seafood', 'guided'],
    source: { type: 'crawled', url: 'https://seattlefoodtours.com/pike-place' },
    createdAt: new Date('2025-01-12T09:15:00'),
    updatedAt: new Date('2025-01-12T09:15:00')
  },

  {
    eventId: 'featured-startup-pitch-night',
    title: 'Startup Pitch Night',
    description: 'Watch emerging startups pitch their innovative ideas to a panel of investors and industry experts. Network with entrepreneurs, investors, and fellow innovators while discovering the next big thing in Seattle\'s startup ecosystem.',
    startDateTime: new Date('2025-03-20T18:30:00'),
    endDateTime: new Date('2025-03-20T21:00:00'),
    location: {
      venue: 'WeWork South Lake Union',
      address: '500 Dexter Ave N',
      city: 'Seattle',
      state: 'WA',
      zipCode: '98109',
      coordinates: { latitude: 47.6236, longitude: -122.3422 }
    },
    organizer: {
      name: 'Seattle Entrepreneurs Network',
      email: 'events@seattleentrepreneurs.org',
      website: 'https://seattleentrepreneurs.org'
    },
    category: 'Business',
    price: { amount: 25, currency: 'USD', isFree: false },
    tags: ['startup', 'pitch', 'networking', 'investors', 'entrepreneurship', 'innovation'],
    source: { type: 'user_submitted' },
    createdAt: new Date('2025-01-08T16:45:00'),
    updatedAt: new Date('2025-01-08T16:45:00')
  },

  {
    eventId: 'featured-cherry-blossom-festival',
    title: 'Cherry Blossom Festival',
    description: 'Celebrate spring with traditional Japanese performances, food vendors, and the beautiful cherry blossoms in full bloom at the University of Washington Quad. Enjoy cultural performances, authentic Japanese cuisine, and family-friendly activities.',
    startDateTime: new Date('2025-04-05T10:00:00'),
    endDateTime: new Date('2025-04-05T17:00:00'),
    location: {
      venue: 'University of Washington Quad',
      address: '1410 NE Campus Pkwy',
      city: 'Seattle',
      state: 'WA',
      zipCode: '98195',
      coordinates: { latitude: 47.6553, longitude: -122.3035 }
    },
    organizer: {
      name: 'UW Cultural Events',
      website: 'https://uw.edu/events',
      email: 'cultural@uw.edu'
    },
    category: 'Cultural',
    price: { amount: 0, currency: 'USD', isFree: true },
    tags: ['cultural', 'festival', 'spring', 'family-friendly', 'japanese', 'outdoor'],
    source: { type: 'crawled', url: 'https://uw.edu/cherry-blossom' },
    createdAt: new Date('2025-01-20T11:30:00'),
    updatedAt: new Date('2025-01-20T11:30:00')
  },

  {
    eventId: 'featured-digital-art-workshop',
    title: 'Digital Art Workshop',
    description: 'Learn digital art techniques from professional artists in this hands-on workshop. Bring your tablet or use our provided equipment. All skill levels welcome - from complete beginners to experienced artists looking to expand their digital skills.',
    startDateTime: new Date('2025-03-25T13:00:00'),
    endDateTime: new Date('2025-03-25T16:00:00'),
    location: {
      venue: 'Seattle Art Museum',
      address: '1300 1st Ave',
      city: 'Seattle',
      state: 'WA',
      zipCode: '98101',
      coordinates: { latitude: 47.6071, longitude: -122.3377 }
    },
    organizer: {
      name: 'Seattle Art Museum',
      website: 'https://seattleartmuseum.org',
      email: 'workshops@seattleartmuseum.org',
      phone: '(206) 654-3100'
    },
    category: 'Arts & Culture',
    price: { amount: 45, currency: 'USD', isFree: false },
    tags: ['art', 'workshop', 'digital', 'creative', 'hands-on', 'beginner-friendly'],
    source: { type: 'crawled', url: 'https://seattleartmuseum.org/workshops' },
    createdAt: new Date('2025-01-18T13:20:00'),
    updatedAt: new Date('2025-01-18T13:20:00')
  },

  {
    eventId: 'featured-outdoor-yoga-discovery-park',
    title: 'Outdoor Yoga in Discovery Park',
    description: 'Join us for a peaceful morning yoga session in beautiful Discovery Park with stunning views of Puget Sound. All levels welcome. Bring your own mat or rent one on-site. Connect with nature and find your inner peace.',
    startDateTime: new Date('2025-03-16T08:00:00'),
    endDateTime: new Date('2025-03-16T09:30:00'),
    location: {
      venue: 'Discovery Park',
      address: '3801 Discovery Park Blvd',
      city: 'Seattle',
      state: 'WA',
      zipCode: '98199',
      coordinates: { latitude: 47.6621, longitude: -122.4044 }
    },
    organizer: {
      name: 'Seattle Outdoor Yoga',
      website: 'https://seattleoutdooryoga.com',
      email: 'namaste@seattleoutdooryoga.com',
      phone: '(206) 555-0789'
    },
    category: 'Health & Wellness',
    price: { amount: 20, currency: 'USD', isFree: false },
    tags: ['yoga', 'outdoor', 'wellness', 'morning', 'nature', 'meditation'],
    source: { type: 'user_submitted' },
    createdAt: new Date('2025-01-14T07:45:00'),
    updatedAt: new Date('2025-01-14T07:45:00')
  },

  {
    eventId: 'featured-board-game-night',
    title: 'Weekly Board Game Night',
    description: 'Join our weekly board game night at our cozy cafe. Bring friends or make new ones while playing classic and modern board games. We have over 200 games to choose from, plus coffee, snacks, and a welcoming community.',
    startDateTime: new Date('2025-03-19T19:00:00'),
    endDateTime: new Date('2025-03-19T22:00:00'),
    location: {
      venue: 'The Game Corner Cafe',
      address: '1234 Pine St',
      city: 'Seattle',
      state: 'WA',
      zipCode: '98101',
      coordinates: { latitude: 47.6145, longitude: -122.3237 }
    },
    organizer: {
      name: 'Game Corner Events',
      email: 'events@gamecorner.com',
      website: 'https://gamecorner.com',
      phone: '(206) 555-0456'
    },
    category: 'Entertainment',
    price: { amount: 0, currency: 'USD', isFree: true },
    tags: ['games', 'social', 'weekly', 'indoor', 'community', 'cafe'],
    source: { type: 'user_submitted' },
    createdAt: new Date('2025-01-05T18:00:00'),
    updatedAt: new Date('2025-01-05T18:00:00')
  },

  {
    eventId: 'featured-seattle-marathon-training',
    title: 'Seattle Marathon Training Group',
    description: 'Join our supportive marathon training group as we prepare for the Seattle Marathon. All paces welcome! We meet every Saturday for long runs with experienced coaches providing guidance, motivation, and training tips.',
    startDateTime: new Date('2025-03-23T07:00:00'),
    endDateTime: new Date('2025-03-23T10:00:00'),
    location: {
      venue: 'Green Lake Park',
      address: '7201 East Green Lake Dr N',
      city: 'Seattle',
      state: 'WA',
      zipCode: '98115',
      coordinates: { latitude: 47.6789, longitude: -122.3237 }
    },
    organizer: {
      name: 'Seattle Runners Club',
      website: 'https://seattlerunnersclub.org',
      email: 'training@seattlerunnersclub.org'
    },
    category: 'Sports',
    price: { amount: 0, currency: 'USD', isFree: true },
    tags: ['running', 'marathon', 'training', 'fitness', 'outdoor', 'group'],
    source: { type: 'user_submitted' },
    createdAt: new Date('2025-01-11T06:30:00'),
    updatedAt: new Date('2025-01-11T06:30:00')
  },

  {
    eventId: 'featured-coding-bootcamp-info-session',
    title: 'Coding Bootcamp Information Session',
    description: 'Learn about our intensive 12-week coding bootcamp that will transform you into a full-stack developer. Meet instructors, hear from graduates, and discover if this career change is right for you. Free pizza and Q&A session included.',
    startDateTime: new Date('2025-03-17T18:00:00'),
    endDateTime: new Date('2025-03-17T20:00:00'),
    location: {
      venue: 'Code Fellows',
      address: '511 Boren Ave N',
      city: 'Seattle',
      state: 'WA',
      zipCode: '98109',
      coordinates: { latitude: 47.6235, longitude: -122.3284 }
    },
    organizer: {
      name: 'Code Fellows',
      website: 'https://codefellows.org',
      email: 'admissions@codefellows.org',
      phone: '(206) 555-0200'
    },
    category: 'Education',
    price: { amount: 0, currency: 'USD', isFree: true },
    tags: ['coding', 'bootcamp', 'education', 'career-change', 'programming', 'info-session'],
    source: { type: 'crawled', url: 'https://codefellows.org/info-session' },
    createdAt: new Date('2025-01-16T15:00:00'),
    updatedAt: new Date('2025-01-16T15:00:00')
  }
];

/**
 * Get featured events with optional filtering
 */
export function getFeaturedEventsData(limit?: number, category?: string): Event[] {
  let events = [...FEATURED_EVENTS];
  
  // Filter by category if specified
  if (category) {
    events = events.filter(event => 
      event.category.toLowerCase().includes(category.toLowerCase())
    );
  }
  
  // Sort by start date (upcoming events first)
  events.sort((a, b) => a.startDateTime.getTime() - b.startDateTime.getTime());
  
  // Apply limit if specified
  if (limit) {
    events = events.slice(0, limit);
  }
  
  return events;
}

/**
 * Get available event categories from featured events
 */
export function getFeaturedEventCategories(): string[] {
  const categories = new Set(FEATURED_EVENTS.map(event => event.category));
  return Array.from(categories).sort();
}

/**
 * Get featured events by date range
 */
export function getFeaturedEventsByDateRange(startDate: Date, endDate: Date): Event[] {
  return FEATURED_EVENTS.filter(event => 
    event.startDateTime >= startDate && event.startDateTime <= endDate
  );
}