import { logger } from '@/app/utils/logger';

export interface APIGateway {
  id: string;
  name: string;
  description?: string;
  createdDate: string;
  protocol: 'REST' | 'HTTP';
  endpointConfiguration: {
    types: string[];
  };
  resources?: APIResource[];
  stages?: APIStage[];
}

export interface APIResource {
  id: string;
  parentId?: string;
  path: string;
  pathPart?: string;
  methods?: APIMethod[];
}

export interface APIMethod {
  httpMethod: string;
  authorizationType: 'NONE' | 'AWS_IAM' | 'CUSTOM' | 'COGNITO_USER_POOLS';
  apiKeyRequired: boolean;
  integration: {
    type: string;
    uri?: string;
    integrationMethod?: string;
  };
}

export interface APIStage {
  stageName: string;
  deploymentId: string;
  description?: string;
  createdDate: string;
}

export interface CreateAPIParams {
  name: string;
  description?: string;
  endpointType: 'REGIONAL' | 'EDGE' | 'PRIVATE';
  protocol: 'REST' | 'HTTP';
}

export interface CreateResourceParams {
  apiId: string;
  parentId: string;
  pathPart: string;
}

export interface CreateMethodParams extends APIMethod {
  apiId: string;
  resourceId: string;
}

export interface CreateDeploymentParams {
  apiId: string;
  stageName: string;
  description?: string;
}

export async function listAPIs(): Promise<APIGateway[]> {
  logger.info('Listing API Gateway APIs', {
    component: 'APIGatewayService'
  });

  try {
    const response = await fetch('/api/apigateway');
    if (!response.ok) {
      throw new Error('Failed to fetch APIs');
    }
    return response.json();
  } catch (error) {
    logger.error('Error listing APIs', {
      component: 'APIGatewayService',
      data: {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : 'Unknown error'
      }
    });
    throw error;
  }
}

export async function createAPI(params: CreateAPIParams): Promise<APIGateway> {
  logger.info('Creating API Gateway API', {
    component: 'APIGatewayService',
    data: { params }
  });

  try {
    const response = await fetch('/api/apigateway', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error('Failed to create API');
    }
    return response.json();
  } catch (error) {
    logger.error('Error creating API', {
      component: 'APIGatewayService',
      data: {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : 'Unknown error'
      }
    });
    throw error;
  }
}

export async function createResource(params: CreateResourceParams): Promise<APIResource> {
  logger.info('Creating API resource', {
    component: 'APIGatewayService',
    data: { params }
  });

  try {
    const response = await fetch(`/api/apigateway/${params.apiId}/resources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error('Failed to create resource');
    }
    return response.json();
  } catch (error) {
    logger.error('Error creating resource', {
      component: 'APIGatewayService',
      data: {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : 'Unknown error'
      }
    });
    throw error;
  }
}

export async function createMethod(params: CreateMethodParams): Promise<APIMethod> {
  logger.info('Creating API method', {
    component: 'APIGatewayService',
    data: { params }
  });

  try {
    const response = await fetch(`/api/apigateway/${params.apiId}/resources/${params.resourceId}/methods`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error('Failed to create method');
    }
    return response.json();
  } catch (error) {
    logger.error('Error creating method', {
      component: 'APIGatewayService',
      data: {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : 'Unknown error'
      }
    });
    throw error;
  }
}

export async function createDeployment(params: CreateDeploymentParams): Promise<APIStage> {
  logger.info('Creating API deployment', {
    component: 'APIGatewayService',
    data: { params }
  });

  try {
    const response = await fetch(`/api/apigateway/${params.apiId}/deployments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error('Failed to create deployment');
    }
    return response.json();
  } catch (error) {
    logger.error('Error creating deployment', {
      component: 'APIGatewayService',
      data: {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : 'Unknown error'
      }
    });
    throw error;
  }
}

export async function deleteAPI(apiId: string): Promise<void> {
  logger.info('Deleting API Gateway API', {
    component: 'APIGatewayService',
    data: { apiId }
  });

  try {
    const response = await fetch(`/api/apigateway/${apiId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete API');
    }
  } catch (error) {
    logger.error('Error deleting API', {
      component: 'APIGatewayService',
      data: {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : 'Unknown error'
      }
    });
    throw error;
  }
} 