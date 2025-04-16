import { IAM } from '@aws-sdk/client-iam';
import { NextResponse } from 'next/server';
import { 
  IAMClient, 
  AttachUserPolicyCommand, 
  DetachUserPolicyCommand,
  ListPoliciesCommand,
  ListGroupsCommand,
  CreateGroupCommand,
  AddUserToGroupCommand,
  GetGroupCommand,
  CreateAccessKeyCommand,
  DeleteAccessKeyCommand,
  ListAccessKeysCommand,
  CreateVirtualMFADeviceCommand,
  EnableMFADeviceCommand,
  ListMFADevicesCommand,
  DeactivateMFADeviceCommand,
  DeleteVirtualMFADeviceCommand,
  UpdateLoginProfileCommand,
  CreateLoginProfileCommand,
  GetLoginProfileCommand,
  DeleteLoginProfileCommand,
  TagUserCommand,
  UntagUserCommand,
  ListUserTagsCommand,
  GetServiceLastAccessedDetailsCommand,
  GenerateServiceLastAccessedDetailsCommand,
  GetUserCommand
} from "@aws-sdk/client-iam";

const iamClient = new IAM({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

// Helper function to get AWS Account ID
async function getAwsAccountId() {
  try {
    // Get the current user's ARN to extract the account ID
    const response = await iamClient.send(new GetUserCommand({}));
    const userArn = response.User?.Arn || '';
    const accountId = userArn.split(':')[4]; // ARN format: arn:aws:iam::ACCOUNT_ID:user/USERNAME
    return accountId;
  } catch (error) {
    console.error('Error getting AWS account ID:', error);
    throw error;
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;

    // Get user details
    const { User } = await iamClient.getUser({ UserName: username });

    // Get attached policies
    const { AttachedPolicies } = await iamClient.listAttachedUserPolicies({
      UserName: username,
    });

    // Get groups
    const { Groups } = await iamClient.listGroupsForUser({
      UserName: username,
    });

    return NextResponse.json({
      ...User,
      AttachedPolicies,
      Groups,
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user details' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  if (!username) {
    return NextResponse.json(
      { error: 'Username is required' },
      { status: 400 }
    );
  }

  try {
    const requestData = await request.json();
    const { action, policyArn, groupName, password, serialNumber, authenticationCode1, authenticationCode2, tags, tagKeys } = requestData;

    if (action === 'attachPolicy') {
      const command = new AttachUserPolicyCommand({
        UserName: username,
        PolicyArn: policyArn,
      });

      await iamClient.send(command);
      return NextResponse.json({ message: 'Policy attached successfully' });
    }

    if (action === 'detachPolicy') {
      const command = new DetachUserPolicyCommand({
        UserName: username,
        PolicyArn: policyArn,
      });

      await iamClient.send(command);
      return NextResponse.json({ message: 'Policy detached successfully' });
    }

    if (action === 'listPolicies') {
      const command = new ListPoliciesCommand({
        Scope: 'All',
        OnlyAttached: false,
      });

      const response = await iamClient.send(command);
      return NextResponse.json(response.Policies || []);
    }

    if (action === 'listGroups') {
      const command = new ListGroupsCommand({});
      const response = await iamClient.send(command);
      return NextResponse.json(response.Groups || []);
    }

    if (action === 'createGroup') {
      if (!groupName) {
        return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
      }

      const createCommand = new CreateGroupCommand({
        GroupName: groupName
      });

      await iamClient.send(createCommand);

      // Get the created group details
      const getGroupCommand = new GetGroupCommand({
        GroupName: groupName
      });

      const groupDetails = await iamClient.send(getGroupCommand);
      return NextResponse.json(groupDetails.Group);
    }

    if (action === 'addUserToGroup') {
      if (!groupName) {
        return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
      }

      const command = new AddUserToGroupCommand({
        GroupName: groupName,
        UserName: username
      });

      await iamClient.send(command);
      return NextResponse.json({ message: 'User added to group successfully' });
    }

    if (action === 'createAccessKey') {
      const command = new CreateAccessKeyCommand({
        UserName: username,
      });

      const response = await iamClient.send(command);
      return NextResponse.json(response.AccessKey);
    }

    if (action === 'listAccessKeys') {
      const command = new ListAccessKeysCommand({
        UserName: username,
      });

      const response = await iamClient.send(command);
      return NextResponse.json(response.AccessKeyMetadata || []);
    }

    if (action === 'deleteAccessKey') {
      const { accessKeyId } = await requestData;
      const command = new DeleteAccessKeyCommand({
        UserName: username,
        AccessKeyId: accessKeyId,
      });

      await iamClient.send(command);
      return NextResponse.json({ message: 'Access key deleted successfully' });
    }

    if (action === 'createLoginProfile') {
      const command = new CreateLoginProfileCommand({
        UserName: username,
        Password: password,
        PasswordResetRequired: true,
      });

      await iamClient.send(command);
      return NextResponse.json({ message: 'Console access enabled successfully' });
    }

    if (action === 'getLoginProfile') {
      const command = new GetLoginProfileCommand({
        UserName: username,
      });

      try {
        const response = await iamClient.send(command);
        return NextResponse.json({ hasConsoleAccess: true, ...response.LoginProfile });
      } catch (error: any) {
        if (error.name === 'NoSuchEntityException') {
          return NextResponse.json({ hasConsoleAccess: false });
        }
        throw error;
      }
    }

    if (action === 'updateLoginProfile') {
      const command = new UpdateLoginProfileCommand({
        UserName: username,
        Password: password,
        PasswordResetRequired: true,
      });

      await iamClient.send(command);
      return NextResponse.json({ message: 'Password updated successfully' });
    }

    if (action === 'deleteLoginProfile') {
      const command = new DeleteLoginProfileCommand({
        UserName: username,
      });

      await iamClient.send(command);
      return NextResponse.json({ message: 'Console access disabled successfully' });
    }

    if (action === 'createMFA') {
      const command = new CreateVirtualMFADeviceCommand({
        VirtualMFADeviceName: `mfa/${username}`,
      });

      const response = await iamClient.send(command);
      return NextResponse.json({
        SerialNumber: response.VirtualMFADevice?.SerialNumber,
        QRCodePNG: response.VirtualMFADevice?.QRCodePNG,
      });
    }

    if (action === 'enableMFA') {
      const command = new EnableMFADeviceCommand({
        UserName: username,
        SerialNumber: serialNumber,
        AuthenticationCode1: authenticationCode1,
        AuthenticationCode2: authenticationCode2,
      });

      await iamClient.send(command);
      return NextResponse.json({ message: 'MFA device enabled successfully' });
    }

    if (action === 'listMFADevices') {
      const command = new ListMFADevicesCommand({
        UserName: username,
      });

      const response = await iamClient.send(command);
      return NextResponse.json(response.MFADevices || []);
    }

    if (action === 'deactivateMFA') {
      const command = new DeactivateMFADeviceCommand({
        UserName: username,
        SerialNumber: serialNumber,
      });

      await iamClient.send(command);

      // Also delete the virtual device
      const deleteCommand = new DeleteVirtualMFADeviceCommand({
        SerialNumber: serialNumber,
      });

      await iamClient.send(deleteCommand);
      return NextResponse.json({ message: 'MFA device removed successfully' });
    }

    if (action === 'listTags') {
      const command = new ListUserTagsCommand({
        UserName: username,
      });

      const response = await iamClient.send(command);
      return NextResponse.json(response.Tags || []);
    }

    if (action === 'addTags') {
      if (!Array.isArray(tags)) {
        return NextResponse.json({ error: 'Tags must be an array' }, { status: 400 });
      }

      const command = new TagUserCommand({
        UserName: username,
        Tags: tags,
      });

      await iamClient.send(command);
      return NextResponse.json({ message: 'Tags added successfully' });
    }

    if (action === 'removeTags') {
      if (!Array.isArray(tagKeys)) {
        return NextResponse.json({ error: 'Tag keys must be an array' }, { status: 400 });
      }

      const command = new UntagUserCommand({
        UserName: username,
        TagKeys: tagKeys,
      });

      await iamClient.send(command);
      return NextResponse.json({ message: 'Tags removed successfully' });
    }

    if (action === 'generateAccessReport') {
      // Get AWS Account ID first
      const accountId = await getAwsAccountId();
      
      if (!accountId) {
        throw new Error('Failed to get AWS Account ID');
      }

      console.log('Generating access report for user:', username);
      console.log('Account ID:', accountId);

      const command = new GenerateServiceLastAccessedDetailsCommand({
        Arn: `arn:aws:iam::${accountId}:user/${username}`,
        Granularity: 'SERVICE_LEVEL',
      });

      const response = await iamClient.send(command);
      console.log('Generated access report with job ID:', response.JobId);
      return NextResponse.json({ jobId: response.JobId });
    }

    if (action === 'getAccessReport') {
      const { jobId } = requestData;
      if (!jobId) {
        return NextResponse.json(
          { error: 'Job ID is required' },
          { status: 400 }
        );
      }

      console.log('Getting access report for job ID:', jobId);
      const command = new GetServiceLastAccessedDetailsCommand({
        JobId: jobId,
      });

      const response = await iamClient.send(command);
      console.log('Access report status:', response.JobStatus);
      return NextResponse.json({
        services: response.ServicesLastAccessed || [],
        jobStatus: response.JobStatus,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Something went wrong',
        details: error.Code ? `AWS Error: ${error.Code}` : undefined
      },
      { status: 500 }
    );
  }
} 