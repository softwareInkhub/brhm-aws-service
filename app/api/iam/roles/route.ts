import { NextResponse } from "next/server";
import { 
  CreateRoleCommand, 
  DeleteRoleCommand, 
  GetRoleCommand, 
  ListRolesCommand,
  ListAttachedRolePoliciesCommand,
  AttachRolePolicyCommand,
  DetachRolePolicyCommand
} from "@aws-sdk/client-iam";
import { getIAMClient } from "../../../utils/aws";

const iamClient = getIAMClient();

export async function GET() {
  try {
    const command = new ListRolesCommand({});
    const response = await iamClient.send(command);
    return NextResponse.json({ roles: response.Roles || [] });
  } catch (error) {
    console.error('Error listing roles:', error);
    return NextResponse.json(
      { error: 'Failed to list roles' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { action, ...data } = await request.json();

    switch (action) {
      case 'create': {
        const { roleName, description, assumeRolePolicyDocument } = data;
        const command = new CreateRoleCommand({
          RoleName: roleName,
          Description: description,
          AssumeRolePolicyDocument: assumeRolePolicyDocument
        });
        const response = await iamClient.send(command);
        return NextResponse.json({ role: response.Role });
      }

      case 'attachPolicy': {
        const { roleName, policyArn } = data;
        const command = new AttachRolePolicyCommand({
          RoleName: roleName,
          PolicyArn: policyArn
        });
        await iamClient.send(command);
        return NextResponse.json({ message: 'Policy attached successfully' });
      }

      case 'detachPolicy': {
        const { roleName, policyArn } = data;
        const command = new DetachRolePolicyCommand({
          RoleName: roleName,
          PolicyArn: policyArn
        });
        await iamClient.send(command);
        return NextResponse.json({ message: 'Policy detached successfully' });
      }

      case 'listAttachedPolicies': {
        const { roleName } = data;
        const command = new ListAttachedRolePoliciesCommand({
          RoleName: roleName
        });
        const response = await iamClient.send(command);
        return NextResponse.json({ 
          policies: response.AttachedPolicies || [] 
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error processing role operation:', error);
    return NextResponse.json(
      { error: 'Failed to process role operation' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roleName = searchParams.get('roleName');

    if (!roleName) {
      return NextResponse.json(
        { error: 'Role name is required' },
        { status: 400 }
      );
    }

    const iamClient = getIAMClient();

    try {
      // First check if the role exists
      const getCommand = new GetRoleCommand({
        RoleName: roleName
      });
      
      try {
        await iamClient.send(getCommand);
      } catch (error: any) {
        if (error.name === 'NoSuchEntityException') {
          return NextResponse.json(
            { error: `Role ${roleName} does not exist` },
            { status: 404 }
          );
        }
        throw error;
      }

      // If we get here, the role exists. Now list and detach policies
      const listPoliciesCommand = new ListAttachedRolePoliciesCommand({
        RoleName: roleName
      });
      const attachedPolicies = await iamClient.send(listPoliciesCommand);

      // Detach all policies
      if (attachedPolicies.AttachedPolicies) {
        for (const policy of attachedPolicies.AttachedPolicies) {
          try {
            const detachCommand = new DetachRolePolicyCommand({
              RoleName: roleName,
              PolicyArn: policy.PolicyArn
            });
            await iamClient.send(detachCommand);
            console.log(`Successfully detached policy ${policy.PolicyArn} from role ${roleName}`);
          } catch (error: any) {
            console.error(`Error detaching policy ${policy.PolicyArn}:`, error);
            throw new Error(`Failed to detach policy ${policy.PolicyArn}: ${error.message}`);
          }
        }
      }

      // Now delete the role
      const deleteCommand = new DeleteRoleCommand({
        RoleName: roleName
      });
      await iamClient.send(deleteCommand);
      
      return NextResponse.json({ 
        message: `Role ${roleName} deleted successfully` 
      });
    } catch (error: any) {
      console.error('Error in role operation:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to delete role' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in DELETE role handler:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete role' },
      { status: 500 }
    );
  }
} 