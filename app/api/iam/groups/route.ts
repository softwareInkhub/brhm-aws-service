import { NextResponse } from 'next/server';
import { 
  ListGroupsCommand, 
  CreateGroupCommand, 
  DeleteGroupCommand,
  AddUserToGroupCommand,
  RemoveUserFromGroupCommand,
  GetGroupCommand
} from '@aws-sdk/client-iam';
import { getIAMClient } from '../../../utils/aws';

export async function GET() {
  try {
    const client = getIAMClient();
    const command = new ListGroupsCommand({});
    const response = await client.send(command);

    return NextResponse.json({
      groups: response.Groups || [],
      requestId: response.$metadata.requestId
    });
  } catch (error) {
    console.error('Error listing groups:', error);
    return NextResponse.json(
      { error: 'Failed to list groups' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { action, groupName, userName } = await request.json();
    const client = getIAMClient();

    switch (action) {
      case 'create': {
        const command = new CreateGroupCommand({
          GroupName: groupName
        });
        const response = await client.send(command);
        return NextResponse.json({
          group: response.Group,
          requestId: response.$metadata.requestId
        });
      }

      case 'addUser': {
        const command = new AddUserToGroupCommand({
          GroupName: groupName,
          UserName: userName
        });
        const response = await client.send(command);
        return NextResponse.json({
          success: true,
          requestId: response.$metadata.requestId
        });
      }

      case 'removeUser': {
        const command = new RemoveUserFromGroupCommand({
          GroupName: groupName,
          UserName: userName
        });
        const response = await client.send(command);
        return NextResponse.json({
          success: true,
          requestId: response.$metadata.requestId
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error processing group operation:', error);
    return NextResponse.json(
      { error: 'Failed to process group operation' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const groupName = searchParams.get('groupName');

    if (!groupName) {
      return NextResponse.json(
        { error: 'Group name is required' },
        { status: 400 }
      );
    }

    const client = getIAMClient();
    const command = new DeleteGroupCommand({
      GroupName: groupName
    });
    
    const response = await client.send(command);
    return NextResponse.json({
      success: true,
      requestId: response.$metadata.requestId
    });
  } catch (error) {
    console.error('Error deleting group:', error);
    return NextResponse.json(
      { error: 'Failed to delete group' },
      { status: 500 }
    );
  }
} 