import { logger } from '@/app/utils/logger';

export interface S3Bucket {
  Name: string;
  CreationDate: string;
}

export interface CreateBucketParams {
  name: string;
  region?: string;
  versioning?: boolean;
  encryption?: 'AES256' | 'aws:kms';
}

export interface Bucket {
  Name?: string;
  CreationDate?: Date;
}

export interface S3Response {
  buckets: S3Bucket[];
  requestId: string;
  timestamp: string;
  region: string;
}

export interface S3Error {
  error: string;
  message: string;
  requestId: string;
  timestamp: string;
}

export async function listBuckets(): Promise<S3Response> {
  logger.info('Initiating request to list S3 buckets', {
    component: 'S3Service'
  });
  
  try {
    const response = await fetch('/api/s3');
    
    if (!response.ok) {
      const errorData: S3Error = await response.json();
      logger.error('Failed to list S3 buckets', {
        component: 'S3Service',
        data: {
          status: response.status,
          error: errorData
        }
      });
      throw new Error(errorData.message || 'Failed to fetch S3 buckets');
    }

    const data: S3Response = await response.json();
    logger.info('Successfully retrieved S3 buckets', {
      component: 'S3Service',
      data: {
        count: data.buckets.length,
        requestId: data.requestId,
        region: data.region
      }
    });

    return data;
  } catch (error) {
    logger.error('Error in listBuckets', {
      component: 'S3Service',
      data: {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    });
    throw error;
  }
}

export async function createBucket(params: CreateBucketParams): Promise<void> {
  logger.info('Creating S3 bucket', {
    component: 'S3Service',
    data: { bucketName: params.name }
  });

  try {
    const response = await fetch('/api/s3', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json();
      logger.error('Failed to create S3 bucket', {
        component: 'S3Service',
        data: {
          status: response.status,
          error: errorData
        }
      });
      throw new Error(errorData.message || 'Failed to create S3 bucket');
    }

    logger.info('S3 bucket created successfully', {
      component: 'S3Service',
      data: { bucketName: params.name }
    });
  } catch (error) {
    logger.error('Error creating S3 bucket', {
      component: 'S3Service',
      data: {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    });
    throw error;
  }
} 