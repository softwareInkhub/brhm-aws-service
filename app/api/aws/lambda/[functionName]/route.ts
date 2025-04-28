import { NextRequest, NextResponse } from "next/server";
import { 
  LambdaClient, 
  GetFunctionCommand,
  GetFunctionConfigurationCommand,
  GetFunctionResponse,
  GetFunctionConfigurationResponse
} from "@aws-sdk/client-lambda";

export async function GET(
  request: NextRequest,
  { params }: { params: { functionName: string } }
) {
  try {
    const { functionName } = await params;
    const decodedFunctionName = decodeURIComponent(functionName);
    
    const client = new LambdaClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });

    // Get function details
    const getFunction = new GetFunctionCommand({
      FunctionName: decodedFunctionName
    });

    // Get function configuration
    const getConfig = new GetFunctionConfigurationCommand({
      FunctionName: decodedFunctionName
    });

    // Execute both requests in parallel
    const [functionResponse, configResponse] = await Promise.all([
      client.send(getFunction),
      client.send(getConfig)
    ]);

    return NextResponse.json({
      function: {
        ...functionResponse,
        Configuration: {
          ...configResponse,
          Environment: configResponse.Environment || { Variables: {} },
          Tags: functionResponse.Tags || {}
        }
      }
    });
  } catch (error) {
    console.error("Error fetching function details:", error);
    return NextResponse.json(
      { 
        message: error instanceof Error ? error.message : "Failed to fetch function details",
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 