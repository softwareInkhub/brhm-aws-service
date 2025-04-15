import { NextRequest, NextResponse } from 'next/server';
import { APIGatewayClient, DeleteRestApiCommand, GetResourcesCommand } from '@aws-sdk/client-api-gateway';
import { getAWSCredentials } from '../../../utils/aws-credentials';
import { logger } from '@/app/utils/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ apiId: string }> }
) {
  const resolvedParams = await params;
  try {
    const credentials = await getAWSCredentials();
    const client = new APIGatewayClient({ credentials });

    const command = new GetResourcesCommand({
      restApiId: resolvedParams.apiId,
      embed: ['methods']
    });

    const response = await client.send(command);

    return NextResponse.json(response.items?.map(resource => ({
      id: resource.id,
      parentId: resource.parentId,
      path: resource.path,
      pathPart: resource.pathPart,
      methods: Object.entries(resource.resourceMethods || {}).map(([method, details]) => ({
        httpMethod: method,
        authorizationType: details.authorizationType,
        apiKeyRequired: details.apiKeyRequired,
        integration: {
          type: details.methodIntegration?.type,
          uri: details.methodIntegration?.uri,
          integrationMethod: details.methodIntegration?.httpMethod
        }
      }))
    })) || []);
  } catch (error) {
    logger.error('Error getting API Gateway resources', {
      component: 'APIGatewayRoute',
      data: {
        apiId: resolvedParams.apiId,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : 'Unknown error'
      }
    });

    return NextResponse.json(
      { error: 'Failed to get API Gateway resources' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ apiId: string }> }
) {
  const resolvedParams = await params;
  try {
    const credentials = await getAWSCredentials();
    const client = new APIGatewayClient({ credentials });

    const command = new DeleteRestApiCommand({
      restApiId: resolvedParams.apiId
    });

    await client.send(command);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logger.error('Error deleting API Gateway API', {
      component: 'APIGatewayRoute',
      data: {
        apiId: resolvedParams.apiId,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : 'Unknown error'
      }
    });

    return NextResponse.json(
      { error: 'Failed to delete API Gateway API' },
      { status: 500 }
    );
  }
} 