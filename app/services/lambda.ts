import { logger } from '@/app/utils/logger';

export interface LambdaFunction {
  FunctionName: string;
  Runtime: string;
  Handler: string;
  Role?: string;
  Code: {
    ZipFile?: string;
    S3Bucket?: string;
    S3Key?: string;
  };
  Environment?: {
    Variables: Record<string, string>;
  };
  MemorySize?: number;
  Timeout?: number;
  Tags?: Record<string, string>;
}

export interface LambdaResponse {
  functions: LambdaFunction[];
  requestId: string;
  timestamp: string;
}

export interface LambdaError {
  error: string;
  message: string;
  requestId: string;
  timestamp: string;
}

export async function listFunctions(): Promise<LambdaResponse> {
  logger.info('Initiating request to list Lambda functions', {
    component: 'LambdaService'
  });
  
  try {
    const response = await fetch('/api/lambda/functions');
    
    if (!response.ok) {
      const errorData: LambdaError = await response.json();
      logger.error('Failed to list Lambda functions', {
        component: 'LambdaService',
        data: {
          status: response.status,
          error: errorData
        }
      });
      throw new Error(errorData.message || 'Failed to fetch Lambda functions');
    }

    const data: LambdaResponse = await response.json();
    logger.info('Successfully retrieved Lambda functions', {
      component: 'LambdaService',
      data: {
        count: data.functions.length,
        requestId: data.requestId
      }
    });

    return data;
  } catch (error) {
    logger.error('Error in listFunctions', {
      component: 'LambdaService',
      data: {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    });
    throw error;
  }
}

export async function createFunction(params: LambdaFunction): Promise<LambdaFunction> {
  logger.info('Creating Lambda function', {
    component: 'LambdaService',
    data: { functionName: params.FunctionName }
  });

  try {
    const response = await fetch('/api/lambda/functions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json();
      logger.error('Failed to create Lambda function', {
        component: 'LambdaService',
        data: {
          status: response.status,
          error: errorData
        }
      });
      throw new Error(errorData.message || 'Failed to create Lambda function');
    }

    const data = await response.json();
    logger.info('Lambda function created successfully', {
      component: 'LambdaService',
      data: {
        functionName: params.FunctionName,
        requestId: data.requestId
      }
    });

    return data.function;
  } catch (error) {
    logger.error('Error creating Lambda function', {
      component: 'LambdaService',
      data: {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    });
    throw error;
  }
} 