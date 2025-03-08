# AWS Services Management UI

A modern web application for managing AWS services through a user-friendly interface. Built with Next.js, TypeScript, and Tailwind CSS.

## Features

- **DynamoDB Management**
  - Create and manage tables with customizable schemas
  - Configure partition keys and optional sort keys
  - Choose between provisioned and on-demand capacity
  - View, edit, and delete table items
  - Monitor table metrics and performance

- **SNS (Simple Notification Service)**
  - Create and manage topics
  - Add and manage subscriptions
  - Configure delivery policies
  - Monitor topic metrics

- **IAM (Identity and Access Management)**
  - Create and manage roles
  - Configure trust relationships
  - Attach and manage policies
  - Monitor role usage

- **Lambda Functions**
  - Create and deploy functions
  - Configure runtime environments
  - Manage function code and dependencies
  - Monitor function metrics

- **API Gateway**
  - Create and manage APIs
  - Configure endpoints and methods
  - Set up integrations
  - Monitor API usage

## Getting Started

### Prerequisites

- Node.js 18 or later
- AWS Account with appropriate credentials
- Git

### Environment Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd aws-services-management
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file with your AWS credentials:
   ```env
   AWS_REGION=your-region
   AWS_ACCESS_KEY_ID=your-access-key
   AWS_SECRET_ACCESS_KEY=your-secret-key
   ```

### Development

Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## API Documentation

The application uses a RESTful API built with Next.js API routes. Full OpenAPI documentation is available at `/api/docs`.

### Key Endpoints

#### DynamoDB

- `GET /api/dynamodb/tables` - List all tables
- `POST /api/dynamodb/tables` - Create a new table
- `GET /api/dynamodb/tables/{tableName}` - Get table details
- `DELETE /api/dynamodb/tables/{tableName}` - Delete a table
- `GET /api/dynamodb/tables/{tableName}/items` - List table items
- `POST /api/dynamodb/tables/{tableName}/items` - Create a new item

#### SNS

- `GET /api/sns/topics` - List all topics
- `POST /api/sns/topics` - Create a new topic
- `POST /api/sns/subscriptions` - Create a subscription

#### IAM

- `GET /api/iam/roles` - List all roles
- `POST /api/iam/roles` - Create a new role

## Architecture

The application follows a clean architecture pattern:

```
app/
├── api/          # API routes and handlers
├── components/   # Reusable UI components
├── services/     # AWS service integrations
├── utils/        # Utility functions
└── aws/         # AWS service pages
```

### Key Components

- **Base Service**: All AWS services extend from a base service class that handles:
  - AWS credentials management
  - Error handling
  - Logging
  - Response formatting

- **UI Components**: Built with Tailwind CSS and includes:
  - Data tables with sorting and pagination
  - Modal dialogs
  - Forms with validation
  - Loading states and error handling

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
