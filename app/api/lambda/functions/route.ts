import { NextRequest, NextResponse } from 'next/server';
import { LambdaClient, ListFunctionsCommand, GetFunctionCommand, ListVersionsByFunctionCommand } from '@aws-sdk/client-lambda';
import { ApiGatewayV2Client, GetApisCommand, GetIntegrationsCommand } from '@aws-sdk/client-apigatewayv2';
import { validateOpenAPI } from '@/app/middleware/openapi-validator';

const lambdaClient = new LambdaClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const apiGatewayClient = new ApiGatewayV2Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

// List all Lambda functions
export async function GET(request: NextRequest) {
  try {
    const command = new ListFunctionsCommand({});
    const response = await lambdaClient.send(command);
    
    return NextResponse.json({
      error: false,
      data: {
        functions: response.Functions || [],
      },
    });
  } catch (error) {
    console.error('Error listing Lambda functions:', error);
    return NextResponse.json(
      { error: true, message: 'Failed to list Lambda functions' },
      { status: 500 }
    );
  }
}

// Get function details
export async function POST(request: NextRequest) {
  try {
    const { functionName } = await request.json();
    
    if (!functionName) {
      return NextResponse.json(
        { error: true, message: 'Function name is required' },
        { status: 400 }
      );
    }

    // Get function details
    const functionCommand = new GetFunctionCommand({
      FunctionName: functionName,
    });
    const functionResponse = await lambdaClient.send(functionCommand);

    // Get function versions
    const versionsCommand = new ListVersionsByFunctionCommand({
      FunctionName: functionName,
      MaxItems: 50,
    });
    const versionsResponse = await lambdaClient.send(versionsCommand);

    // Get API Gateway triggers
    const apisResponse = await apiGatewayClient.send(new GetApisCommand({}));
    const integrations = [];
    
    for (const api of apisResponse.Items || []) {
      const integrationsResponse = await apiGatewayClient.send(
        new GetIntegrationsCommand({ ApiId: api.ApiId })
      );
      
      const functionIntegrations = (integrationsResponse.Items || [])
        .filter(integration => 
          integration.IntegrationUri?.includes(functionName)
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

    return NextResponse.json({
      error: false,
      data: {
        function: functionResponse.Configuration,
        versions: versionsResponse.Versions || [],
        triggers: integrations,
      },
    });
  } catch (error) {
    console.error('Error getting function details:', error);
    return NextResponse.json(
      { error: true, message: 'Failed to get function details' },
      { status: 500 }
    );
  }
}

export const GET_OPENAPI = (request: NextRequest) => validateOpenAPI(request, GET);
export const POST_OPENAPI = (request: NextRequest) => validateOpenAPI(request, POST); 