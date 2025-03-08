import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient, ListTablesCommand, CreateTableCommand, DeleteTableCommand } from '@aws-sdk/client-dynamodb';
import { logger } from '@/app/utils/logger';

function validateEnvVars() {
  const requiredVars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    const error = `Missing required environment variables: ${missingVars.join(', ')}`;
    logger.error('DynamoDB API: Environment validation failed', {
      component: 'DynamoDB API',
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

export async function GET(request: NextRequest) {
  logger.info('DynamoDB API: Handling GET request for tables', {
    component: 'DynamoDB API',
    operation: 'GET'
  });

  try {
    validateEnvVars();

    const command = new ListTablesCommand({});
    const response = await dynamoDBClient.send(command);

    logger.info('DynamoDB API: Successfully retrieved tables', {
      component: 'DynamoDB API',
      operation: 'GET',
      data: { tableCount: response.TableNames?.length || 0 }
    });

    return NextResponse.json({
      tables: response.TableNames || [],
      requestId: response.$metadata.requestId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('DynamoDB API: Error retrieving tables', {
      component: 'DynamoDB API',
      operation: 'GET',
      data: {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : 'Unknown error'
      }
    });

    return NextResponse.json(
      {
        error: 'Failed to list tables',
        message: error instanceof Error ? error.message : 'An unknown error occurred',
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  logger.info('DynamoDB API: Handling POST request for table creation', {
    component: 'DynamoDB API',
    operation: 'POST'
  });

  try {
    validateEnvVars();

    const body = await request.json();
    logger.info('DynamoDB API: Received table creation request', {
      component: 'DynamoDB API',
      operation: 'POST',
      data: { tableName: body.TableName }
    });

    const createTableParams = {
      TableName: body.TableName,
      AttributeDefinitions: [
        {
          AttributeName: body.PartitionKey.name,
          AttributeType: body.PartitionKey.type.charAt(0)
        },
        ...(body.SortKey ? [{
          AttributeName: body.SortKey.name,
          AttributeType: body.SortKey.type.charAt(0)
        }] : [])
      ],
      KeySchema: [
        {
          AttributeName: body.PartitionKey.name,
          KeyType: 'HASH'
        },
        ...(body.SortKey ? [{
          AttributeName: body.SortKey.name,
          KeyType: 'RANGE'
        }] : [])
      ],
      BillingMode: body.BillingMode,
      ...(body.BillingMode === 'PROVISIONED' && {
        ProvisionedThroughput: {
          ReadCapacityUnits: body.ProvisionedThroughput.ReadCapacityUnits,
          WriteCapacityUnits: body.ProvisionedThroughput.WriteCapacityUnits
        }
      }),
      ...(body.Tags && {
        Tags: body.Tags
      })
    };

    const command = new CreateTableCommand(createTableParams);
    const response = await dynamoDBClient.send(command);

    logger.info('DynamoDB API: Successfully created table', {
      component: 'DynamoDB API',
      operation: 'POST',
      data: { 
        tableName: body.TableName,
        tableArn: response.TableDescription?.TableArn
      }
    });

    return NextResponse.json({
      tableName: response.TableDescription?.TableName,
      requestId: response.$metadata.requestId,
      timestamp: new Date().toISOString()
    }, { status: 201 });
  } catch (error) {
    logger.error('DynamoDB API: Error creating table', {
      component: 'DynamoDB API',
      operation: 'POST',
      data: {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : 'Unknown error'
      }
    });

    return NextResponse.json(
      {
        error: 'Failed to create table',
        message: error instanceof Error ? error.message : 'An unknown error occurred',
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  logger.info('DynamoDB API: Handling DELETE request for table', {
    component: 'DynamoDB API',
    operation: 'DELETE'
  });

  try {
    validateEnvVars();

    const tableName = request.url.split('/').pop();
    if (!tableName) {
      throw new Error('Table name is required');
    }

    logger.info('DynamoDB API: Attempting to delete table', {
      component: 'DynamoDB API',
      operation: 'DELETE',
      data: { tableName }
    });

    const command = new DeleteTableCommand({
      TableName: tableName
    });

    const response = await dynamoDBClient.send(command);

    logger.info('DynamoDB API: Successfully deleted table', {
      component: 'DynamoDB API',
      operation: 'DELETE',
      data: { 
        tableName,
        requestId: response.$metadata.requestId
      }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logger.error('DynamoDB API: Error deleting table', {
      component: 'DynamoDB API',
      operation: 'DELETE',
      data: {
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