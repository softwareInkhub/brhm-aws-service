import { NextRequest, NextResponse } from 'next/server';
import { APIGatewayClient, CreateRestApiCommand, GetRestApisCommand } from '@aws-sdk/client-api-gateway';
import { getAWSCredentials } from '../../utils/aws-credentials';
import { logger } from '../../utils/logger';

export async function GET() {
  try {
    const credentials = await getAWSCredentials();
    const client = new APIGatewayClient({ credentials });

    const command = new GetRestApisCommand({});
    const response = await client.send(command);

    return NextResponse.json(response.items?.map(api => ({
      id: api.id,
      name: api.name,
      description: api.description,
      createdDate: api.createdDate?.toISOString(),
      protocol: api.endpointConfiguration?.types?.includes('PRIVATE') ? 'HTTP' : 'REST',
      endpointConfiguration: {
        types: api.endpointConfiguration?.types || []
      }
    })) || []);
  } catch (error) {
    logger.error('Error listing API Gateway APIs', {
      component: 'APIGatewayRoute',
      data: {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : 'Unknown error'
      }
    });

    return NextResponse.json(
      { error: 'Failed to list API Gateway APIs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, endpointType, protocol } = body;

    const credentials = await getAWSCredentials();
    const client = new APIGatewayClient({ credentials });

    const command = new CreateRestApiCommand({
      name,
      description,
      endpointConfiguration: {
        types: [endpointType]
      },
      apiKeySource: 'HEADER',
      disableExecuteApiEndpoint: false
    });

    const response = await client.send(command);

    return NextResponse.json({
      id: response.id,
      name: response.name,
      description: response.description,
      createdDate: response.createdDate?.toISOString(),
      protocol,
      endpointConfiguration: {
        types: response.endpointConfiguration?.types || []
      }
    });
  } catch (error) {
    logger.error('Error creating API Gateway API', {
      component: 'APIGatewayRoute',
      data: {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : 'Unknown error'
      }
    });

    return NextResponse.json(
      { error: 'Failed to create API Gateway API' },
      { status: 500 }
    );
  }
} 