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

      const command = new CreateFunctionCommand({
        FunctionName: functionName,
        Runtime: runtime,
        Handler: handler,
        Role: role,
        Code: {
          ZipFile: Buffer.from(code, 'utf-8'),
        },
        Description: description,
        MemorySize: memory,
        Timeout: timeout,
      });

      const response = await lambdaClient.send(command);
      
      return NextResponse.json({
        error: false,
        data: response,
      });
    } catch (error) {
      console.error('Error creating Lambda function:', error);
      return NextResponse.json(
        { error: true, message: 'Failed to create Lambda function' },
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