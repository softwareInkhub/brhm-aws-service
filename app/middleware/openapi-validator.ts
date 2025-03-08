import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import path from 'path';
import yaml from 'js-yaml';
import fs from 'fs';

let apiSpec: any;
try {
  console.log('[OpenAPI] Loading API specification...');
  const specPath = path.join(process.cwd(), 'app/api/openapi.yaml');
  console.log('[OpenAPI] Reading spec from:', specPath);
  
  const fileContents = fs.readFileSync(specPath, 'utf8');
  console.log('[OpenAPI] File contents loaded, parsing YAML...');
  
  apiSpec = yaml.load(fileContents);
  console.log('[OpenAPI] API specification loaded successfully');
  console.log('[OpenAPI] Available paths:', Object.keys(apiSpec.paths));
} catch (error) {
  console.error('[OpenAPI] Error loading API specification:', error);
  apiSpec = { paths: {} }; // Provide default empty spec to prevent crashes
}

export async function validateOpenAPI(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  const requestId = Math.random().toString(36).substring(7);
  
  try {
    console.log(`[OpenAPI][${requestId}] ====== Request Started ======`);
    console.log(`[OpenAPI][${requestId}] Method: ${request.method}`);
    console.log(`[OpenAPI][${requestId}] URL: ${request.url}`);

    if (!apiSpec.paths) {
      console.error(`[OpenAPI][${requestId}] Invalid or missing API specification`);
      return NextResponse.json(
        {
          error: 'API Configuration Error',
          message: 'Invalid or missing API specification',
          requestId
        },
        { status: 500 }
      );
    }

    const pathname = request.nextUrl.pathname;
    const method = request.method.toLowerCase();
    const apiPath = pathname.replace(/^\/api/, '');
    
    console.log(`[OpenAPI][${requestId}] Original path: ${pathname}`);
    console.log(`[OpenAPI][${requestId}] Normalized API path: ${apiPath}`);

    if (!apiSpec.paths[apiPath]) {
      console.error(`[OpenAPI][${requestId}] Path not found in spec: ${apiPath}`);
      return NextResponse.json(
        { 
          error: 'Path not found in API spec',
          availablePaths: Object.keys(apiSpec.paths),
          requestedPath: apiPath,
          requestId
        },
        { status: 404 }
      );
    }

    if (!apiSpec.paths[apiPath][method]) {
      console.error(`[OpenAPI][${requestId}] Method ${method} not allowed for path: ${apiPath}`);
      return NextResponse.json(
        { 
          error: `Method ${method} not allowed for this path`,
          allowedMethods: Object.keys(apiSpec.paths[apiPath]),
          requestedMethod: method,
          requestId
        },
        { status: 405 }
      );
    }

    console.log(`[OpenAPI][${requestId}] Validation successful, forwarding to handler`);
    const response = await handler(request);
    
    // Ensure response is JSON
    if (!(response instanceof NextResponse)) {
      console.error(`[OpenAPI][${requestId}] Handler returned invalid response type`);
      return NextResponse.json(
        {
          error: 'Internal Server Error',
          message: 'Invalid response type from handler',
          requestId
        },
        { status: 500 }
      );
    }

    return response;
  } catch (error) {
    console.error(`[OpenAPI][${requestId}] ====== Error ======`);
    console.error(`[OpenAPI][${requestId}] Error details:`, error);
    
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId 
      },
      { status: 500 }
    );
  }
} 