import { NextRequest, NextResponse } from 'next/server';
import { 
  DynamoDBClient, 
  ScanCommand,
  PutItemCommand,
  UpdateItemCommand,
  DeleteItemCommand,
  GetItemCommand
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { logger } from '@/app/utils/logger';
import { validateRequest } from '@/app/lib/openapi';

const COMPONENT_NAME = 'DynamoDB Items API';

interface APIResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  requestId: string;
  timestamp: string;
}

function createResponse<T>(data: T, requestId: string, status: number = 200): NextResponse<APIResponse<T>> {
  return NextResponse.json({
    data,
    requestId,
    timestamp: new Date().toISOString()
  }, { status });
}

function createErrorResponse(error: Error | unknown, status: number = 500): NextResponse<APIResponse<never>> {
  const errorObj = error instanceof Error ? error : new Error('Unknown error');
  
  return NextResponse.json({
    error: errorObj.name,
    message: errorObj.message,
    requestId: crypto.randomUUID(),
    timestamp: new Date().toISOString()
  }, { status });
}

function validateEnvVars() {
  const requiredVars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    const error = `Missing required environment variables: ${missingVars.join(', ')}`;
    logger.error(`${COMPONENT_NAME}: Environment validation failed`, {
      component: COMPONENT_NAME,
      data: { missingVars }
    });
    throw new Error(error);
  }
}

const dynamoDBClient = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

async function handleGetItems(c: any, request: NextRequest) {
  try {
    validateEnvVars();

    const tableName = c.request.params.tableName;
    const limit = parseInt(c.request.query.limit || '20');
    const startKey = c.request.query.startKey;

    logger.info(`${COMPONENT_NAME}: Scanning table`, {
      component: COMPONENT_NAME,
      data: { tableName, limit, startKey }
    });

    const command = new ScanCommand({
      TableName: tableName,
      Limit: limit,
      ...(startKey && { ExclusiveStartKey: JSON.parse(startKey) })
    });

    const response = await dynamoDBClient.send(command);
    const items = response.Items?.map(item => unmarshall(item)) || [];

    logger.info(`${COMPONENT_NAME}: Retrieved items successfully`, {
      component: COMPONENT_NAME,
      data: { 
        tableName,
        itemCount: items.length,
        hasMore: !!response.LastEvaluatedKey
      }
    });

    return createResponse({
      items,
      lastEvaluatedKey: response.LastEvaluatedKey ? JSON.stringify(response.LastEvaluatedKey) : undefined
    }, response.$metadata.requestId!);
  } catch (error) {
    logger.error(`${COMPONENT_NAME}: Failed to retrieve items`, {
      component: COMPONENT_NAME,
      data: {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : 'Unknown error'
      }
    });

    return createErrorResponse(error);
  }
}

async function handleCreateItem(c: any, request: NextRequest) {
  try {
    validateEnvVars();

    const tableName = c.request.params.tableName;
    const item = c.request.body.Item;

    logger.info(`${COMPONENT_NAME}: Processing item creation`, {
      component: COMPONENT_NAME,
      data: { tableName, item }
    });

    const command = new PutItemCommand({
      TableName: tableName,
      Item: marshall(item)
    });

    const response = await dynamoDBClient.send(command);

    logger.info(`${COMPONENT_NAME}: Item created successfully`, {
      component: COMPONENT_NAME,
      data: { 
        tableName,
        requestId: response.$metadata.requestId
      }
    });

    return createResponse({ item }, response.$metadata.requestId!, 201);
  } catch (error) {
    logger.error(`${COMPONENT_NAME}: Failed to create item`, {
      component: COMPONENT_NAME,
      data: {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : 'Unknown error'
      }
    });

    return createErrorResponse(error);
  }
}

async function handleUpdateItem(c: any, request: NextRequest) {
  try {
    validateEnvVars();

    const tableName = c.request.params.tableName;
    const { Key, UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues, ReturnValues } = c.request.body;

    logger.info(`${COMPONENT_NAME}: Processing item update`, {
      component: COMPONENT_NAME,
      data: { 
        tableName,
        key: Key,
        updateExpression: UpdateExpression
      }
    });

    const command = new UpdateItemCommand({
      TableName: tableName,
      Key: marshall(Key),
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues: ExpressionAttributeValues ? 
        marshall(ExpressionAttributeValues) : undefined,
      ReturnValues: ReturnValues || 'ALL_NEW'
    });

    const response = await dynamoDBClient.send(command);
    const updatedItem = response.Attributes ? unmarshall(response.Attributes) : undefined;

    logger.info(`${COMPONENT_NAME}: Item updated successfully`, {
      component: COMPONENT_NAME,
      data: { 
        tableName,
        key: Key,
        requestId: response.$metadata.requestId
      }
    });

    return createResponse({ item: updatedItem }, response.$metadata.requestId!);
  } catch (error) {
    logger.error(`${COMPONENT_NAME}: Failed to update item`, {
      component: COMPONENT_NAME,
      data: {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : 'Unknown error'
      }
    });

    return createErrorResponse(error);
  }
}

