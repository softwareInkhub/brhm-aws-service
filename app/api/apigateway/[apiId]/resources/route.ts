import { NextRequest, NextResponse } from 'next/server';
import { APIGatewayClient, CreateResourceCommand } from '@aws-sdk/client-api-gateway';
import { getAWSCredentials } from '@/app/utils/aws-credentials';
import { logger } from '@/app/utils/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ apiId: string }> }
) {
  const resolvedParams = await params;
  try {
    const body = await request.json();
    const { parentId, pathPart } = body;

    const credentials = await getAWSCredentials();
    const client = new APIGatewayClient({ credentials });

    const command = new CreateResourceCommand({
      restApiId: resolvedParams.apiId,
      parentId,
      pathPart
    });

    const response = await client.send(command);

    return NextResponse.json({
      id: response.id,
      parentId: response.parentId,
      path: response.path,
      pathPart: response.pathPart
    });
  } catch (error) {
    logger.error('Error creating API Gateway resource', {
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
      { error: 'Failed to create API Gateway resource' },
      { status: 500 }
    );
  }
} 