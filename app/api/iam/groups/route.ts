import { NextResponse } from 'next/server';
import { listGroups, createGroup, deleteGroup } from '@/app/services/iam';
import { logger } from '@/app/utils/logger';

export async function GET() {
  try {
    const response = await listGroups();
    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error in GET /api/iam/groups:', { 
      component: 'IAMGroups',
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
    return NextResponse.json(
      { error: 'Failed to fetch IAM groups' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { groupName } = await request.json();
    if (!groupName) {
      return NextResponse.json(
        { error: 'groupName is required' },
        { status: 400 }
      );
    }

    const group = await createGroup(groupName);
    return NextResponse.json({ group });
  } catch (error) {
    logger.error('Error in POST /api/iam/groups:', { 
      component: 'IAMGroups',
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
    return NextResponse.json(
      { error: 'Failed to create IAM group' },
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
        { error: 'groupName is required' },
        { status: 400 }
      );
    }

    await deleteGroup(groupName);
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error in DELETE /api/iam/groups:', { 
      component: 'IAMGroups',
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
    return NextResponse.json(
      { error: 'Failed to delete IAM group' },
      { status: 500 }
    );
  }
} 