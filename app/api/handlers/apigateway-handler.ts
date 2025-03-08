import { APIGateway } from '@aws-sdk/client-api-gateway';
import { NextResponse } from 'next/server';

const apiGatewayClient = new APIGateway({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export async function GET() {
  try {
    const { items } = await apiGatewayClient.getRestApis({});
    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to list API Gateway APIs' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, endpointType, protocol } = body;

    const createApiParams = {
      name,
      description,
      endpointConfiguration: {
        types: [endpointType],
      },
      protocol,
    };

    const { id } = await apiGatewayClient.createRestApi(createApiParams);
    return NextResponse.json({ id, message: 'API Gateway created successfully' }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create API Gateway' },
      { status: 500 }
    );
  }
} 