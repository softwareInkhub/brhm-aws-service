# AWS Services Management UI

A modern web application for managing AWS services with a focus on DynamoDB operations. Built with Next.js 14, TypeScript, and Tailwind CSS.

## Table of Contents
- [Features](#features)
- [Getting Started](#getting-started)
- [API Documentation](#api-documentation)
- [Architecture](#architecture)
- [Contributing](#contributing)

## Features

### DynamoDB Management
- **Table Operations**
  - Create tables with customizable schemas
  - Configure partition and sort keys
  - Choose between provisioned and on-demand capacity
  - Delete tables
  - View table details and metrics

- **Item Management**
  - Create, read, update, and delete items
  - Smart form validation for required keys
  - Dynamic attribute management
  - Batch operations support
  - Real-time schema validation

- **Advanced Features**
  - Auto-detection of key attributes
  - Prevention of key attribute modification
  - Support for nested objects and arrays
  - Real-time data synchronization
  - Error handling and recovery

## Getting Started

### Prerequisites
- Node.js 18 or later
- AWS Account with appropriate credentials
- Git

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd aws-services-management
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
Create a `.env.local` file with:
```env
AWS_REGION=your-region
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

4. Start the development server:
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to access the application.

## API Documentation

### DynamoDB Table Operations

#### List Tables
```http
GET /api/dynamodb/tables
```
Response:
```json
{
  "tables": ["table1", "table2"],
  "requestId": "string",
  "timestamp": "ISO-8601 string"
}
```

#### Create Table
```http
POST /api/dynamodb/tables
```
Request:
```json
{
  "TableName": "string",
  "KeySchema": [
    {
      "AttributeName": "string",
      "KeyType": "HASH | RANGE"
    }
  ],
  "AttributeDefinitions": [
    {
      "AttributeName": "string",
      "AttributeType": "S | N | B"
    }
  ],
  "BillingMode": "PROVISIONED | PAY_PER_REQUEST",
  "ProvisionedThroughput": {
    "ReadCapacityUnits": "number",
    "WriteCapacityUnits": "number"
  }
}
```
Response:
```json
{
  "message": "Table created successfully",
  "tableName": "string",
  "tableArn": "string",
  "requestId": "string"
}
```

#### Delete Table
```http
DELETE /api/dynamodb/tables/{tableName}
```
Response:
```json
{
  "message": "Table deleted successfully",
  "requestId": "string",
  "timestamp": "ISO-8601 string"
}
```

### DynamoDB Item Operations

#### List Items
```http
GET /api/dynamodb/tables/{tableName}/items
```
Response:
```json
{
  "items": [
    {
      "id": "string",
      "attributes": "any"
    }
  ],
  "requestId": "string",
  "timestamp": "ISO-8601 string"
}
```

#### Create Item
```http
POST /api/dynamodb/tables/{tableName}/items
```
Request:
```json
{
  "Item": {
    "partitionKey": "value",
    "sortKey": "value",
    "attribute1": "value1",
    "attribute2": 123,
    "attribute3": true,
    "attribute4": ["array", "values"],
    "attribute5": {
      "nested": "object"
    }
  }
}
```
Response:
```json
{
  "message": "Item created successfully",
  "requestId": "string",
  "timestamp": "ISO-8601 string"
}
```

#### Update Item
```http
PUT /api/dynamodb/tables/{tableName}/items
```
Request:
```json
{
  "Key": {
    "partitionKey": "value",
    "sortKey": "value"
  },
  "UpdateData": {
    "attribute1": "new value",
    "attribute2": 123
  }
}
```
Response:
```json
{
  "message": "Item updated successfully",
  "updatedItem": {
    "partitionKey": "value",
    "attribute1": "new value"
  },
  "requestId": "string"
}
```

#### Delete Item
```http
DELETE /api/dynamodb/tables/{tableName}/items
```
Request:
```json
{
  "Key": {
    "partitionKey": "value",
    "sortKey": "value"
  }
}
```
Response:
```json
{
  "message": "Item deleted successfully",
  "deletedItem": {
    "partitionKey": "value",
    "sortKey": "value"
  },
  "requestId": "string"
}
```

### Error Handling
All endpoints return error responses in this format:
```json
{
  "error": "Error type",
  "message": "Detailed error message",
  "requestId": "string",
  "timestamp": "ISO-8601 string"
}
```

### S3 Bucket Operations

#### List Buckets
```http
GET /api/s3
```
Response:
```json
{
  "data": {
    "buckets": [
      {
        "Name": "string",
        "CreationDate": "ISO-8601 string"
      }
    ]
  },
  "requestId": "string",
  "timestamp": "ISO-8601 string"
}
```

#### Create Bucket
```http
POST /api/s3
```
Request:
```json
{
  "BucketName": "string"
}
```
Response:
```json
{
  "data": {
    "bucket": {
      "Name": "string",
      "CreationDate": "ISO-8601 string"
    }
  },
  "requestId": "string",
  "timestamp": "ISO-8601 string"
}
```

#### Delete Bucket
```http
DELETE /api/s3
```
Request:
```json
{
  "BucketName": "string"
}
```
Response: 204 No Content

### S3 Object Operations

#### List Objects in Bucket
```http
GET /api/s3/buckets/{bucketName}?prefix={prefix}
```
Query Parameters:
- `prefix` (optional): Filter objects by prefix/folder path

Response:
```json
{
  "data": {
    "objects": [
      {
        "Key": "string",
        "LastModified": "ISO-8601 string",
        "Size": "number",
        "ETag": "string"
      }
    ],
    "commonPrefixes": [
      {
        "Prefix": "string"
      }
    ]
  },
  "requestId": "string",
  "timestamp": "ISO-8601 string"
}
```

#### Upload Object
```http
POST /api/s3/buckets/{bucketName}
```
Request:
- Content-Type: multipart/form-data
- Body:
  - `file`: File to upload
  - `key`: Object key (path/filename)

Response:
```json
{
  "data": {
    "key": "string",
    "eTag": "string",
    "versionId": "string (if versioning enabled)"
  },
  "requestId": "string",
  "timestamp": "ISO-8601 string"
}
```

#### Delete Object
```http
DELETE /api/s3/buckets/{bucketName}?key={objectKey}
```
Query Parameters:
- `key`: The full path/key of the object to delete

Response: 204 No Content

### Error Responses
All endpoints return error responses in this format:
```json
{
  "error": "Error type",
  "message": "Detailed error message",
  "requestId": "string",
  "timestamp": "ISO-8601 string"
}
```

Common Error Status Codes:
- 400: Bad Request (invalid input)
- 404: Not Found
- 409: Conflict (e.g., bucket already exists)
- 500: Internal Server Error

## Architecture

### Project Structure
```
app/
├── api/          # API routes and handlers
│   └── dynamodb/ # DynamoDB specific endpoints
├── components/   # Reusable UI components
├── aws/         # AWS service pages
│   └── dynamodb/ # DynamoDB management interface
├── lib/         # Utility functions and helpers
└── utils/       # Common utilities
```

### Key Components
- **API Routes**: Next.js API routes for AWS service interactions
- **UI Components**: Reusable React components with Tailwind CSS
- **Service Handlers**: AWS SDK integration and business logic
- **Type Definitions**: TypeScript interfaces and types
- **Utility Functions**: Helper functions and common operations

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.