async function handleDeleteItem(c: any, request: NextRequest) {
  try {
    validateEnvVars();

    const tableName = c.request.params.tableName;
    const key = c.request.params.key ? JSON.parse(c.request.params.key) : undefined;

    if (!key) {
      throw new Error('Key is required for deletion');
    }

    logger.info(`${COMPONENT_NAME}: Processing item deletion`, {
      component: COMPONENT_NAME,
      data: { tableName, key }
    });

    const command = new DeleteItemCommand({
      TableName: tableName,
      Key: marshall(key)
    });

    const response = await dynamoDBClient.send(command);

    logger.info(`${COMPONENT_NAME}: Item deleted successfully`, {
      component: COMPONENT_NAME,
      data: { 
        tableName,
        key,
        requestId: response.$metadata.requestId
      }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logger.error(`${COMPONENT_NAME}: Failed to delete item`, {
      component: COMPONENT_NAME,
      data: {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : 'Unknown error'
      }
    });

    return createErrorResponse(error);
  }
}

export async function GET(request: NextRequest, { params }: { params: { tableName: string } }) {
  logger.info('DynamoDB API: Handling GET request for items', {
    component: 'DynamoDB API',
    data: { operation: 'GET', tableName: params.tableName }
  });

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const startKey = searchParams.get('startKey');

    const command = new ScanCommand({
      TableName: params.tableName,
      Limit: limit,
      ...(startKey && { ExclusiveStartKey: JSON.parse(startKey) }),
    });

    const response = await dynamoDBClient.send(command);
    const items = response.Items?.map(item => unmarshall(item)) || [];

    logger.info('DynamoDB API: Successfully retrieved items', {
      component: 'DynamoDB API',
      data: { 
        operation: 'GET',
        tableName: params.tableName,
        itemCount: items.length
      }
    });

    return NextResponse.json({
      items,
      lastEvaluatedKey: response.LastEvaluatedKey ? JSON.stringify(response.LastEvaluatedKey) : undefined,
      requestId: response.$metadata.requestId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('DynamoDB API: Error retrieving items', {
      component: 'DynamoDB API',
      data: {
        operation: 'GET',
        tableName: params.tableName,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : 'Unknown error'
      }
    });

    return NextResponse.json(
      {
        error: 'Failed to retrieve items',
        message: error instanceof Error ? error.message : 'An unknown error occurred',
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: { tableName: string } }) {
  logger.info('DynamoDB API: Handling POST request for item creation', {
    component: 'DynamoDB API',
    data: { operation: 'POST', tableName: params.tableName }
  });

  try {
    const body = await request.json();
    const marshalledItem = marshall(body.Item);

    const command = new PutItemCommand({
      TableName: params.tableName,
      Item: marshalledItem
    });

    const response = await dynamoDBClient.send(command);

    logger.info('DynamoDB API: Successfully created item', {
      component: 'DynamoDB API',
      data: { 
        operation: 'POST',
        tableName: params.tableName
      }
    });

    return NextResponse.json({
      requestId: response.$metadata.requestId,
      timestamp: new Date().toISOString()
    }, { status: 201 });
  } catch (error) {
    logger.error('DynamoDB API: Error creating item', {
      component: 'DynamoDB API',
      data: {
        operation: 'POST',
        tableName: params.tableName,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : 'Unknown error'
      }
    });

    return NextResponse.json(
      {
        error: 'Failed to create item',
        message: error instanceof Error ? error.message : 'An unknown error occurred',
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: { tableName: string } }) {
  logger.info('DynamoDB API: Handling PUT request for item update', {
    component: 'DynamoDB API',
    data: { operation: 'PUT', tableName: params.tableName }
  });

  try {
    const body = await request.json();
    const { Key, UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues } = body;

    const command = new UpdateItemCommand({
      TableName: params.tableName,
      Key: marshall(Key),
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues: ExpressionAttributeValues ? marshall(ExpressionAttributeValues) : undefined,
      ReturnValues: 'ALL_NEW'
    });

    const response = await dynamoDBClient.send(command);
    const updatedItem = response.Attributes ? unmarshall(response.Attributes) : null;

    logger.info('DynamoDB API: Successfully updated item', {
      component: 'DynamoDB API',
      data: { 
        operation: 'PUT',
        tableName: params.tableName
      }
    });

    return NextResponse.json({
      item: updatedItem,
      requestId: response.$metadata.requestId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('DynamoDB API: Error updating item', {
      component: 'DynamoDB API',
      data: {
        operation: 'PUT',
        tableName: params.tableName,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : 'Unknown error'
      }
    });

    return NextResponse.json(
      {
        error: 'Failed to update item',
        message: error instanceof Error ? error.message : 'An unknown error occurred',
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { tableName: string } }) {
  logger.info('DynamoDB API: Handling DELETE request for item', {
    component: 'DynamoDB API',
    data: { operation: 'DELETE', tableName: params.tableName }
  });

  try {
    const body = await request.json();
    const command = new DeleteItemCommand({
      TableName: params.tableName,
      Key: marshall(body.Key)
    });

    const response = await dynamoDBClient.send(command);

    logger.info('DynamoDB API: Successfully deleted item', {
      component: 'DynamoDB API',
      data: { 
        operation: 'DELETE',
        tableName: params.tableName
      }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logger.error('DynamoDB API: Error deleting item', {
      component: 'DynamoDB API',
      data: {
        operation: 'DELETE',
        tableName: params.tableName,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : 'Unknown error'
      }
    });

    return NextResponse.json(
      {
        error: 'Failed to delete item',
        message: error instanceof Error ? error.message : 'An unknown error occurred',
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 