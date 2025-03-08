import { Lambda } from '@aws-sdk/client-lambda';
import { NextResponse } from 'next/server';
import { validateOpenAPI } from '@/app/middleware/openapi-validator';
import { NextRequest } from 'next/server';

let lambdaClient: Lambda;
let initError: Error | null = null;

try {
  console.log('[Lambda API] Checking environment variables...');
  const requiredEnvVars = {
    AWS_REGION: process.env.AWS_REGION,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_LAMBDA_ROLE_ARN: process.env.AWS_LAMBDA_ROLE_ARN,
  };

  const missingEnvVars = Object.entries(requiredEnvVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingEnvVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  }

  console.log('[Lambda API] Initializing Lambda client...');
  console.log('[Lambda API] Using region:', process.env.AWS_REGION);

  lambdaClient = new Lambda({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  console.log('[Lambda API] Lambda client initialized successfully');
} catch (error) {
  console.error('[Lambda API] Initialization error:', error);
  initError = error instanceof Error ? error : new Error('Unknown initialization error');
}

async function handleGET() {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[Lambda][${requestId}] ====== List Functions Started ======`);

  if (initError) {
    console.error(`[Lambda][${requestId}] Initialization error detected`);
    return NextResponse.json(
      {
        error: 'Lambda client initialization failed',
        message: initError.message,
        requestId,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }

  try {
    console.log(`[Lambda][${requestId}] Calling listFunctions API...`);
    const startTime = Date.now();
    
    const { Functions } = await lambdaClient.listFunctions({});
    
    const duration = Date.now() - startTime;
    console.log(`[Lambda][${requestId}] API call completed in ${duration}ms`);
    console.log(`[Lambda][${requestId}] Functions retrieved successfully`);
    console.log(`[Lambda][${requestId}] Number of functions: ${Functions?.length || 0}`);
    
    return NextResponse.json({ 
      functions: Functions || [], 
      requestId,
      timestamp: new Date().toISOString(),
      region: process.env.AWS_REGION
    });
  } catch (error) {
    console.error(`[Lambda][${requestId}] ====== Error ======`);
    console.error(`[Lambda][${requestId}] Error type:`, error instanceof Error ? error.constructor.name : typeof error);
    console.error(`[Lambda][${requestId}] Error message:`, error instanceof Error ? error.message : 'Unknown error');
    
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
    }

    return NextResponse.json(
      { 
        error: 'Failed to list Lambda functions',
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
  console.log(`[Lambda][${requestId}] ====== Create Function Started ======`);

  try {
    const body = await request.json();
    console.log(`[Lambda][${requestId}] Request body:`, body);

    const { functionName, runtime, handler, code, environment, timeout = 3, memorySize = 128 } = body;

    if (!functionName || !runtime || !handler || !code) {
      return NextResponse.json(
        { 
          error: 'Missing required parameters',
          message: 'functionName, runtime, handler, and code are required',
          requestId 
        },
        { status: 400 }
      );
    }

    const createFunctionParams = {
      FunctionName: functionName,
      Runtime: runtime,
      Handler: handler,
      Role: process.env.AWS_LAMBDA_ROLE_ARN,
      Code: {
        ZipFile: Buffer.from(code)
      },
      Environment: environment ? {
        Variables: environment
      } : undefined,
      Timeout: timeout,
      MemorySize: memorySize
    };

    console.log(`[Lambda][${requestId}] Creating function with params:`, {
      ...createFunctionParams,
      Code: { ZipFile: 'Buffer content omitted' }
    });

    const result = await lambdaClient.createFunction(createFunctionParams);
    
    console.log(`[Lambda][${requestId}] Function created successfully`);
    console.log(`[Lambda][${requestId}] Function details:`, result);

    return NextResponse.json(
      { 
        message: 'Function created successfully',
        functionArn: result.FunctionArn,
        requestId 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(`[Lambda][${requestId}] ====== Error ======`);
    console.error(`[Lambda][${requestId}] Error creating function:`, error);
    
    return NextResponse.json(
      { 
        error: 'Failed to create Lambda function',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId 
      },
      { status: 500 }
    );
  }
}

export const GET = (request: NextRequest) => validateOpenAPI(request, handleGET);
export const POST = (request: NextRequest) => validateOpenAPI(request, handlePOST); 