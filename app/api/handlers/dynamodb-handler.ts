import { DynamoDB, ScalarAttributeType, KeyType } from '@aws-sdk/client-dynamodb';
import { NextResponse } from 'next/server';

// Validate environment variables
const requiredEnvVars = {
  AWS_REGION: process.env.AWS_REGION,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
};

const missingEnvVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingEnvVars.length > 0) {
  console.error('[DynamoDB Handler] Missing environment variables:', missingEnvVars);
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

const dynamoClient = new DynamoDB({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function GET() {
  try {
    console.log('[DynamoDB Handler] Listing tables...');
    const { TableNames } = await dynamoClient.listTables({});
    console.log('[DynamoDB Handler] Tables retrieved:', TableNames);
    return NextResponse.json({ tables: TableNames || [] });
  } catch (error) {
    console.error('[DynamoDB Handler] Error listing tables:', error);
    return NextResponse.json(
      { 
        error: 'Failed to list DynamoDB tables',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tableName, partitionKey, sortKey, billingMode, readCapacity, writeCapacity } = body;

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

    await dynamoClient.createTable(createTableParams);
    return NextResponse.json({ message: 'Table created successfully' }, { status: 201 });
  } catch (error) {
    console.error('[DynamoDB Handler] Error creating table:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create DynamoDB table',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 