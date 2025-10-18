import { v4 as uuidv4 } from 'uuid';
import { User, UserProfile, UserPreferences } from '../../types';
import { dynamoDBService, TABLES } from '../dynamodb';
import { UserTableSchema } from '../schemas';

export class UserRepository {
  /**
   * Create a new user
   */
  async createUser(userData: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    timezone: string;
    interests?: string[];
    location?: UserProfile['location'];
    preferences?: Partial<UserPreferences>;
  }): Promise<User> {
    const userId = uuidv4();
    const now = new Date().toISOString();
    
    const defaultPreferences: UserPreferences = {
      eventCategories: [],
      maxDistance: 25,
      priceRange: {
        min: 0,
        max: 1000,
        currency: 'USD',
      },
      notificationSettings: {
        emailNotifications: true,
        pushNotifications: false,
        reminderTime: 60, // 1 hour before event
      },
      ...userData.preferences,
    };

    const userRecord: UserTableSchema = {
      userId,
      email: userData.email,
      passwordHash: userData.passwordHash,
      firstName: userData.firstName,
      lastName: userData.lastName,
      timezone: userData.timezone,
      interests: userData.interests || [],
      location: userData.location,
      preferences: defaultPreferences,
      savedEvents: [],
      createdAt: now,
      updatedAt: now,
      email_gsi: userData.email,
    };

    await dynamoDBService.putItem(TABLES.USERS, userRecord);

    return this.transformToUser(userRecord);
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    const userRecord = await dynamoDBService.getItem<UserTableSchema>(
      TABLES.USERS,
      { userId }
    );

    return userRecord ? this.transformToUser(userRecord) : null;
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    const users = await dynamoDBService.queryItems<UserTableSchema>(
      TABLES.USERS,
      'email_gsi = :email',
      undefined,
      { ':email': email },
      'EmailIndex',
      1
    );

    return users.length > 0 ? this.transformToUser(users[0]) : null;
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, profileData: Partial<UserProfile>): Promise<User | null> {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    if (profileData.firstName) {
      updateExpressions.push('#firstName = :firstName');
      expressionAttributeNames['#firstName'] = 'firstName';
      expressionAttributeValues[':firstName'] = profileData.firstName;
    }

    if (profileData.lastName) {
      updateExpressions.push('#lastName = :lastName');
      expressionAttributeNames['#lastName'] = 'lastName';
      expressionAttributeValues[':lastName'] = profileData.lastName;
    }

    if (profileData.timezone) {
      updateExpressions.push('#timezone = :timezone');
      expressionAttributeNames['#timezone'] = 'timezone';
      expressionAttributeValues[':timezone'] = profileData.timezone;
    }

    if (profileData.interests) {
      updateExpressions.push('#interests = :interests');
      expressionAttributeNames['#interests'] = 'interests';
      expressionAttributeValues[':interests'] = profileData.interests;
    }

    if (profileData.location) {
      updateExpressions.push('#location = :location');
      expressionAttributeNames['#location'] = 'location';
      expressionAttributeValues[':location'] = profileData.location;
    }

    if (updateExpressions.length === 0) {
      return this.getUserById(userId);
    }

    // Always update the updatedAt timestamp
    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    const updateExpression = `SET ${updateExpressions.join(', ')}`;

    const updatedRecord = await dynamoDBService.updateItem<UserTableSchema>(
      TABLES.USERS,
      { userId },
      updateExpression,
      expressionAttributeNames,
      expressionAttributeValues
    );

    return updatedRecord ? this.transformToUser(updatedRecord) : null;
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<User | null> {
    const updateExpression = 'SET #preferences = :preferences, #updatedAt = :updatedAt';
    const expressionAttributeNames = {
      '#preferences': 'preferences',
      '#updatedAt': 'updatedAt',
    };
    const expressionAttributeValues = {
      ':preferences': preferences,
      ':updatedAt': new Date().toISOString(),
    };

    const updatedRecord = await dynamoDBService.updateItem<UserTableSchema>(
      TABLES.USERS,
      { userId },
      updateExpression,
      expressionAttributeNames,
      expressionAttributeValues
    );

    return updatedRecord ? this.transformToUser(updatedRecord) : null;
  }

  /**
   * Add event to user's saved events
   */
  async saveEvent(userId: string, eventId: string): Promise<User | null> {
    const updateExpression = 'ADD savedEvents :eventId SET #updatedAt = :updatedAt';
    const expressionAttributeNames = {
      '#updatedAt': 'updatedAt',
    };
    const expressionAttributeValues = {
      ':eventId': new Set([eventId]),
      ':updatedAt': new Date().toISOString(),
    };

    const updatedRecord = await dynamoDBService.updateItem<UserTableSchema>(
      TABLES.USERS,
      { userId },
      updateExpression,
      expressionAttributeNames,
      expressionAttributeValues
    );

    return updatedRecord ? this.transformToUser(updatedRecord) : null;
  }

  /**
   * Remove event from user's saved events
   */
  async unsaveEvent(userId: string, eventId: string): Promise<User | null> {
    const updateExpression = 'DELETE savedEvents :eventId SET #updatedAt = :updatedAt';
    const expressionAttributeNames = {
      '#updatedAt': 'updatedAt',
    };
    const expressionAttributeValues = {
      ':eventId': new Set([eventId]),
      ':updatedAt': new Date().toISOString(),
    };

    const updatedRecord = await dynamoDBService.updateItem<UserTableSchema>(
      TABLES.USERS,
      { userId },
      updateExpression,
      expressionAttributeNames,
      expressionAttributeValues
    );

    return updatedRecord ? this.transformToUser(updatedRecord) : null;
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string): Promise<void> {
    await dynamoDBService.deleteItem(TABLES.USERS, { userId });
  }

  /**
   * Get multiple users by IDs
   */
  async getUsersByIds(userIds: string[]): Promise<User[]> {
    if (userIds.length === 0) return [];

    const keys = userIds.map(userId => ({ userId }));
    const results = await dynamoDBService.batchGetItems<UserTableSchema>([
      { tableName: TABLES.USERS, keys }
    ]);

    const userRecords = results[TABLES.USERS] || [];
    return userRecords.map(record => this.transformToUser(record));
  }

  /**
   * Transform UserTableSchema to User interface
   */
  private transformToUser(userRecord: UserTableSchema): User {
    return {
      userId: userRecord.userId,
      email: userRecord.email,
      passwordHash: userRecord.passwordHash,
      profile: {
        firstName: userRecord.firstName,
        lastName: userRecord.lastName,
        location: userRecord.location as UserProfile['location'],
        interests: userRecord.interests,
        timezone: userRecord.timezone,
      },
      preferences: userRecord.preferences,
      savedEvents: Array.isArray(userRecord.savedEvents) ? userRecord.savedEvents : [],
      createdAt: new Date(userRecord.createdAt),
      updatedAt: new Date(userRecord.updatedAt),
    };
  }
}

// Export singleton instance
export const userRepository = new UserRepository();