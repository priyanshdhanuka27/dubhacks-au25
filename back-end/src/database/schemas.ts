// DynamoDB table schema definitions for EventSync Platform

export interface UserTableSchema {
  // Partition Key
  userId: string;
  
  // User attributes
  email: string;
  passwordHash: string;
  
  // Profile information
  firstName: string;
  lastName: string;
  timezone: string;
  interests: string[];
  location?: {
    venue: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  
  // Preferences
  preferences: {
    eventCategories: string[];
    maxDistance: number;
    priceRange: {
      min: number;
      max: number;
      currency: string;
    };
    notificationSettings: {
      emailNotifications: boolean;
      pushNotifications: boolean;
      reminderTime: number;
    };
  };
  
  // Saved events (array of event IDs)
  savedEvents: string[];
  
  // Timestamps
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  
  // GSI attributes for querying
  email_gsi: string; // Same as email, for GSI
}

export interface EventTableSchema {
  // Partition Key
  eventId: string;
  
  // Sort Key (for potential future partitioning by date)
  sortKey: string; // Format: "EVENT#{startDateTime}"
  
  // Event attributes
  title: string;
  description: string;
  startDateTime: string; // ISO string
  endDateTime: string; // ISO string
  
  // Location information
  location: {
    venue: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  
  // Organizer information
  organizer: {
    name: string;
    email?: string;
    website?: string;
    phone?: string;
  };
  
  // Event metadata
  category: string;
  price: {
    amount: number;
    currency: string;
    isFree?: boolean;
  };
  tags: string[];
  
  // Source information
  source: {
    type: 'crawled' | 'user-submitted';
    url?: string;
    crawlDate?: string; // ISO string
  };
  
  // User who created the event (for user-submitted events)
  createdBy?: string;
  
  // Timestamps
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  
  // GSI attributes for querying
  category_gsi: string; // Same as category, for GSI
  location_gsi: string; // Format: "{state}#{city}"
  createdBy_gsi?: string; // Same as createdBy, for user's events GSI
  startDate_gsi: string; // Format: "YYYY-MM-DD" for date range queries
}

// Table creation schemas (for infrastructure setup)
export const USER_TABLE_SCHEMA = {
  TableName: 'eventsync-users',
  KeySchema: [
    {
      AttributeName: 'userId',
      KeyType: 'HASH', // Partition key
    },
  ],
  AttributeDefinitions: [
    {
      AttributeName: 'userId',
      AttributeType: 'S',
    },
    {
      AttributeName: 'email_gsi',
      AttributeType: 'S',
    },
  ],
  GlobalSecondaryIndexes: [
    {
      IndexName: 'EmailIndex',
      KeySchema: [
        {
          AttributeName: 'email_gsi',
          KeyType: 'HASH',
        },
      ],
      Projection: {
        ProjectionType: 'ALL',
      },
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
    },
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 10,
    WriteCapacityUnits: 10,
  },
};

export const EVENT_TABLE_SCHEMA = {
  TableName: 'eventsync-events',
  KeySchema: [
    {
      AttributeName: 'eventId',
      KeyType: 'HASH', // Partition key
    },
    {
      AttributeName: 'sortKey',
      KeyType: 'RANGE', // Sort key
    },
  ],
  AttributeDefinitions: [
    {
      AttributeName: 'eventId',
      AttributeType: 'S',
    },
    {
      AttributeName: 'sortKey',
      AttributeType: 'S',
    },
    {
      AttributeName: 'category_gsi',
      AttributeType: 'S',
    },
    {
      AttributeName: 'location_gsi',
      AttributeType: 'S',
    },
    {
      AttributeName: 'createdBy_gsi',
      AttributeType: 'S',
    },
    {
      AttributeName: 'startDate_gsi',
      AttributeType: 'S',
    },
  ],
  GlobalSecondaryIndexes: [
    {
      IndexName: 'CategoryIndex',
      KeySchema: [
        {
          AttributeName: 'category_gsi',
          KeyType: 'HASH',
        },
        {
          AttributeName: 'startDate_gsi',
          KeyType: 'RANGE',
        },
      ],
      Projection: {
        ProjectionType: 'ALL',
      },
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
    },
    {
      IndexName: 'LocationIndex',
      KeySchema: [
        {
          AttributeName: 'location_gsi',
          KeyType: 'HASH',
        },
        {
          AttributeName: 'startDate_gsi',
          KeyType: 'RANGE',
        },
      ],
      Projection: {
        ProjectionType: 'ALL',
      },
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
    },
    {
      IndexName: 'UserEventsIndex',
      KeySchema: [
        {
          AttributeName: 'createdBy_gsi',
          KeyType: 'HASH',
        },
        {
          AttributeName: 'startDate_gsi',
          KeyType: 'RANGE',
        },
      ],
      Projection: {
        ProjectionType: 'ALL',
      },
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
    },
    {
      IndexName: 'DateIndex',
      KeySchema: [
        {
          AttributeName: 'startDate_gsi',
          KeyType: 'HASH',
        },
        {
          AttributeName: 'sortKey',
          KeyType: 'RANGE',
        },
      ],
      Projection: {
        ProjectionType: 'ALL',
      },
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
    },
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 10,
    WriteCapacityUnits: 10,
  },
};

// Helper functions for schema transformations
export function formatSortKey(startDateTime: Date): string {
  return `EVENT#${startDateTime.toISOString()}`;
}

export function formatLocationGSI(state: string, city: string): string {
  return `${state}#${city}`;
}

export function formatStartDateGSI(startDateTime: Date): string {
  return startDateTime.toISOString().split('T')[0]; // YYYY-MM-DD format
}