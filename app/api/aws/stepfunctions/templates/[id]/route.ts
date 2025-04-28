import { NextResponse } from 'next/server';

// Import the templates from the main route
import { workflowTemplates } from '../route';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Ensure params.id is awaited before use
    const templateId = await Promise.resolve(params.id);
    const template = workflowTemplates.find(t => t.name === templateId);
    
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      template,
      message: 'Template details fetched successfully'
    });
  } catch (error: any) {
    console.error('Error fetching template:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch template' },
      { status: 500 }
    );
  }
} 