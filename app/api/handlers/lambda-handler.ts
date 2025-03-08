import { Lambda } from '@aws-sdk/client-lambda';
import { NextResponse } from 'next/server';

const lambdaClient = new Lambda({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export async function GET() {
  try {
    const { Functions } = await lambdaClient.listFunctions({});
    return NextResponse.json(Functions);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to list Lambda functions' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { functionName, runtime, handler, timeout, memorySize, environment } = body;

    const createFunctionParams = {
      FunctionName: functionName,
      Runtime: runtime,
      Handler: handler,
      Timeout: timeout,
      MemorySize: memorySize,
      Environment: {
        Variables: environment,
      },
      Role: process.env.AWS_LAMBDA_ROLE_ARN,
      Code: {
        ZipFile: Buffer.from('exports.handler = async (event) => { return { statusCode: 200, body: "Hello from Lambda!" }; };'),
      },
    };

    await lambdaClient.createFunction(createFunctionParams);
    return NextResponse.json({ message: 'Function created successfully' }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create Lambda function' },
      { status: 500 }
    );
  }
} 