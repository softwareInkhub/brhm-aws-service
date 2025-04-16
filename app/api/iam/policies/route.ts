import { 
  IAM,
  CreatePolicyCommand,
  DeletePolicyCommand,
  GetPolicyCommand,
  ListPoliciesCommand,
  CreatePolicyVersionCommand,
  ListPolicyVersionsCommand,
  DeletePolicyVersionCommand,
  SetDefaultPolicyVersionCommand
} from '@aws-sdk/client-iam';
import { NextResponse } from 'next/server';
import { validateOpenAPI } from '@/app/middleware/openapi-validator';
import { NextRequest } from 'next/server';

let iamClient: IAM | null = null;

function validateEnvVars() {
  console.log('[IAM API] Validating environment variables...');
  const requiredEnvVars = {
    AWS_REGION: process.env.AWS_REGION,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  };

  console.log('[IAM API] Environment variables state:', {
    region: process.env.AWS_REGION,
    hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
    hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
    nodeEnv: process.env.NODE_ENV,
  });

  const missingVars = Object.entries(requiredEnvVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  return requiredEnvVars;
}

async function getIAMClient() {
  if (iamClient) return iamClient;

  try {
    console.log('[IAM API] Initializing IAM client...');
    const envVars = validateEnvVars();

    iamClient = new IAM({
      region: envVars.AWS_REGION,
      credentials: {
        accessKeyId: envVars.AWS_ACCESS_KEY_ID!,
        secretAccessKey: envVars.AWS_SECRET_ACCESS_KEY!,
      },
    });

    console.log('[IAM API] IAM client initialized successfully');
    return iamClient;
  } catch (error) {
    console.error('[IAM API] Failed to initialize IAM client:', error);
    throw error;
  }
}

async function handleGET(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[IAM API][${requestId}] Handling GET request for listing policies`);

  try {
    const client = await getIAMClient();
    console.log(`[IAM API][${requestId}] Listing policies...`);
    
    const { Policies } = await client.send(new ListPoliciesCommand({
      Scope: 'All',
      OnlyAttached: false,
    }));
    
    console.log(`[IAM API][${requestId}] Found ${Policies?.length || 0} policies`);

    const formattedPolicies = Policies?.map(policy => ({
      PolicyName: policy.PolicyName,
      PolicyArn: policy.Arn,
      Description: policy.Description,
      UpdateDate: policy.UpdateDate?.toISOString(),
      CreateDate: policy.CreateDate?.toISOString(),
      AttachmentCount: policy.AttachmentCount,
      IsAttachable: policy.IsAttachable,
      DefaultVersionId: policy.DefaultVersionId,
    })) || [];

    return NextResponse.json({ 
      policies: formattedPolicies,
      requestId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`[IAM API][${requestId}] Error:`, error);

    if (error instanceof Error && error.message.includes('credentials')) {
      return NextResponse.json(
        {
          error: 'AWS Authentication Failed',
          message: 'Invalid or missing AWS credentials',
          requestId,
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to list IAM policies',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

async function handlePOST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[IAM API][${requestId}] Handling POST request for policy operation`);

  try {
    const client = await getIAMClient();
    const { action, ...data } = await request.json();

    switch (action) {
      case 'create': {
        const { policyName, policyDocument, description, path } = data;
        
        const command = new CreatePolicyCommand({
          PolicyName: policyName,
          PolicyDocument: typeof policyDocument === 'string' 
            ? policyDocument 
            : JSON.stringify(policyDocument),
          Description: description,
          Path: path,
        });

        const response = await client.send(command);
        return NextResponse.json({
          policy: response.Policy,
          message: 'Policy created successfully',
          requestId,
        });
      }

      case 'createVersion': {
        const { policyArn, policyDocument, setAsDefault } = data;
        
        const command = new CreatePolicyVersionCommand({
          PolicyArn: policyArn,
          PolicyDocument: typeof policyDocument === 'string'
            ? policyDocument
            : JSON.stringify(policyDocument),
          SetAsDefault: setAsDefault,
        });

        const response = await client.send(command);
        return NextResponse.json({
          version: response.PolicyVersion,
          message: 'Policy version created successfully',
          requestId,
        });
      }

      case 'setDefaultVersion': {
        const { policyArn, versionId } = data;
        
        const command = new SetDefaultPolicyVersionCommand({
          PolicyArn: policyArn,
          VersionId: versionId,
        });

        await client.send(command);
        return NextResponse.json({
          message: 'Default policy version updated successfully',
          requestId,
        });
      }

      case 'listVersions': {
        const { policyArn } = data;
        
        const command = new ListPolicyVersionsCommand({
          PolicyArn: policyArn,
        });

        const response = await client.send(command);
        return NextResponse.json({
          versions: response.Versions,
          requestId,
        });
      }

      default:
        return NextResponse.json(
          {
            error: 'Invalid action',
            message: 'The specified action is not supported',
            requestId,
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error(`[IAM API][${requestId}] Error:`, error);

    return NextResponse.json(
      {
        error: 'Failed to process policy operation',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

async function handleDELETE(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[IAM API][${requestId}] Handling DELETE request for policy`);

  try {
    const client = await getIAMClient();
    const { searchParams } = new URL(request.url);
    
    const policyArn = searchParams.get('policyArn');
    const versionId = searchParams.get('versionId');

    if (!policyArn) {
      return NextResponse.json(
        {
          error: 'Missing required parameter',
          message: 'Policy ARN is required',
          requestId,
        },
        { status: 400 }
      );
    }

    if (versionId) {
      // Delete specific version
      const command = new DeletePolicyVersionCommand({
        PolicyArn: policyArn,
        VersionId: versionId,
      });

      await client.send(command);
      return NextResponse.json({
        message: `Policy version ${versionId} deleted successfully`,
        requestId,
      });
    } else {
      // Delete entire policy
      const command = new DeletePolicyCommand({
        PolicyArn: policyArn,
      });

      await client.send(command);
      return NextResponse.json({
        message: 'Policy deleted successfully',
        requestId,
      });
    }
  } catch (error) {
    console.error(`[IAM API][${requestId}] Error:`, error);

    return NextResponse.json(
      {
        error: 'Failed to delete policy',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export const GET = (request: NextRequest) => validateOpenAPI(request, handleGET);
export const POST = (request: NextRequest) => validateOpenAPI(request, handlePOST);
export const DELETE = (request: NextRequest) => validateOpenAPI(request, handleDELETE); 