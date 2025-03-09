import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient, DeleteTableCommand } from '@aws-sdk/client-dynamodb';
import { logger } from '@/app/utils/logger';

const dynamoDBClient = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function DELETE(request: NextRequest, { params }: { params: { tableName: string } }) {
  logger.info('DynamoDB API: Handling DELETE request for table', {
    component: 'DynamoDB API',
    data: { operation: 'DELETE', tableName: params.tableName }
  });

  try {
    const command = new DeleteTableCommand({
      TableName: params.tableName
    });

    const response = await dynamoDBClient.send(command);

    logger.info('DynamoDB API: Successfully deleted table', {
      component: 'DynamoDB API',
      data: { 
        operation: 'DELETE',
        tableName: params.tableName,
        requestId: response.$metadata.requestId
      }
    });

    return NextResponse.json({
      message: 'Table deleted successfully',
      requestId: response.$metadata.requestId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('DynamoDB API: Error deleting table', {
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
        error: 'Failed to delete table',
        message: error instanceof Error ? error.message : 'An unknown error occurred',
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 