import { IAM } from '@aws-sdk/client-iam';
import { NextResponse } from 'next/server';
import { validateOpenAPI } from '@/app/middleware/openapi-validator';
import { NextRequest } from 'next/server';

let iamClient: IAM | null = null;

function validateEnvVars() {
  console.log('[IAM API] Validating environment variables...');
  const requiredEnvVars = {
    AWS_REGION: process.env.AWS_REGION,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  };

  console.log('[IAM API] Environment variables state:', {
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

async function getIAMClient() {
  if (iamClient) return iamClient;

  try {
    console.log('[IAM API] Initializing IAM client...');
    const envVars = validateEnvVars();

    iamClient = new IAM({
      region: envVars.AWS_REGION,
      credentials: {
        accessKeyId: envVars.AWS_ACCESS_KEY_ID!,
        secretAccessKey: envVars.AWS_SECRET_ACCESS_KEY!,
      },
    });

    console.log('[IAM API] IAM client initialized successfully');
    return iamClient;
  } catch (error) {
    console.error('[IAM API] Failed to initialize IAM client:', error);
    throw error;
  }
}

async function handleGET(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[IAM API][${requestId}] Handling GET request for listing policies`);

  try {
    const client = await getIAMClient();
    console.log(`[IAM API][${requestId}] Listing policies...`);
    
    const { Policies } = await client.listPolicies({
      Scope: 'All', // List all policies (AWS managed and customer managed)
      OnlyAttached: false, // Include unattached policies
    });
    
    console.log(`[IAM API][${requestId}] Found ${Policies?.length || 0} policies`);

    const formattedPolicies = Policies?.map(policy => ({
      PolicyName: policy.PolicyName,
      PolicyArn: policy.Arn,
      Description: policy.Description,
      UpdateDate: policy.UpdateDate?.toISOString(),
    })) || [];

    return NextResponse.json(formattedPolicies);
  } catch (error) {
    console.error(`[IAM API][${requestId}] Error:`, error);

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
        error: 'Failed to list IAM policies',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export const GET = (request: NextRequest) => validateOpenAPI(request, handleGET); 