import { SNS } from '@aws-sdk/client-sns';
import { NextResponse } from 'next/server';
import { validateOpenAPI } from '@/app/middleware/openapi-validator';
import { NextRequest } from 'next/server';

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

async function handleDELETE(request: NextRequest, { params }: { params: { topicArn: string } }) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[SNS API][${requestId}] Handling DELETE request for topic: ${params.topicArn}`);

  try {
    const client = await getSNSClient();
    
    await client.deleteTopic({
      TopicArn: decodeURIComponent(params.topicArn)
    });

    console.log(`[SNS API][${requestId}] Successfully deleted topic: ${params.topicArn}`);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(`[SNS API][${requestId}] Error:`, error);

    if (error instanceof Error && error.name === 'ResourceNotFoundException') {
      return NextResponse.json(
        {
          error: 'Topic not found',
          message: 'The specified topic does not exist',
          requestId,
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to delete SNS topic',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ topicArn: string }> }
) {
  const { topicArn } = await context.params;
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[SNS API][${requestId}] Handling DELETE request for topic: ${topicArn}`);

  try {
    const client = await getSNSClient();
    
    await client.deleteTopic({
      TopicArn: decodeURIComponent(topicArn)
    });

    console.log(`[SNS API][${requestId}] Successfully deleted topic: ${topicArn}`);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(`[SNS API][${requestId}] Error:`, error);

    if (error instanceof Error && error.name === 'ResourceNotFoundException') {
      return NextResponse.json(
        {
          error: 'Topic not found',
          message: 'The specified topic does not exist',
          requestId,
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to delete SNS topic',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
} 