# AWS Service API Documentation

This document provides comprehensive documentation for all AWS service API endpoints available in this application.

## Table of Contents
- [Authentication](#authentication)
- [Common Headers](#common-headers)
- [API Endpoints](#api-endpoints)
  - [IAM](#iam)
  - [S3](#s3)
  - [DynamoDB](#dynamodb)
  - [Lambda](#lambda)
  - [SNS](#sns)
  - [API Gateway](#api-gateway)
  - [Step Functions](#step-functions)

## Authentication

### Environment Configuration
The application requires AWS credentials to be configured in the environment:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`

### Request Authentication
All API requests must include AWS credentials in one of the following ways:

1. **Request Headers (Recommended for Development)**
   ```
   X-AWS-Access-Key-Id: your_access_key_id
   X-AWS-Secret-Access-Key: your_secret_access_key
   X-AWS-Region: your_region
   ```

2. **Query Parameters (Alternative Method)**
   ```
   ?accessKeyId=your_access_key_id&secretAccessKey=your_secret_access_key&region=your_region
   ```

3. **Environment Variables (Server-side)**
   The application will automatically use environment variables if no credentials are provided in the request.

### Security Best Practices
- Never expose AWS credentials in client-side code
- Use environment variables in production environments
- Rotate credentials regularly
- Use IAM roles with least privilege principle
- Consider using AWS Cognito or similar services for user authentication

### Example Request with Headers
```bash
curl -X GET 'https://your-api.com/api/s3' \
  -H 'X-AWS-Access-Key-Id: your_access_key_id' \
  -H 'X-AWS-Secret-Access-Key: your_secret_access_key' \
  -H 'X-AWS-Region: us-east-1' \
  -H 'Content-Type: application/json'
```

### Example Request with Query Parameters
```bash
curl -X GET 'https://your-api.com/api/s3?accessKeyId=your_access_key_id&secretAccessKey=your_secret_access_key&region=us-east-1' \
  -H 'Content-Type: application/json'
```

## Common Headers

All endpoints support the following headers:
- `Content-Type: application/json`
- CORS headers are automatically added to all responses

## API Endpoints

### IAM

#### List IAM Roles
- **Endpoint:** `/api/iam`
- **Method:** GET
- **Response:**
  ```json
  {
    "data": [
      {
        "RoleName": "string",
        "Arn": "string",
        "CreateDate": "string",
        "Path": "string"
      }
    ]
  }
  ```

#### List IAM Policies
- **Endpoint:** `/api/iam/policies`
- **Method:** GET
- **Response:**
  ```json
  {
    "data": [
      {
        "PolicyName": "string",
        "PolicyId": "string",
        "Arn": "string"
      }
    ]
  }
  ```

### S3

#### List Buckets
- **Endpoint:** `/api/s3`
- **Method:** GET
- **Response:**
  ```json
  {
    "data": [
      {
        "Name": "string",
        "CreationDate": "string"
      }
    ]
  }
  ```

#### Bucket Operations
- **Endpoint:** `/api/s3/buckets/{bucketName}`
- **Methods:** GET, PUT, DELETE
- **Response:**
  ```json
  {
    "data": {
      "Name": "string",
      "CreationDate": "string",
      "Objects": []
    }
  }
  ```

### DynamoDB

#### List Tables
- **Endpoint:** `/api/dynamodb/tables`
- **Method:** GET
- **Response:**
  ```json
  {
    "data": {
      "TableNames": ["string"]
    }
  }
  ```

#### Table Items
- **Endpoint:** `/api/dynamodb/tables/{tableName}/items`
- **Methods:** GET, POST, PUT, DELETE
- **GET Response:**
  ```json
  {
    "data": {
      "items": [],
      "lastEvaluatedKey": "string"
    }
  }
  ```
- **POST Payload:**
  ```json
  {
    "Item": {
      "key": "value"
    }
  }
  ```

### Lambda

#### List Functions
- **Endpoint:** `/api/lambda/functions`
- **Method:** GET
- **Response:**
  ```json
  {
    "data": [
      {
        "FunctionName": "string",
        "FunctionArn": "string",
        "Runtime": "string",
        "Handler": "string"
      }
    ]
  }
  ```

### SNS

#### List Topics
- **Endpoint:** `/api/sns/topics`
- **Method:** GET
- **Response:**
  ```json
  {
    "data": [
      {
        "TopicArn": "string"
      }
    ]
  }
  ```

### API Gateway

#### Get API Resources
- **Endpoint:** `/api/apigateway/{apiId}`
- **Method:** GET
- **Response:**
  ```json
  {
    "data": [
      {
        "id": "string",
        "parentId": "string",
        "path": "string",
        "pathPart": "string",
        "methods": [
          {
            "httpMethod": "string",
            "authorizationType": "string",
            "apiKeyRequired": boolean,
            "integration": {
              "type": "string",
              "uri": "string",
              "integrationMethod": "string"
            }
          }
        ]
      }
    ]
  }
  ```

#### Create Resource
- **Endpoint:** `/api/apigateway/{apiId}/resources`
- **Method:** POST
- **Payload:**
  ```json
  {
    "parentId": "string",
    "pathPart": "string"
  }
  ```

### Step Functions

#### List State Machines
- **Endpoint:** `/api/stepfunctions`
- **Method:** GET
- **Response:**
  ```json
  {
    "data": [
      {
        "stateMachineArn": "string",
        "name": "string",
        "type": "string",
        "creationDate": "string"
      }
    ]
  }
  ```

## Error Responses

All endpoints return errors in the following format:
```json
{
  "error": "string",
  "message": "string",
  "requestId": "string",
  "timestamp": "string"
}
```

Common HTTP Status Codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

## Rate Limiting

Please be aware that AWS services have their own rate limits. The API will return appropriate error responses when these limits are reached.

## Security

- All endpoints are protected by OpenAPI validation
- AWS credentials are required for all operations
- CORS is enabled for all endpoints
- All requests are logged for security and debugging purposes
