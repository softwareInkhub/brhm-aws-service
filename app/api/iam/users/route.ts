import { NextResponse } from 'next/server';
import { listUsers, createUser, deleteUser } from '@/app/services/iam';
import { logger } from '@/app/utils/logger';

export async function GET() {
  try {
    const response = await listUsers();
    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error in GET /api/iam/users:', { 
      component: 'IAMUsers',
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
    return NextResponse.json(
      { error: 'Failed to fetch IAM users' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userName } = await request.json();
    if (!userName) {
      return NextResponse.json(
        { error: 'userName is required' },
        { status: 400 }
      );
    }

    const user = await createUser(userName);
    return NextResponse.json({ user });
  } catch (error) {
    logger.error('Error in POST /api/iam/users:', { 
      component: 'IAMUsers',
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
    return NextResponse.json(
      { error: 'Failed to create IAM user' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userName = searchParams.get('userName');
    
    if (!userName) {
      return NextResponse.json(
        { error: 'userName is required' },
        { status: 400 }
      );
    }

    await deleteUser(userName);
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error in DELETE /api/iam/users:', { 
      component: 'IAMUsers',
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
    return NextResponse.json(
      { error: 'Failed to delete IAM user' },
      { status: 500 }
    );
  }
} 