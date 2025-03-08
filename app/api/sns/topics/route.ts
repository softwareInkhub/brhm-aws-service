import { SNS } from '@aws-sdk/client-sns';
import { NextResponse } from 'next/server';
import { validateOpenAPI } from '@/app/middleware/openapi-validator';
import { NextRequest } from 'next/server';

interface SNSTag {
  Key: string;
  Value: string;
}

interface CreateTopicBody {
  Name: string;
  DisplayName?: string;
  Policy?: string | object;
  DeliveryPolicy?: string | object;
  Tags?: SNSTag[];
}

let snsClient: SNS | null = null;

function validateEnvVars() {
  console.log('[SNS API] Validating environment variables...');
  const requiredEnvVars = {
    AWS_REGION: process.env.AWS_REGION,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  };

  console.log('[SNS API] Environment variables state:', {
    region: process.env.AWS_REGION,
    hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
    hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
    nodeEnv: process.env.NODE_ENV,
  });

  const missingVars = Object.entries(requiredEnvVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  return requiredEnvVars;
}

async function getSNSClient() {
  if (snsClient) return snsClient;

  try {
    console.log('[SNS API] Initializing SNS client...');
    const envVars = validateEnvVars();

    snsClient = new SNS({
      region: envVars.AWS_REGION,
      credentials: {
        accessKeyId: envVars.AWS_ACCESS_KEY_ID!,
        secretAccessKey: envVars.AWS_SECRET_ACCESS_KEY!,
      },
    });

    console.log('[SNS API] SNS client initialized successfully');
    return snsClient;
  } catch (error) {
    console.error('[SNS API] Failed to initialize SNS client:', error);
    throw error;
  }
}

async function handleGET(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[SNS API][${requestId}] Handling GET request for listing topics`);

  try {
    const client = await getSNSClient();
    console.log(`[SNS API][${requestId}] Listing topics...`);
    
    const { Topics } = await client.listTopics({});
    
    console.log(`[SNS API][${requestId}] Found ${Topics?.length || 0} topics`);

    return NextResponse.json({
      topics: Topics || [],
      requestId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[SNS API][${requestId}] Error:`, error);

    if (error instanceof Error && error.message.includes('credentials')) {
      return NextResponse.json(
        {
          error: 'AWS Authentication Failed',
          message: 'Invalid or missing AWS credentials',
          requestId,
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to list SNS topics',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

async function handlePOST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[SNS API][${requestId}] Handling POST request for creating topic`);

  try {
    const client = await getSNSClient();
    const body = await request.json() as CreateTopicBody;
    
    const {
      Name,
      DisplayName,
      Policy,
      DeliveryPolicy,
      Tags,
    } = body;

    if (!Name) {
      return NextResponse.json(
        {
          error: 'Missing required parameters',
          message: 'Name is required',
          requestId,
        },
        { status: 400 }
      );
    }

    const createTopicParams = {
      Name,
      Attributes: {
        ...(DisplayName && { DisplayName }),
        ...(Policy && { Policy: typeof Policy === 'string' ? Policy : JSON.stringify(Policy) }),
        ...(DeliveryPolicy && { DeliveryPolicy: typeof DeliveryPolicy === 'string' ? DeliveryPolicy : JSON.stringify(DeliveryPolicy) }),
      },
      Tags: Tags?.map(({ Key, Value }: SNSTag) => ({ Key, Value })),
    };

    const result = await client.createTopic(createTopicParams);

    return NextResponse.json(
      {
        message: 'Topic created successfully',
        topicArn: result.TopicArn,
        requestId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(`[SNS API][${requestId}] Error:`, error);

    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json(
        {
          error: 'Topic already exists',
          message: error.message,
          requestId,
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to create SNS topic',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      },
      { status: 500 }
    );
  }
}

export const GET = (request: NextRequest) => validateOpenAPI(request, handleGET);
export const POST = (request: NextRequest) => validateOpenAPI(request, handlePOST); 