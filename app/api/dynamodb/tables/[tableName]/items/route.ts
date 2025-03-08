import { NextRequest, NextResponse } from 'next/server';
import { 
  DynamoDBClient, 
  ScanCommand,
  PutItemCommand,
  UpdateItemCommand,
  DeleteItemCommand
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

export async function GET(request: NextRequest) {
  return validateRequest(request, handleGetItems);
}

export async function POST(request: NextRequest) {
  return validateRequest(request, handleCreateItem);
}

export async function PUT(request: NextRequest) {
  return validateRequest(request, handleUpdateItem);
}

export async function DELETE(request: NextRequest) {
  return validateRequest(request, handleDeleteItem);
} 