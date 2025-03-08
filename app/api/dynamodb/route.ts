import { DynamoDB, ScalarAttributeType, KeyType } from '@aws-sdk/client-dynamodb';
import { NextResponse } from 'next/server';
import { validateOpenAPI } from '@/app/middleware/openapi-validator';
import { NextRequest } from 'next/server';

let dynamoClient: DynamoDB;
let initError: Error | null = null;

function validateEnvVars() {
  console.log('[DynamoDB API] Checking environment variables...');
  console.log('[DynamoDB API] Environment:', {
    region: process.env.AWS_REGION,
    hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
    hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
  });

  const requiredEnvVars = {
    AWS_REGION: process.env.AWS_REGION,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  };

  const missingEnvVars = Object.entries(requiredEnvVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingEnvVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  }
}

try {
  validateEnvVars();

  console.log('[DynamoDB API] Initializing DynamoDB client...');
  console.log('[DynamoDB API] Using region:', process.env.AWS_REGION);

  dynamoClient = new DynamoDB({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  console.log('[DynamoDB API] DynamoDB client initialized successfully');
} catch (error) {
  console.error('[DynamoDB API] Initialization error:', error);
  initError = error instanceof Error ? error : new Error('Unknown initialization error');
}

async function handleGET() {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[DynamoDB][${requestId}] ====== List Tables Started ======`);

  // Check for initialization errors
  if (initError) {
    console.error(`[DynamoDB][${requestId}] Initialization error detected`);
    return NextResponse.json(
      {
        error: 'DynamoDB client initialization failed',
        message: initError.message,
        requestId,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }

  try {
    console.log(`[DynamoDB][${requestId}] Region: ${process.env.AWS_REGION}`);
    console.log(`[DynamoDB][${requestId}] Credentials present:`, {
      hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY
    });

    console.log(`[DynamoDB][${requestId}] Calling listTables API...`);
    const startTime = Date.now();
    
    const { TableNames } = await dynamoClient.listTables({});
    
    const duration = Date.now() - startTime;
    console.log(`[DynamoDB][${requestId}] API call completed in ${duration}ms`);
    console.log(`[DynamoDB][${requestId}] Tables retrieved successfully`);
    console.log(`[DynamoDB][${requestId}] Number of tables: ${TableNames?.length || 0}`);
    console.log(`[DynamoDB][${requestId}] Table names:`, TableNames);
    console.log(`[DynamoDB][${requestId}] ====== List Tables Completed ======`);
    
    return NextResponse.json({ 
      tables: TableNames || [], 
      requestId,
      timestamp: new Date().toISOString(),
      region: process.env.AWS_REGION
    });
  } catch (error) {
    console.error(`[DynamoDB][${requestId}] ====== Error ======`);
    console.error(`[DynamoDB][${requestId}] Error type:`, error instanceof Error ? error.constructor.name : typeof error);
    console.error(`[DynamoDB][${requestId}] Error message:`, error instanceof Error ? error.message : 'Unknown error');
    console.error(`[DynamoDB][${requestId}] Error details:`, error);
    
    if (error instanceof Error) {
      if (error.message.includes('credentials')) {
        return NextResponse.json(
          { 
            error: 'AWS Authentication Failed',
            message: 'Invalid or missing AWS credentials',
            requestId 
          },
          { status: 401 }
        );
      }
      if (error.message.includes('region')) {
        return NextResponse.json(
          { 
            error: 'AWS Configuration Error',
            message: 'Invalid or missing AWS region',
            requestId 
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { 
        error: 'Failed to list DynamoDB tables',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

async function handlePOST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[DynamoDB][${requestId}] ====== Create Table Started ======`);

  try {
    const body = await request.json();
    console.log(`[DynamoDB][${requestId}] Request body:`, body);

    const { tableName, partitionKey, sortKey, billingMode, readCapacity, writeCapacity } = body;

    console.log(`[DynamoDB][${requestId}] Validating input parameters...`);
    if (!tableName || !partitionKey) {
      console.error(`[DynamoDB][${requestId}] Missing required parameters`);
      return NextResponse.json(
        { error: 'tableName and partitionKey are required', requestId },
        { status: 400 }
      );
    }

    const createTableParams = {
      TableName: tableName,
      KeySchema: [
        { AttributeName: partitionKey, KeyType: 'HASH' as KeyType },
        ...(sortKey ? [{ AttributeName: sortKey, KeyType: 'RANGE' as KeyType }] : []),
      ],
      AttributeDefinitions: [
        { AttributeName: partitionKey, AttributeType: 'S' as ScalarAttributeType },
        ...(sortKey ? [{ AttributeName: sortKey, AttributeType: 'S' as ScalarAttributeType }] : []),
      ],
      BillingMode: billingMode as 'PROVISIONED' | 'PAY_PER_REQUEST',
      ...(billingMode === 'PROVISIONED' && {
        ProvisionedThroughput: {
          ReadCapacityUnits: readCapacity,
          WriteCapacityUnits: writeCapacity,
        },
      }),
    };

    console.log(`[DynamoDB][${requestId}] Creating table with params:`, createTableParams);
    const result = await dynamoClient.createTable(createTableParams);
    
    console.log(`[DynamoDB][${requestId}] Table created successfully`);
    console.log(`[DynamoDB][${requestId}] Table details:`, result.TableDescription);
    console.log(`[DynamoDB][${requestId}] ====== Create Table Completed ======`);

    return NextResponse.json(
      { 
        message: 'Table created successfully', 
        tableName,
        tableArn: result.TableDescription?.TableArn,
        requestId 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(`[DynamoDB][${requestId}] ====== Error ======`);
    console.error(`[DynamoDB][${requestId}] Error creating table:`, error);
    console.error(`[DynamoDB][${requestId}] Stack trace:`, error instanceof Error ? error.stack : 'No stack trace');
    console.error(`[DynamoDB][${requestId}] ====== Create Table Failed ======`);
    
    return NextResponse.json(
      { 
        error: 'Failed to create DynamoDB table',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId 
      },
      { status: 500 }
    );
  }
}

export const GET = (request: NextRequest) => validateOpenAPI(request, handleGET);
export const POST = (request: NextRequest) => validateOpenAPI(request, handlePOST); 