import { logger } from '@/app/utils/logger';

export interface IAMRole {
  RoleName: string;
  RoleId: string;
  Arn: string;
  CreateDate: string;
  AssumeRolePolicyDocument: string;
  Description?: string;
  MaxSessionDuration?: number;
  Path?: string;
  Tags?: Array<{ Key: string; Value: string }>;
}

export interface IAMResponse {
  roles: IAMRole[];
  requestId: string;
  timestamp: string;
}

export interface IAMError {
  error: string;
  message: string;
  requestId: string;
  timestamp: string;
}

export interface CreateRoleParams {
  RoleName: string;
  AssumeRolePolicyDocument: string | {
    Version: string;
    Statement: Array<{
      Effect: string;
      Principal: Record<string, string | string[]>;
      Action: string | string[];
    }>;
  };
  Description?: string;
  MaxSessionDuration?: number;
  Path?: string;
  Tags?: Array<{ Key: string; Value: string }>;
}

export async function listRoles(): Promise<IAMResponse> {
  logger.info('Initiating request to list IAM roles', {
    component: 'IAMService'
  });
  
  try {
    const response = await fetch('/api/iam/roles');
    
    if (!response.ok) {
      const errorData: IAMError = await response.json();
      logger.error('Failed to list IAM roles', {
        component: 'IAMService',
        data: {
          status: response.status,
          error: errorData
        }
      });
      throw new Error(errorData.message || 'Failed to fetch IAM roles');
    }

    const data: IAMResponse = await response.json();
    logger.info('Successfully retrieved IAM roles', {
      component: 'IAMService',
      data: {
        count: data.roles.length,
        requestId: data.requestId
      }
    });

    return data;
  } catch (error) {
    logger.error('Error in listRoles', {
      component: 'IAMService',
      data: {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    });
    throw error;
  }
}

export async function createRole(params: CreateRoleParams): Promise<IAMRole> {
  logger.info('Creating IAM role', {
    component: 'IAMService',
    data: { roleName: params.RoleName }
  });

  try {
    const response = await fetch('/api/iam/roles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json();
      logger.error('Failed to create IAM role', {
        component: 'IAMService',
        data: {
          status: response.status,
          error: errorData
        }
      });
      throw new Error(errorData.message || 'Failed to create IAM role');
    }

    const data = await response.json();
    logger.info('IAM role created successfully', {
      component: 'IAMService',
      data: {
        roleName: params.RoleName,
        requestId: data.requestId
      }
    });

    return data.role;
  } catch (error) {
    logger.error('Error creating IAM role', {
      component: 'IAMService',
      data: {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    });
    throw error;
  }
} 