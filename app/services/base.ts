import { logger } from '@/app/utils/logger';

export interface LogOptions {
  component: string;
  data?: any;
}

export interface AWSResponse<T> {
  data: T;
  requestId: string;
  timestamp: string;
}

export interface AWSError {
  error: string;
  message: string;
  requestId: string;
  timestamp: string;
}

export abstract class AWSService {
  protected region: string;
  protected credentials: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  protected serviceName: string;

  constructor(serviceName: string) {
    this.validateEnvVars();
    this.region = process.env.AWS_REGION!;
    this.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    };
    this.serviceName = serviceName;
  }

  protected validateEnvVars() {
    const requiredVars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      const error = `Missing required environment variables: ${missingVars.join(', ')}`;
      this.logError('Environment validation failed', { missingVars });
      throw new Error(error);
    }
  }

  protected createResponse<T>(data: T, requestId: string): AWSResponse<T> {
    return {
      data,
      requestId,
      timestamp: new Date().toISOString()
    };
  }

  protected createError(error: Error | unknown, requestId?: string): AWSError {
    const errorObj = error instanceof Error ? error : new Error('Unknown error');
    
    this.logError('Operation failed', {
      error: {
        name: errorObj.name,
        message: errorObj.message,
        stack: errorObj.stack
      }
    });

    return {
      error: errorObj.name,
      message: errorObj.message,
      requestId: requestId || crypto.randomUUID(),
      timestamp: new Date().toISOString()
    };
  }

  protected logInfo(message: string, data?: any) {
    logger.info(`${this.serviceName}: ${message}`, {
      component: this.serviceName,
      data
    });
  }

  protected logError(message: string, data?: any) {
    logger.error(`${this.serviceName}: ${message}`, {
      component: this.serviceName,
      data
    });
  }

  protected logOperation(operation: string, data?: any) {
    this.logInfo(`Operation: ${operation}`, data);
  }
} 