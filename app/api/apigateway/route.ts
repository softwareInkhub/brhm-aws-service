import { APIGateway } from '@aws-sdk/client-api-gateway';
import { NextResponse } from 'next/server';
import { validateOpenAPI } from '@/app/middleware/openapi-validator';
import { NextRequest } from 'next/server';

const apiGatewayClient = new APIGateway({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

async function handleGET() {
  console.log('[API Gateway] Listing APIs');
  console.log('[API Gateway] Using region:', process.env.AWS_REGION);

  try {
    const { items } = await apiGatewayClient.getRestApis({});
    console.log('[API Gateway] Successfully retrieved APIs:', JSON.stringify(items, null, 2));
    return NextResponse.json(items);
  } catch (error) {
    console.error('[API Gateway] Error listing APIs:', error);
    return NextResponse.json(
      { error: 'Failed to list API Gateway APIs', details: error },
      { status: 500 }
    );
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[API Gateway] Creating API with params:', JSON.stringify(body, null, 2));

    const { name, description, endpointType, protocol } = body;

    const createApiParams = {
      name,
      description,
      endpointConfiguration: {
        types: [endpointType],
      },
      protocol,
    };

    console.log('[API Gateway] Sending createRestApi request:', JSON.stringify(createApiParams, null, 2));
    const result = await apiGatewayClient.createRestApi(createApiParams);
    console.log('[API Gateway] API created successfully:', JSON.stringify(result, null, 2));

    return NextResponse.json(
      { id: result.id, message: 'API Gateway created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API Gateway] Error creating API:', error);
    return NextResponse.json(
      { error: 'Failed to create API Gateway', details: error },
      { status: 500 }
    );
  }
}

export const GET = (request: NextRequest) => validateOpenAPI(request, handleGET);
export const POST = (request: NextRequest) => validateOpenAPI(request, handlePOST); 