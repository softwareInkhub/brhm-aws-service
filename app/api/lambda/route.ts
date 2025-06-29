import { NextRequest, NextResponse } from 'next/server';
import { LambdaClient, ListFunctionsCommand, CreateFunctionCommand, DeleteFunctionCommand, UpdateFunctionCodeCommand, UpdateFunctionConfigurationCommand, GetFunctionCommand } from '@aws-sdk/client-lambda';
import { validateOpenAPI } from '@/app/middleware/openapi-validator';

const lambdaClient = new LambdaClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

// List Lambda Functions
export async function GET(request: NextRequest) {
  return validateOpenAPI(request, async () => {
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
  });
}

// Create Lambda Function
export async function POST(request: NextRequest) {
  return validateOpenAPI(request, async () => {
    try {
      const data = await request.json();
      const { functionName, runtime, handler, role, code, description, memory, timeout } = data;

      // Use a basic execution role - this should exist in all AWS accounts
      const executionRole = role || 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole';

      console.log('Creating Lambda function with config:', {
        functionName,
        runtime,
        handler,
        role: executionRole,
        memory: memory || 128,
        timeout: timeout || 30
      });

      const command = new CreateFunctionCommand({
        FunctionName: functionName,
        Runtime: runtime,
        Handler: handler,
        Role: executionRole,
        Code: {
          ZipFile: Buffer.from(code || 'exports.handler = async (event) => { return { statusCode: 200, body: "Hello World" }; };', 'utf-8'),
        },
        Description: description || `Function created for ${functionName}`,
        MemorySize: memory || 128,
        Timeout: timeout || 30,
      });

      const response = await lambdaClient.send(command);
      
      console.log('Lambda function created successfully:', response.FunctionArn);
      
      return NextResponse.json({
        error: false,
        functionArn: response.FunctionArn,
        data: response,
      });
    } catch (error) {
      console.error('Error creating Lambda function:', error);
      return NextResponse.json(
        { error: true, message: error instanceof Error ? error.message : 'Failed to create Lambda function' },
        { status: 500 }
      );
    }
  });
}

// Delete Lambda Function
export async function DELETE(request: NextRequest) {
  return validateOpenAPI(request, async () => {
    try {
      const { searchParams } = new URL(request.url);
      const functionName = searchParams.get('functionName');

      if (!functionName) {
        return NextResponse.json(
          { error: true, message: 'Function name is required' },
          { status: 400 }
        );
      }

      const command = new DeleteFunctionCommand({
        FunctionName: functionName,
      });

      await lambdaClient.send(command);
      
      return NextResponse.json({
        error: false,
        message: 'Function deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting Lambda function:', error);
      return NextResponse.json(
        { error: true, message: 'Failed to delete Lambda function' },
        { status: 500 }
      );
    }
  });
} 