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

export async function GET(
  request: Request,
  { params }: { params: { functionName: string } }
) {
  try {
    // Get all HTTP APIs
    const apisResponse = await apiGatewayClient.send(new GetApisCommand({}));
    
    const integrations = [];
    
    // For each API, get its integrations
    for (const api of apisResponse.Items || []) {
      const integrationsResponse = await apiGatewayClient.send(
        new GetIntegrationsCommand({ ApiId: api.ApiId })
      );
      
      // Filter integrations for this Lambda function
      const functionIntegrations = (integrationsResponse.Items || [])
        .filter(integration => 
          integration.IntegrationUri?.includes(params.functionName)
        )
        .map(integration => ({
          id: integration.IntegrationId,
          apiId: api.ApiId,
          apiName: api.Name,
          method: integration.IntegrationMethod,
          path: integration.IntegrationUri,
          status: 'Active'
        }));
      
      integrations.push(...functionIntegrations);
    }

    return NextResponse.json({ items: integrations });
  } catch (error) {
    console.error('Error fetching API Gateway integrations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API Gateway integrations' },
      { status: 500 }
    );
  }
} 