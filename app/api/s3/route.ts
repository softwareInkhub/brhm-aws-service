import { NextRequest, NextResponse } from 'next/server';
import { 
  S3Client, 
  ListBucketsCommand,
  CreateBucketCommand,
  DeleteBucketCommand,
  PutBucketCorsCommand,
  GetBucketCorsCommand,
  BucketLocationConstraint
} from '@aws-sdk/client-s3';
import { logger } from '@/app/utils/logger';

const COMPONENT_NAME = 'S3 API';
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

// Add CORS headers helper function
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

// Add OPTIONS handler for CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

function createResponse<T>(data: T, requestId: string, status: number = 200): NextResponse {
  return NextResponse.json({
    data,
    requestId,
    timestamp: new Date().toISOString()
  }, { 
    status,
    headers: corsHeaders()
  });
}

function createErrorResponse(error: Error | unknown, status: number = 500): NextResponse {
  const errorObj = error instanceof Error ? error : new Error('Unknown error');
  
  return NextResponse.json({
    error: errorObj.name,
    message: errorObj.message,
    requestId: crypto.randomUUID(),
    timestamp: new Date().toISOString()
  }, { 
    status,
    headers: corsHeaders()
  });
}

function validateEnvVars() {
  const requiredVars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    const error = `Missing required environment variables: ${missingVars.join(', ')}`;
    logger.error(`${COMPONENT_NAME}: Environment validation failed`, {
      component: COMPONENT_NAME,
      data: { missingVars }
    });
    throw new Error(error);
  }
}

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to retry an operation
async function retryOperation<T>(
  operation: () => Promise<T>,
  retries: number = MAX_RETRIES,
  delayMs: number = RETRY_DELAY
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (i < retries - 1) {
        logger.info(`${COMPONENT_NAME}: Operation failed, retrying in ${delayMs}ms (${i + 1}/${retries})`, {
          component: COMPONENT_NAME,
          data: { error: lastError.message }
        });
        await delay(delayMs);
      }
    }
  }

  throw lastError;
}

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// GET - List all buckets
export async function GET(request: NextRequest) {
  try {
    validateEnvVars();

    logger.info(`${COMPONENT_NAME}: Listing buckets`, {
      component: COMPONENT_NAME
    });

    const command = new ListBucketsCommand({});
    const response = await s3Client.send(command);

    logger.info(`${COMPONENT_NAME}: Retrieved buckets successfully`, {
      component: COMPONENT_NAME,
      data: { 
        bucketCount: response.Buckets?.length || 0
      }
    });

    return createResponse({
      buckets: response.Buckets || []
    }, response.$metadata.requestId!);
  } catch (error) {
    logger.error(`${COMPONENT_NAME}: Failed to list buckets`, {
      component: COMPONENT_NAME,
      data: {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : 'Unknown error'
      }
    });

    return createErrorResponse(error);
  }
}

// POST - Create a new bucket
export async function POST(request: NextRequest) {
  try {
    validateEnvVars();

    const body = await request.json();
    const { BucketName } = body;

    if (!BucketName) {
      return createErrorResponse(new Error('Bucket name is required'), 400);
    }

    // Check if bucket name is valid
    if (!/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(BucketName)) {
      return createErrorResponse(
        new Error('Invalid bucket name. Bucket names must be between 3 and 63 characters long and can contain only lowercase letters, numbers, dots (.), and hyphens (-).'),
        400
      );
    }

    logger.info(`${COMPONENT_NAME}: Creating bucket`, {
      component: COMPONENT_NAME,
      data: { BucketName }
    });

    // Create bucket with retry mechanism
    const createBucketOperation = async () => {
      try {
        const createCommand = new CreateBucketCommand({
          Bucket: BucketName,
          ...(process.env.AWS_REGION !== 'us-east-1' && {
            CreateBucketConfiguration: {
              LocationConstraint: process.env.AWS_REGION as BucketLocationConstraint
            }
          })
        });
        return await s3Client.send(createCommand);
      } catch (error: any) {
        // If bucket already exists with the same owner, consider it a success
        if (error.name === 'BucketAlreadyOwnedByYou') {
          logger.info(`${COMPONENT_NAME}: Bucket already exists and is owned by you`, {
            component: COMPONENT_NAME,
            data: { BucketName }
          });
          return { $metadata: { requestId: crypto.randomUUID() } };
        }
        // If bucket exists but is owned by someone else, provide a clear error
        if (error.name === 'BucketAlreadyExists') {
          throw new Error(`The bucket name "${BucketName}" is already taken by another AWS account. S3 bucket names must be globally unique across all AWS accounts. Please try a different name.`);
        }
        throw error;
      }
    };

    const createResponse = await retryOperation(createBucketOperation);

    // Wait before configuring CORS
    await delay(2000);

    // Configure CORS with retry mechanism
    const configureCorsOperation = async () => {
      try {
        const corsCommand = new PutBucketCorsCommand({
          Bucket: BucketName,
          CORSConfiguration: {
            CORSRules: [
              {
                AllowedHeaders: ['*'],
                AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
                AllowedOrigins: ['*'],
                ExposeHeaders: ['ETag'],
                MaxAgeSeconds: 3000
              }
            ]
          }
        });
        return await s3Client.send(corsCommand);
      } catch (error: any) {
        // Log CORS configuration error but don't fail the operation
        logger.error(`${COMPONENT_NAME}: Failed to configure CORS`, {
          component: COMPONENT_NAME,
          data: { 
            BucketName,
            error: error.message
          }
        });
        return { $metadata: { requestId: crypto.randomUUID() } };
      }
    };

    await retryOperation(configureCorsOperation);

    logger.info(`${COMPONENT_NAME}: Bucket created successfully`, {
      component: COMPONENT_NAME,
      data: { 
        BucketName,
        requestId: createResponse.$metadata.requestId
      }
    });

    return NextResponse.json({
      data: {
        bucket: {
          Name: BucketName,
          CreationDate: new Date().toISOString()
        }
      },
      requestId: createResponse.$metadata.requestId,
      timestamp: new Date().toISOString()
    }, { 
      status: 201,
      headers: corsHeaders()
    });
  } catch (error) {
    logger.error(`${COMPONENT_NAME}: Failed to create bucket`, {
      component: COMPONENT_NAME,
      data: {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : 'Unknown error'
      }
    });

    if (error instanceof Error) {
      return createErrorResponse(error, 409);
    }

    return createErrorResponse(error);
  }
}

// DELETE - Delete a bucket
export async function DELETE(request: NextRequest) {
  try {
    validateEnvVars();

    const body = await request.json();
    const { BucketName } = body;

    if (!BucketName) {
      return createErrorResponse(new Error('Bucket name is required'), 400);
    }

    logger.info(`${COMPONENT_NAME}: Deleting bucket`, {
      component: COMPONENT_NAME,
      data: { BucketName }
    });

    const command = new DeleteBucketCommand({
      Bucket: BucketName
    });
    const response = await s3Client.send(command);

    logger.info(`${COMPONENT_NAME}: Bucket deleted successfully`, {
      component: COMPONENT_NAME,
      data: { 
        BucketName,
        requestId: response.$metadata.requestId
      }
    });

    return new NextResponse(null, { 
      status: 204,
      headers: corsHeaders()
    });
  } catch (error) {
    logger.error(`${COMPONENT_NAME}: Failed to delete bucket`, {
      component: COMPONENT_NAME,
      data: {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : 'Unknown error'
      }
    });

    return createErrorResponse(error);
  }
} 