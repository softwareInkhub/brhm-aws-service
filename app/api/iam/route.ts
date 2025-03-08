import { IAM } from '@aws-sdk/client-iam';
import { NextResponse } from 'next/server';
import { validateOpenAPI } from '@/app/middleware/openapi-validator';
import { NextRequest } from 'next/server';

const iamClient = new IAM({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

async function handleGET() {
  console.log('[IAM API] Listing roles');
  console.log('[IAM API] Using region:', process.env.AWS_REGION);

  try {
    const { Roles } = await iamClient.listRoles({});
    console.log('[IAM API] Successfully retrieved roles:', JSON.stringify(Roles, null, 2));
    return NextResponse.json(Roles);
  } catch (error) {
    console.error('[IAM API] Error listing roles:', error);
    return NextResponse.json(
      { error: 'Failed to list IAM roles', details: error },
      { status: 500 }
    );
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[IAM API] Creating role with params:', JSON.stringify(body, null, 2));

    const { roleName, assumeRolePolicy, managedPolicies, inlinePolicies } = body;

    const createRoleParams = {
      RoleName: roleName,
      AssumeRolePolicyDocument: JSON.stringify(assumeRolePolicy),
    };

    console.log('[IAM API] Sending createRole request:', JSON.stringify(createRoleParams, null, 2));
    const { Role } = await iamClient.createRole(createRoleParams);
    console.log('[IAM API] Role created successfully:', JSON.stringify(Role, null, 2));

    if (managedPolicies?.length) {
      console.log('[IAM API] Attaching managed policies:', managedPolicies);
      await Promise.all(
        managedPolicies.map((policyArn: string) =>
          iamClient.attachRolePolicy({
            RoleName: roleName,
            PolicyArn: policyArn,
          })
        )
      );
      console.log('[IAM API] Managed policies attached successfully');
    }

    if (inlinePolicies) {
      console.log('[IAM API] Creating inline policies:', Object.keys(inlinePolicies));
      await Promise.all(
        Object.entries(inlinePolicies).map(([policyName, policyDocument]) =>
          iamClient.putRolePolicy({
            RoleName: roleName,
            PolicyName: policyName,
            PolicyDocument: JSON.stringify(policyDocument),
          })
        )
      );
      console.log('[IAM API] Inline policies created successfully');
    }

    return NextResponse.json(
      { Role, message: 'Role created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('[IAM API] Error creating role:', error);
    return NextResponse.json(
      { error: 'Failed to create IAM role', details: error },
      { status: 500 }
    );
  }
}

export const GET = (request: NextRequest) => validateOpenAPI(request, handleGET);
export const POST = (request: NextRequest) => validateOpenAPI(request, handlePOST); 