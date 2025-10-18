# EventSync Platform

A comprehensive event discovery and management platform that combines AI-powered search with seamless calendar integration.

## Project Structure

```
eventsync-platform/
├── front-end/                 # React.js frontend application
│   ├── src/
│   │   ├── components/        # Reusable React components
│   │   ├── pages/            # Main page components
│   │   ├── services/         # API calls and business logic
│   │   ├── hooks/            # Custom React hooks
│   │   ├── contexts/         # React context providers
│   │   ├── utils/            # Helper functions
│   │   ├── types/            # TypeScript type definitions
│   │   └── config/           # Configuration files
│   ├── public/               # Static assets
│   ├── package.json          # Frontend dependencies
│   ├── tsconfig.json         # TypeScript configuration
│   └── .env.example          # Environment variables template
│
├── back-end/                  # Node.js/Express backend API
│   ├── src/
│   │   ├── routes/           # API route handlers
│   │   ├── services/         # Business logic services
│   │   ├── middleware/       # Express middleware
│   │   ├── models/           # Data models and schemas
│   │   ├── utils/            # Helper functions
│   │   ├── types/            # TypeScript type definitions
│   │   ├── config/           # Configuration files
│   │   ├── test/             # Test setup and utilities
│   │   └── server.ts         # Main server file
│   ├── dist/                 # Compiled JavaScript output
│   ├── package.json          # Backend dependencies
│   ├── tsconfig.json         # TypeScript configuration
│   ├── jest.config.js        # Jest test configuration
│   ├── .env.example          # Environment variables template
│   └── .env.test             # Test environment variables
│
└── .kiro/                     # Kiro specification files
    └── specs/
        └── event-sync-platform/
            ├── requirements.md # Feature requirements
            ├── design.md      # System design document
            └── tasks.md       # Implementation tasks
```

## Technology Stack

### Frontend
- **React.js 19.2.0** - UI framework
- **TypeScript** - Type safety
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **React Hook Form** - Form management
- **React Query** - Data fetching and caching
- **Styled Components** - CSS-in-JS styling
- **React DatePicker** - Date selection
- **React Select** - Enhanced select components
- **React Toastify** - Notifications

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **AWS SDK v3** - AWS services integration
- **DynamoDB** - User and event data storage
- **OpenSearch Serverless** - Semantic search
- **Amazon Bedrock** - AI/ML services
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Joi** - Input validation
- **ical-generator** - Calendar file generation

### AWS Services
- **DynamoDB** - NoSQL database for user profiles and events
- **OpenSearch Serverless** - Vector search for semantic event discovery
- **Amazon Bedrock** - RAG (Retrieval Augmented Generation) for conversational AI
- **Bedrock Knowledge Base** - Web crawler for event data indexing
- **CloudWatch** - Monitoring and logging

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- AWS account with appropriate permissions
- AWS CLI configured

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd back-end
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

4. Configure your AWS credentials and services in `.env`

5. Start the development server:
   ```bash
   npm run dev
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd front-end
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

4. Start the development server:
   ```bash
   npm start
   ```

## Features

- **AI-Powered Search**: Natural language event discovery using Amazon Bedrock
- **Semantic Search**: Vector-based event matching with OpenSearch Serverless
- **Calendar Integration**: Generate .ics files for universal calendar compatibility
- **User Authentication**: Secure registration and login system
- **Event Management**: Submit, edit, and manage events
- **Personalized Recommendations**: AI-driven event suggestions
- **Saved Events**: Bookmark and organize favorite events
- **Web Crawling**: Automated event discovery from configured sources

## API Endpoints

The backend provides RESTful API endpoints for:
- `/api/auth` - Authentication (register, login, refresh)
- `/api/events` - Event management (CRUD operations)
- `/api/search` - Semantic and conversational search
- `/api/calendar` - Calendar integration (.ics generation)
- `/api/users` - User profile and preferences management

## Development

### Running Tests
Backend:
```bash
cd back-end
npm test
```

Frontend:
```bash
cd front-end
npm test
```

### Building for Production
Backend:
```bash
cd back-end
npm run build
```

Frontend:
```bash
cd front-end
npm run build
```

## License

MIT License - see LICENSE file for details.