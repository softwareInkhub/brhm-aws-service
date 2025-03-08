import { S3 } from '@aws-sdk/client-s3';
import { NextResponse } from 'next/server';
import { validateOpenAPI } from '@/app/middleware/openapi-validator';
import { NextRequest } from 'next/server';

let s3Client: S3 | null = null;

// Add immediate logging to debug environment variables
console.log('[S3 API] Environment variables at module load:', {
  AWS_REGION: process.env.AWS_REGION,
  HAS_ACCESS_KEY: !!process.env.AWS_ACCESS_KEY_ID,
  HAS_SECRET_KEY: !!process.env.AWS_SECRET_ACCESS_KEY,
  NODE_ENV: process.env.NODE_ENV
});

function validateEnvVars() {
  console.log('[S3 API] Validating environment variables...');
  const requiredEnvVars = {
    AWS_REGION: process.env.AWS_REGION,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  };

  console.log('[S3 API] Environment variables state:', {
    region: process.env.AWS_REGION,
    hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
    hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
    nodeEnv: process.env.NODE_ENV,
    appDir: process.cwd()
  });

  const missingVars = Object.entries(requiredEnvVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  return requiredEnvVars;
}

async function getS3Client() {
  if (s3Client) return s3Client;

  try {
    console.log('[S3 API] Initializing S3 client...');
    const envVars = validateEnvVars();

    s3Client = new S3({
      region: envVars.AWS_REGION,
      credentials: {
        accessKeyId: envVars.AWS_ACCESS_KEY_ID!,
        secretAccessKey: envVars.AWS_SECRET_ACCESS_KEY!,
      },
    });

    console.log('[S3 API] S3 client initialized successfully');
    return s3Client;
  } catch (error) {
    console.error('[S3 API] Failed to initialize S3 client:', error);
    throw error;
  }
}

async function handleGET(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[S3 API][${requestId}] Handling GET request for listing buckets`);

  try {
    const client = await getS3Client();
    console.log(`[S3 API][${requestId}] Listing buckets...`);
    
    const { Buckets } = await client.listBuckets({});
    
    console.log(`[S3 API][${requestId}] Found ${Buckets?.length || 0} buckets`);

    return NextResponse.json({
      buckets: Buckets || [],
      requestId,
      timestamp: new Date().toISOString(),
      region: process.env.AWS_REGION,
    });
  } catch (error) {
    console.error(`[S3 API][${requestId}] Error:`, error);

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
        error: 'Failed to list S3 buckets',
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
  console.log(`[S3 API][${requestId}] Handling POST request for creating bucket`);

  try {
    const client = await getS3Client();
    const body = await request.json();
    
    const { name, region, versioning, encryption } = body;

    if (!name) {
      return NextResponse.json(
        {
          error: 'Missing required parameters',
          message: 'Bucket name is required',
          requestId,
        },
        { status: 400 }
      );
    }

    const createBucketParams = {
      Bucket: name,
      CreateBucketConfiguration: {
        LocationConstraint: region || process.env.AWS_REGION
      }
    };

    await client.createBucket(createBucketParams);

    if (versioning) {
      await client.putBucketVersioning({
        Bucket: name,
        VersioningConfiguration: { Status: 'Enabled' }
      });
    }

    if (encryption) {
      await client.putBucketEncryption({
        Bucket: name,
        ServerSideEncryptionConfiguration: {
          Rules: [{
            ApplyServerSideEncryptionByDefault: { SSEAlgorithm: encryption }
          }]
        }
      });
    }

    return NextResponse.json(
      {
        message: 'Bucket created successfully',
        bucketName: name,
        requestId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(`[S3 API][${requestId}] Error:`, error);

    return NextResponse.json(
      {
        error: 'Failed to create S3 bucket',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      },
      { status: 500 }
    );
  }
}

export const GET = (request: NextRequest) => validateOpenAPI(request, handleGET);
export const POST = (request: NextRequest) => validateOpenAPI(request, handlePOST); 