import { NextRequest, NextResponse } from 'next/server';
import { APIGatewayClient, PutMethodCommand, PutIntegrationCommand } from '@aws-sdk/client-api-gateway';
import { getAWSCredentials } from '@/app/utils/aws-credentials';
import { logger } from '@/app/utils/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ apiId: string; resourceId: string }> }
) {
  const resolvedParams = await params;
  try {
    const body = await request.json();
    const { httpMethod, authorizationType, apiKeyRequired, integration } = body;

    const credentials = await getAWSCredentials();
    const client = new APIGatewayClient({ credentials });

    // Create method
    const methodCommand = new PutMethodCommand({
      restApiId: resolvedParams.apiId,
      resourceId: resolvedParams.resourceId,
      httpMethod,
      authorizationType,
      apiKeyRequired
    });

    await client.send(methodCommand);

    // Create integration
    const integrationCommand = new PutIntegrationCommand({
      restApiId: resolvedParams.apiId,
      resourceId: resolvedParams.resourceId,
      httpMethod,
      type: integration.type,
      uri: integration.uri,
      integrationHttpMethod: integration.integrationMethod
    });

    await client.send(integrationCommand);

    return NextResponse.json({
      httpMethod,
      authorizationType,
      apiKeyRequired,
      integration: {
        type: integration.type,
        uri: integration.uri,
        integrationMethod: integration.integrationMethod
      }
    });
  } catch (error) {
    logger.error('Error creating API Gateway method', {
      component: 'APIGatewayRoute',
      data: {
        apiId: resolvedParams.apiId,
        resourceId: resolvedParams.resourceId,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : 'Unknown error'
      }
    });

    return NextResponse.json(
      { error: 'Failed to create API Gateway method' },
      { status: 500 }
    );
  }
} 