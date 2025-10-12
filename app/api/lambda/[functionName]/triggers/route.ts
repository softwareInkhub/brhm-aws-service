import { NextRequest, NextResponse } from 'next/server';
import { LambdaClient, ListEventSourceMappingsCommand } from '@aws-sdk/client-lambda';
import { ApiGatewayV2Client, GetApisCommand, CreateApiCommand, CreateIntegrationCommand, CreateRouteCommand, CreateStageCommand, GetIntegrationsCommand } from '@aws-sdk/client-apigatewayv2';
import { AddPermissionCommand } from '@aws-sdk/client-lambda';
import { APIGatewayClient, GetRestApisCommand, GetResourcesCommand, GetIntegrationCommand, GetStagesCommand } from '@aws-sdk/client-api-gateway';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ functionName: string }> }
) {
  const { functionName } = await params;
  const lambdaClient = new LambdaClient({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
  const apiGatewayClient = new ApiGatewayV2Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  try {
    // List event source mappings (SQS, DynamoDB, Kinesis, etc.)
    const eventSourceMappings = await lambdaClient.send(new ListEventSourceMappingsCommand({
      FunctionName: functionName,
    }));

    const triggers = [];
    for (const mapping of eventSourceMappings.EventSourceMappings || []) {
      triggers.push({
        type: mapping.EventSourceArn?.includes('sqs') ? 'SQS' : 'Other',
        arn: mapping.EventSourceArn,
        uuid: mapping.UUID,
        state: mapping.State,
        batchSize: mapping.BatchSize,
      });
    }

    // List API Gateway triggers (only those integrated with this Lambda)
    const apis = await apiGatewayClient.send(new GetApisCommand({}));
    const lambdaArn = `arn:aws:lambda:${process.env.AWS_REGION}:${process.env.AWS_ACCOUNT_ID}:function:${functionName}`;
    console.log('Lambda ARN to match:', lambdaArn);
    for (const api of apis.Items || []) {
      console.log('API:', api.Name, api.ApiId);
      // List integrations for this API
      const integrationsRes = await apiGatewayClient.send(new GetIntegrationsCommand({ ApiId: api.ApiId }));
      for (const integration of integrationsRes.Items || []) {
        console.log('IntegrationUri:', integration.IntegrationUri);
      }
      const hasLambdaIntegration = (integrationsRes.Items || []).some(
        (integration) => integration.IntegrationUri && integration.IntegrationUri.includes(lambdaArn)
      );
      if (hasLambdaIntegration) {
        triggers.push({
          type: 'API Gateway',
          name: api.Name,
          apiId: api.ApiId,
          endpoint: api.ApiEndpoint,
          protocolType: api.ProtocolType,
        });
      }
    }

    // --- REST API Gateway (v1) triggers ---
    const apiGatewayV1Client = new APIGatewayClient({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
    const restApis = await apiGatewayV1Client.send(new GetRestApisCommand({}));
    for (const restApi of restApis.items || []) {
      console.log('REST API:', restApi.name, restApi.id);
      const resources = await apiGatewayV1Client.send(new GetResourcesCommand({ restApiId: restApi.id! }));
      for (const resource of resources.items || []) {
        for (const method of Object.keys(resource.resourceMethods || {})) {
          const integration = await apiGatewayV1Client.send(new GetIntegrationCommand({
            restApiId: restApi.id!,
            resourceId: resource.id!,
            httpMethod: method,
          }));
          console.log('Resource:', resource.path, 'Method:', method, 'Integration URI:', integration.uri);
          const expectedUri = `arn:aws:apigateway:${process.env.AWS_REGION}:lambda:path/2015-03-31/functions/${lambdaArn}/invocations`;
          if (
            (integration.type === 'AWS' || integration.type === 'AWS_PROXY') &&
            integration.uri === expectedUri
          ) {
            // Get the actual stage name from the API Gateway
            let stageName = 'default';
            try {
              const stagesResponse = await apiGatewayV1Client.send(new GetStagesCommand({
                restApiId: restApi.id!,
              }));
              // Use the first deployed stage, or 'default' if none found
              const deployedStage = stagesResponse.item?.find(stage => stage.deploymentId);
              if (deployedStage) {
                stageName = deployedStage.stageName || 'default';
              }
            } catch (err) {
              console.log('Could not fetch stages, using default stage name:', err);
            }
            
            // Construct the public API Gateway endpoint URL
            const region = process.env.AWS_REGION || 'us-east-1';
            const apiId = restApi.id;
            const publicEndpoint = `https://${apiId}.execute-api.${region}.amazonaws.com/${stageName}${resource.path}`;
            
            triggers.push({
              type: 'API Gateway (REST)',
              name: restApi.name,
              apiId: restApi.id,
              resourcePath: resource.path,
              method,
              endpoint: publicEndpoint,
              uri: integration.uri,
            });
          }
        }
      }
    }

    // --- Function URL triggers ---
    // Note: Function URLs are intentionally excluded from trigger display
    // Only API Gateway and event source mappings are shown

    console.log('Returning triggers:', triggers);
    return NextResponse.json({ triggers });
  } catch (error) {
    console.error('Error fetching Lambda triggers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Lambda triggers' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ functionName: string }> }
) {
  const { functionName } = await params;
  const body = await req.json();
  let config;
  try {
    config = typeof body === 'string' ? JSON.parse(body) : body;
  } catch (e) {
    return NextResponse.json({ error: 'Invalid configuration payload' }, { status: 400 });
  }
  const { intent, apiType, security, cors, stage } = config;

  const apiGatewayClient = new ApiGatewayV2Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
  const lambdaClient = new LambdaClient({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
  try {
    // 1. Create API (HTTP API only for now)
    const apiRes = await apiGatewayClient.send(new CreateApiCommand({
      Name: `${functionName}-api`,
      ProtocolType: apiType === 'http' ? 'HTTP' : apiType === 'websocket' ? 'WEBSOCKET' : 'HTTP',
      CorsConfiguration: cors ? { AllowOrigins: ['*'], AllowMethods: ['*'] } : undefined,
    }));
    // 2. Create Integration
    const integrationRes = await apiGatewayClient.send(new CreateIntegrationCommand({
      ApiId: apiRes.ApiId,
      IntegrationType: 'AWS_PROXY',
      IntegrationUri: `arn:aws:apigateway:${process.env.AWS_REGION}:lambda:path/2015-03-31/functions/arn:aws:lambda:${process.env.AWS_REGION}:${process.env.AWS_ACCOUNT_ID}:function:${functionName}/invocations`,
      PayloadFormatVersion: '2.0',
    }));
    // 3. Create default ANY /{proxy+} Route (matches AWS Console behavior)
    await apiGatewayClient.send(new CreateRouteCommand({
      ApiId: apiRes.ApiId,
      RouteKey: 'ANY /{proxy+}',
      Target: `integrations/${integrationRes.IntegrationId}`,
    }));
    // 4. Create Stage (for REST APIs, not used for HTTP API by default)
    if (apiType === 'rest' && stage) {
      await apiGatewayClient.send(new CreateStageCommand({
        ApiId: apiRes.ApiId,
        StageName: stage,
        AutoDeploy: true,
      }));
    }
    // 5. Add Lambda permission for API Gateway to invoke
    await lambdaClient.send(new AddPermissionCommand({
      FunctionName: functionName,
      Action: 'lambda:InvokeFunction',
      Principal: 'apigateway.amazonaws.com',
      StatementId: `apigateway-${Date.now()}`,
      SourceArn: `arn:aws:execute-api:${process.env.AWS_REGION}:${process.env.AWS_ACCOUNT_ID}:${apiRes.ApiId}/*/*`,
    }));
    return NextResponse.json({ success: true, apiId: apiRes.ApiId });
  } catch (error: any) {
    console.error('Error creating API Gateway trigger:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 