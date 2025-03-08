import { IAM } from '@aws-sdk/client-iam';
import { NextResponse } from 'next/server';

const iamClient = new IAM({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export async function GET() {
  try {
    const { Roles } = await iamClient.listRoles({});
    return NextResponse.json(Roles);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to list IAM roles' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { roleName, assumeRolePolicy, managedPolicies, inlinePolicies } = body;

    const createRoleParams = {
      RoleName: roleName,
      AssumeRolePolicyDocument: JSON.stringify(assumeRolePolicy),
    };

    const { Role } = await iamClient.createRole(createRoleParams);

    // Attach managed policies if provided
    if (managedPolicies?.length) {
      await Promise.all(
        managedPolicies.map((policyArn: string) =>
          iamClient.attachRolePolicy({
            RoleName: roleName,
            PolicyArn: policyArn,
          })
        )
      );
    }

    // Create inline policies if provided
    if (inlinePolicies) {
      await Promise.all(
        Object.entries(inlinePolicies).map(([policyName, policyDocument]) =>
          iamClient.putRolePolicy({
            RoleName: roleName,
            PolicyName: policyName,
            PolicyDocument: JSON.stringify(policyDocument),
          })
        )
      );
    }

    return NextResponse.json({ Role, message: 'Role created successfully' }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create IAM role' },
      { status: 500 }
    );
  }
} 