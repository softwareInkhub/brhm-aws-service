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
  console.log(`[IAM API][${requestId}] Handling GET request for listing roles`);

  try {
    const client = await getIAMClient();
    console.log(`[IAM API][${requestId}] Listing roles...`);
    
    const { Roles } = await client.listRoles({});
    
    console.log(`[IAM API][${requestId}] Found ${Roles?.length || 0} roles`);

    return NextResponse.json({
      roles: Roles || [],
      requestId,
      timestamp: new Date().toISOString(),
    });
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
        error: 'Failed to list IAM roles',
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
  console.log(`[IAM API][${requestId}] Handling POST request for creating role`);

  try {
    const client = await getIAMClient();
    const body = await request.json();
    
    const {
      RoleName,
      AssumeRolePolicyDocument,
      Description,
      MaxSessionDuration,
      Path,
      Tags,
    } = body;

    if (!RoleName || !AssumeRolePolicyDocument) {
      return NextResponse.json(
        {
          error: 'Missing required parameters',
          message: 'RoleName and AssumeRolePolicyDocument are required',
          requestId,
        },
        { status: 400 }
      );
    }

    const createRoleParams = {
      RoleName,
      AssumeRolePolicyDocument: typeof AssumeRolePolicyDocument === 'string' 
        ? AssumeRolePolicyDocument 
        : JSON.stringify(AssumeRolePolicyDocument),
      Description,
      MaxSessionDuration,
      Path,
      Tags,
    };

    const result = await client.createRole(createRoleParams);

    return NextResponse.json(
      {
        message: 'Role created successfully',
        role: result.Role,
        requestId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(`[IAM API][${requestId}] Error:`, error);

    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json(
        {
          error: 'Role already exists',
          message: error.message,
          requestId,
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to create IAM role',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      },
      { status: 500 }
    );
  }
}

export const GET = (request: NextRequest) => validateOpenAPI(request, handleGET);
export const POST = (request: NextRequest) => validateOpenAPI(request, handlePOST); 