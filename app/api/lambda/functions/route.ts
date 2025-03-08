import { Lambda } from '@aws-sdk/client-lambda';
import { NextResponse } from 'next/server';
import { validateOpenAPI } from '@/app/middleware/openapi-validator';
import { NextRequest } from 'next/server';

let lambdaClient: Lambda | null = null;

function validateEnvVars() {
  console.log('[Lambda API] Validating environment variables...');
  const requiredEnvVars = {
    AWS_REGION: process.env.AWS_REGION,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_LAMBDA_ROLE_ARN: process.env.AWS_LAMBDA_ROLE_ARN,
  };

  console.log('[Lambda API] Environment variables state:', {
    region: process.env.AWS_REGION,
    hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
    hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
    hasRoleArn: !!process.env.AWS_LAMBDA_ROLE_ARN,
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

async function getLambdaClient() {
  if (lambdaClient) return lambdaClient;

  try {
    console.log('[Lambda API] Initializing Lambda client...');
    const envVars = validateEnvVars();

    lambdaClient = new Lambda({
      region: envVars.AWS_REGION,
      credentials: {
        accessKeyId: envVars.AWS_ACCESS_KEY_ID!,
        secretAccessKey: envVars.AWS_SECRET_ACCESS_KEY!,
      },
    });

    console.log('[Lambda API] Lambda client initialized successfully');
    return lambdaClient;
  } catch (error) {
    console.error('[Lambda API] Failed to initialize Lambda client:', error);
    throw error;
  }
}

async function handleGET(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[Lambda API][${requestId}] Handling GET request for listing functions`);

  try {
    const client = await getLambdaClient();
    console.log(`[Lambda API][${requestId}] Listing functions...`);
    
    const { Functions } = await client.listFunctions({});
    
    console.log(`[Lambda API][${requestId}] Found ${Functions?.length || 0} functions`);

    return NextResponse.json({
      functions: Functions || [],
      requestId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[Lambda API][${requestId}] Error:`, error);

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
        error: 'Failed to list Lambda functions',
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
  console.log(`[Lambda API][${requestId}] Handling POST request for creating function`);

  try {
    const client = await getLambdaClient();
    const body = await request.json();
    
    const {
      FunctionName,
      Runtime,
      Handler,
      Code,
      Environment,
      MemorySize,
      Timeout,
      Tags,
    } = body;

    if (!FunctionName || !Runtime || !Handler || !Code) {
      return NextResponse.json(
        {
          error: 'Missing required parameters',
          message: 'FunctionName, Runtime, Handler, and Code are required',
          requestId,
        },
        { status: 400 }
      );
    }

    const createFunctionParams = {
      FunctionName,
      Runtime,
      Handler,
      Role: process.env.AWS_LAMBDA_ROLE_ARN!,
      Code,
      Environment: Environment ? { Variables: Environment.Variables } : undefined,
      MemorySize: MemorySize || 128,
      Timeout: Timeout || 3,
      Tags,
    };

    const result = await client.createFunction(createFunctionParams);

    return NextResponse.json(
      {
        message: 'Function created successfully',
        function: result,
        requestId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(`[Lambda API][${requestId}] Error:`, error);

    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json(
        {
          error: 'Function already exists',
          message: error.message,
          requestId,
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to create Lambda function',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      },
      { status: 500 }
    );
  }
}

export const GET = (request: NextRequest) => validateOpenAPI(request, handleGET);
export const POST = (request: NextRequest) => validateOpenAPI(request, handlePOST); 