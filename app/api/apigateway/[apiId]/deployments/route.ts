import { NextRequest, NextResponse } from 'next/server';
import { APIGatewayClient, CreateDeploymentCommand, CreateStageCommand } from '@aws-sdk/client-api-gateway';
import { getAWSCredentials } from '@/app/utils/aws-credentials';
import { logger } from '@/app/utils/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ apiId: string }> }
) {
  const resolvedParams = await params;
  try {
    const body = await request.json();
    const { stageName, description } = body;

    const credentials = await getAWSCredentials();
    const client = new APIGatewayClient({ credentials });

    // Create deployment
    const deploymentCommand = new CreateDeploymentCommand({
      restApiId: resolvedParams.apiId,
      description,
      stageName
    });

    const deploymentResponse = await client.send(deploymentCommand);

    // Create stage
    const stageCommand = new CreateStageCommand({
      restApiId: resolvedParams.apiId,
      stageName,
      deploymentId: deploymentResponse.id,
      description
    });

    const stageResponse = await client.send(stageCommand);

    return NextResponse.json({
      stageName: stageResponse.stageName,
      deploymentId: stageResponse.deploymentId,
      description: stageResponse.description,
      createdDate: stageResponse.createdDate?.toISOString()
    });
  } catch (error) {
    logger.error('Error creating API Gateway deployment', {
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
      { error: 'Failed to create API Gateway deployment' },
      { status: 500 }
    );
  }
} 