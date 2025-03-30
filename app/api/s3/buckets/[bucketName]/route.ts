import { NextRequest, NextResponse } from 'next/server';
import { 
  S3Client, 
  ListObjectsV2Command,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand
} from '@aws-sdk/client-s3';
import { logger } from '@/app/utils/logger';

const COMPONENT_NAME = 'S3 Bucket API';

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

function createResponse<T>(data: T, requestId: string, status: number = 200): NextResponse<{ data: T; requestId: string; timestamp: string }> {
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

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// GET - List objects in bucket
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ bucketName: string }> }
) {
  try {
    validateEnvVars();
    const { bucketName } = await context.params;
    const { searchParams } = new URL(request.url);
    const prefix = searchParams.get('prefix') || '';
    const delimiter = searchParams.get('delimiter') || '/';

    logger.info(`${COMPONENT_NAME}: Listing objects in bucket`, {
      component: COMPONENT_NAME,
      data: { bucketName, prefix, delimiter }
    });

    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
      Delimiter: delimiter
    });
    const response = await s3Client.send(command);

    logger.info(`${COMPONENT_NAME}: Retrieved objects successfully`, {
      component: COMPONENT_NAME,
      data: { 
        bucketName,
        objectCount: response.Contents?.length || 0
      }
    });

    return createResponse({
      objects: response.Contents || [],
      commonPrefixes: response.CommonPrefixes || [],
      prefix,
      delimiter
    }, response.$metadata.requestId!);
  } catch (error) {
    logger.error(`${COMPONENT_NAME}: Failed to list objects`, {
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

// POST - Upload object to bucket
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ bucketName: string }> }
) {
  try {
    validateEnvVars();
    const { bucketName } = await context.params;
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const key = formData.get('key') as string || file.name;

    if (!file) {
      return createErrorResponse(new Error('No file provided'), 400);
    }

    logger.info(`${COMPONENT_NAME}: Uploading object to bucket`, {
      component: COMPONENT_NAME,
      data: { bucketName, key, fileSize: file.size }
    });

    const buffer = await file.arrayBuffer();
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: Buffer.from(buffer),
      ContentType: file.type,
      Metadata: {
        'original-name': file.name,
        'content-type': file.type,
        'last-modified': new Date().toISOString()
      }
    });
    const response = await s3Client.send(command);

    logger.info(`${COMPONENT_NAME}: Object uploaded successfully`, {
      component: COMPONENT_NAME,
      data: { 
        bucketName,
        key,
        requestId: response.$metadata.requestId
      }
    });

    return createResponse({
      key,
      etag: response.ETag,
      versionId: response.VersionId
    }, response.$metadata.requestId!, 201);
  } catch (error) {
    logger.error(`${COMPONENT_NAME}: Failed to upload object`, {
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

// DELETE - Delete object from bucket
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ bucketName: string }> }
) {
  try {
    validateEnvVars();
    const { bucketName } = await context.params;
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return createErrorResponse(new Error('Object key is required'), 400);
    }

    logger.info(`${COMPONENT_NAME}: Deleting object from bucket`, {
      component: COMPONENT_NAME,
      data: { bucketName, key }
    });

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key
    });
    const response = await s3Client.send(command);

    logger.info(`${COMPONENT_NAME}: Object deleted successfully`, {
      component: COMPONENT_NAME,
      data: { 
        bucketName,
        key,
        requestId: response.$metadata.requestId
      }
    });

    return new NextResponse(null, { 
      status: 204,
      headers: corsHeaders()
    });
  } catch (error) {
    logger.error(`${COMPONENT_NAME}: Failed to delete object`, {
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