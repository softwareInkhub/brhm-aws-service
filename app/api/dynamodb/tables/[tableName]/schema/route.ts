import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient, UpdateTableCommand, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { logger } from '@/app/utils/logger';

const dynamoDBClient = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// GET - Describe table schema
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tableName: string }> }
) {
  const { tableName } = await context.params;
  logger.info('DynamoDB API: Handling GET request for table schema', {
    component: 'DynamoDB API',
    data: { operation: 'GET', tableName: tableName }
  });

  try {
    const command = new DescribeTableCommand({
      TableName: tableName
    });

    const response = await dynamoDBClient.send(command);

    logger.info('DynamoDB API: Successfully retrieved table schema', {
      component: 'DynamoDB API',
      data: { 
        operation: 'GET',
        tableName: tableName
      }
    });

    return NextResponse.json({
      schema: response.Table,
      requestId: response.$metadata.requestId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('DynamoDB API: Error retrieving table schema', {
      component: 'DynamoDB API',
      data: {
        operation: 'GET',
        tableName: tableName,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : 'Unknown error'
      }
    });

    return NextResponse.json(
      {
        error: 'Failed to retrieve table schema',
        message: error instanceof Error ? error.message : 'An unknown error occurred',
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// PUT - Update table schema
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ tableName: string }> }
) {
  const { tableName } = await context.params;
  logger.info('DynamoDB API: Handling PUT request for table schema update', {
    component: 'DynamoDB API',
    data: { operation: 'PUT', tableName: tableName }
  });

  try {
    const body = await request.json();
    const command = new UpdateTableCommand({
      TableName: tableName,
      AttributeDefinitions: body.AttributeDefinitions,
      ProvisionedThroughput: body.ProvisionedThroughput,
      GlobalSecondaryIndexUpdates: body.GlobalSecondaryIndexUpdates,
      StreamSpecification: body.StreamSpecification,
      SSESpecification: body.SSESpecification,
      ReplicaUpdates: body.ReplicaUpdates
    });

    const response = await dynamoDBClient.send(command);

    logger.info('DynamoDB API: Successfully updated table schema', {
      component: 'DynamoDB API',
      data: { 
        operation: 'PUT',
        tableName: tableName
      }
    });

    return NextResponse.json({
      schema: response.TableDescription,
      requestId: response.$metadata.requestId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('DynamoDB API: Error updating table schema', {
      component: 'DynamoDB API',
      data: {
        operation: 'PUT',
        tableName: tableName,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : 'Unknown error'
      }
    });

    return NextResponse.json(
      {
        error: 'Failed to update table schema',
        message: error instanceof Error ? error.message : 'An unknown error occurred',
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 