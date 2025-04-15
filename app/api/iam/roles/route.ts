import { NextResponse } from 'next/server';
import { listRoles, createRole, deleteRole } from '@/app/services/iam';
import { logger } from '@/app/utils/logger';

export async function GET() {
  try {
    const response = await listRoles();
    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error in GET /api/iam/roles:', { 
      component: 'IAMRoles',
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
    return NextResponse.json(
      { error: 'Failed to fetch IAM roles' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { roleName, description, assumeRolePolicyDocument } = await request.json();
    if (!roleName || !assumeRolePolicyDocument) {
      return NextResponse.json(
        { error: 'roleName and assumeRolePolicyDocument are required' },
        { status: 400 }
      );
    }

    const role = await createRole({
      RoleName: roleName,
      Description: description,
      AssumeRolePolicyDocument: assumeRolePolicyDocument
    });
    return NextResponse.json({ role });
  } catch (error) {
    logger.error('Error in POST /api/iam/roles:', { 
      component: 'IAMRoles',
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
    return NextResponse.json(
      { error: 'Failed to create IAM role' },
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
        { error: 'roleName is required' },
        { status: 400 }
      );
    }

    await deleteRole(roleName);
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error in DELETE /api/iam/roles:', { 
      component: 'IAMRoles',
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
    return NextResponse.json(
      { error: 'Failed to delete IAM role' },
      { status: 500 }
    );
  }
} 