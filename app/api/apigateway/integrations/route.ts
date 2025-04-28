import { NextResponse } from 'next/server';
import { 
  ApiGatewayV2Client, 
  GetApisCommand,
  GetIntegrationsCommand
} from "@aws-sdk/client-apigatewayv2";

const apiGatewayClient = new ApiGatewayV2Client({ 
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const functionName = searchParams.get('functionName');

    if (!functionName) {
      return NextResponse.json(
        { error: 'Function name is required' },
        { status: 400 }
      );
    }

    const integrations = [];
    const apisResponse = await apiGatewayClient.send(new GetApisCommand({}));

    if (apisResponse.Items) {
      for (const api of apisResponse.Items) {
        try {
          const integrationsResponse = await apiGatewayClient.send(
            new GetIntegrationsCommand({ ApiId: api.ApiId })
          );

          if (integrationsResponse.Items) {
            for (const integration of integrationsResponse.Items) {
              if (integration.IntegrationUri?.includes(functionName)) {
                integrations.push({
                  id: `${api.ApiId}-${integration.IntegrationId}`,
                  apiName: api.Name || 'Unnamed API',
                  method: integration.IntegrationMethod || 'ANY',
                  path: integration.IntegrationUri || '',
                  status: 'Active'
                });
              }
            }
          }
        } catch (error) {
          console.error(`Error fetching integrations for API ${api.ApiId}:`, error);
        }
      }
    }

    return NextResponse.json({ integrations });
  } catch (error) {
    console.error('Error in API Gateway integrations route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API Gateway integrations' },
      { status: 500 }
    );
  }
} 