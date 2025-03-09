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
    data: { operation: 'GET' }
  });

  try {
    validateEnvVars();

    const command = new ListTablesCommand({});
    const response = await dynamoDBClient.send(command);

    logger.info('DynamoDB API: Successfully retrieved tables', {
      component: 'DynamoDB API',
      data: { 
        operation: 'GET',
        tableCount: response.TableNames?.length || 0 
      }
    });

    return NextResponse.json({
      tables: response.TableNames || [],
      requestId: response.$metadata.requestId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('DynamoDB API: Error retrieving tables', {
      component: 'DynamoDB API',
      data: {
        operation: 'GET',
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
    data: { operation: 'POST' }
  });

  try {
    // Validate request body exists
    const body = await request.json();
    if (!body) {
      return NextResponse.json(
        { error: 'Request body is required' },
        { status: 400 }
      );
    }

    // Validate required fields
    const { TableName, KeySchema, AttributeDefinitions, BillingMode } = body;

    if (!TableName) {
      return NextResponse.json(
        { error: 'TableName is required' },
        { status: 400 }
      );
    }

    if (!KeySchema || !Array.isArray(KeySchema) || KeySchema.length === 0) {
      return NextResponse.json(
        { error: 'KeySchema must be a non-empty array' },
        { status: 400 }
      );
    }

    if (!AttributeDefinitions || !Array.isArray(AttributeDefinitions) || AttributeDefinitions.length === 0) {
      return NextResponse.json(
        { error: 'AttributeDefinitions must be a non-empty array' },
        { status: 400 }
      );
    }

    // Validate KeySchema structure
    const isValidKeySchema = KeySchema.every(key => 
      key.AttributeName && 
      key.KeyType && 
      ['HASH', 'RANGE'].includes(key.KeyType)
    );

    if (!isValidKeySchema) {
      return NextResponse.json(
        { 
          error: 'Invalid KeySchema format',
          details: 'Each key must have AttributeName and KeyType (HASH or RANGE)'
        },
        { status: 400 }
      );
    }

    // Validate AttributeDefinitions structure
    const isValidAttributeDefs = AttributeDefinitions.every(attr => 
      attr.AttributeName && 
      attr.AttributeType && 
      ['S', 'N', 'B'].includes(attr.AttributeType)
    );

    if (!isValidAttributeDefs) {
      return NextResponse.json(
        { 
          error: 'Invalid AttributeDefinitions format',
          details: 'Each attribute must have AttributeName and AttributeType (S, N, or B)'
        },
        { status: 400 }
      );
    }

    // Validate BillingMode and ProvisionedThroughput
    if (BillingMode && !['PROVISIONED', 'PAY_PER_REQUEST'].includes(BillingMode)) {
      return NextResponse.json(
        { 
          error: 'Invalid BillingMode',
          details: 'BillingMode must be either PROVISIONED or PAY_PER_REQUEST'
        },
        { status: 400 }
      );
    }

    if (BillingMode === 'PROVISIONED') {
      const { ProvisionedThroughput } = body;
      if (!ProvisionedThroughput || 
          typeof ProvisionedThroughput.ReadCapacityUnits !== 'number' || 
          typeof ProvisionedThroughput.WriteCapacityUnits !== 'number') {
        return NextResponse.json(
          { 
            error: 'Invalid ProvisionedThroughput',
            details: 'ProvisionedThroughput must include ReadCapacityUnits and WriteCapacityUnits as numbers'
          },
          { status: 400 }
        );
      }
    }

    // Validate that all KeySchema attributes are defined in AttributeDefinitions
    const keyAttributes = new Set(KeySchema.map(k => k.AttributeName));
    const definedAttributes = new Set(AttributeDefinitions.map(a => a.AttributeName));
    const missingAttributes = [...keyAttributes].filter(attr => !definedAttributes.has(attr));

    if (missingAttributes.length > 0) {
      return NextResponse.json(
        { 
          error: 'Missing AttributeDefinitions',
          details: `The following key attributes are not defined: ${missingAttributes.join(', ')}`
        },
        { status: 400 }
      );
    }

    logger.info('DynamoDB API: Creating table with params:', {
      component: 'DynamoDB API',
      data: { 
        operation: 'POST',
        tableName: TableName 
      }
    });

    const createTableParams = {
      TableName: TableName,
      AttributeDefinitions: AttributeDefinitions,
      KeySchema: KeySchema,
      BillingMode: BillingMode,
      ...(BillingMode === 'PROVISIONED' && {
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
      data: { 
        operation: 'POST',
        tableName: TableName,
        tableArn: response.TableDescription?.TableArn
      }
    });

    return NextResponse.json({
      tableName: response.TableDescription?.TableName,
      requestId: response.$metadata.requestId,
      timestamp: new Date().toISOString()
    }, { status: 201 });
  } catch (error: any) {
    logger.error('DynamoDB API: Error creating table', {
      component: 'DynamoDB API',
      data: {
        operation: 'POST',
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : 'Unknown error'
      }
    });

    // Handle specific AWS DynamoDB errors
    if (error.name === 'ResourceInUseException') {
      return NextResponse.json(
        { 
          error: 'Table already exists',
          details: error.message
        },
        { status: 409 }
      );
    }

    if (error.name === 'LimitExceededException') {
      return NextResponse.json(
        { 
          error: 'AWS service limits exceeded',
          details: error.message
        },
        { status: 429 }
      );
    }

    if (error.name === 'ValidationException') {
      return NextResponse.json(
        { 
          error: 'Invalid table configuration',
          details: error.message
        },
        { status: 400 }
      );
    }

    if (error.name === 'AccessDeniedException' || error.name === 'UnauthorizedException') {
      return NextResponse.json(
        { 
          error: 'Unauthorized',
          details: 'Check your AWS credentials and permissions'
        },
        { status: 403 }
      );
    }

    // Handle JSON parse errors
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
      return NextResponse.json(
        { 
          error: 'Invalid JSON in request body',
          details: error.message
        },
        { status: 400 }
      );
    }

    // Generic error handler
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  logger.info('DynamoDB API: Handling DELETE request for table', {
    component: 'DynamoDB API',
    data: { operation: 'DELETE' }
  });

  try {
    validateEnvVars();

    const tableName = request.url.split('/').pop();
    if (!tableName) {
      throw new Error('Table name is required');
    }

    logger.info('DynamoDB API: Attempting to delete table', {
      component: 'DynamoDB API',
      data: { 
        operation: 'DELETE',
        tableName 
      }
    });

    const command = new DeleteTableCommand({
      TableName: tableName
    });

    const response = await dynamoDBClient.send(command);

    logger.info('DynamoDB API: Successfully deleted table', {
      component: 'DynamoDB API',
      data: { 
        operation: 'DELETE',
        tableName,
        requestId: response.$metadata.requestId
      }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logger.error('DynamoDB API: Error deleting table', {
      component: 'DynamoDB API',
      data: {
        operation: 'DELETE',
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