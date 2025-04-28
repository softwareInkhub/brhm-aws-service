import { NextRequest, NextResponse } from "next/server";
import { 
  LambdaClient, 
  CreateFunctionCommand,
  CreateFunctionCommandInput,
  GetFunctionCommand
} from "@aws-sdk/client-lambda";
import { 
  IAMClient, 
  CreateRoleCommand, 
  GetRoleCommand,
  AttachRolePolicyCommand,
  NoSuchEntityException
} from "@aws-sdk/client-iam";
import JSZip from 'jszip';

const LAMBDA_ROLE_NAME = "lambda-execution-role";
const LAMBDA_ROLE_POLICY = {
  Version: "2012-10-17",
  Statement: [
    {
      Effect: "Allow",
      Principal: {
        Service: "lambda.amazonaws.com"
      },
      Action: "sts:AssumeRole"
    }
  ]
};

const DEFAULT_FUNCTION_CODE = `exports.handler = async (event) => {
  const response = {
    statusCode: 200,
    body: JSON.stringify('Hello from Lambda!')
  };
  return response;
};`;

async function ensureRoleExists() {
  const iamClient = new IAMClient({
    region: process.env.AWS_REGION || 'us-east-1'
  });

  try {
    // Try to get the role first
    const getCommand = new GetRoleCommand({ RoleName: LAMBDA_ROLE_NAME });
    const role = await iamClient.send(getCommand);
    console.log('Existing role found:', role.Role.Arn);
    return role.Role.Arn;
  } catch (error) {
    // Check if the error is NoSuchEntity
    if (!(error instanceof NoSuchEntityException)) {
      console.error('Unexpected error while getting role:', error);
      throw error;
    }

    console.log('Role does not exist, creating new role...');

    try {
      // Create the role
      const createCommand = new CreateRoleCommand({
        RoleName: LAMBDA_ROLE_NAME,
        AssumeRolePolicyDocument: JSON.stringify(LAMBDA_ROLE_POLICY),
        Description: "Role for Lambda function execution"
      });

      const newRole = await iamClient.send(createCommand);
      console.log('Role created:', newRole.Role.Arn);

      // Attach the basic Lambda execution policy
      const attachCommand = new AttachRolePolicyCommand({
        RoleName: LAMBDA_ROLE_NAME,
        PolicyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
      });

      await iamClient.send(attachCommand);
      console.log('Basic execution policy attached to role');

      // Wait for role to propagate
      console.log('Waiting for role to propagate...');
      await new Promise(resolve => setTimeout(resolve, 10000));

      return newRole.Role.Arn;
    } catch (createError) {
      console.error('Error creating role:', createError);
      throw createError;
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { functionName, runtime, handler, memorySize, timeout } = await request.json();

    if (!functionName) {
      return NextResponse.json(
        { message: "Function name is required" },
        { status: 400 }
      );
    }

    console.log('Creating/verifying IAM role...');
    const roleArn = await ensureRoleExists();
    console.log('Using role ARN:', roleArn);

    const client = new LambdaClient({ 
      region: process.env.AWS_REGION || 'us-east-1'
    });

    // Check if function already exists
    try {
      await client.send(new GetFunctionCommand({ FunctionName: functionName }));
      return NextResponse.json(
        { message: "Function with this name already exists" },
        { status: 400 }
      );
    } catch (error: any) {
      if (error.name !== 'ResourceNotFoundException') {
        throw error;
      }
    }

    console.log('Creating ZIP file...');
    const zip = new JSZip();
    
    const fileName = runtime.startsWith('python') ? 'lambda_function.py' 
      : runtime.startsWith('java') ? 'Handler.java'
      : runtime.startsWith('dotnet') ? 'Function.cs'
      : 'index.js';
    
    zip.file(fileName, DEFAULT_FUNCTION_CODE);
    
    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 9
      }
    });

    console.log('Creating Lambda function...');
    const params: CreateFunctionCommandInput = {
      FunctionName: functionName,
      Runtime: runtime,
      Handler: handler,
      Role: roleArn,
      Code: {
        ZipFile: zipBuffer
      },
      MemorySize: memorySize,
      Timeout: timeout,
      Environment: {
        Variables: {
          REGION: process.env.AWS_REGION || 'us-east-1'
        }
      },
      PackageType: 'Zip',
      Publish: true,
      Architectures: ['x86_64']
    };

    const command = new CreateFunctionCommand(params);
    const response = await client.send(command);
    console.log('Function created successfully:', response.FunctionArn);

    return NextResponse.json({
      message: "Function created successfully",
      functionArn: response.FunctionArn
    });
  } catch (error) {
    console.error("Error creating Lambda function:", error);
    return NextResponse.json(
      { 
        message: error instanceof Error ? error.message : "Failed to create function",
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 