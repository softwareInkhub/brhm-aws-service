import OpenAPIBackend, { Context, Request } from 'openapi-backend';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import yaml from 'js-yaml';
import fs from 'fs';
import { logger } from '@/app/utils/logger';

const COMPONENT_NAME = 'OpenAPI Backend';

// Load OpenAPI specification
let apiSpec: any;
try {
  const specPath = path.join(process.cwd(), 'app/api/openapi.yaml');
  const fileContents = fs.readFileSync(specPath, 'utf8');
  apiSpec = yaml.load(fileContents);
  logger.info(`${COMPONENT_NAME}: API specification loaded successfully`, {
    component: COMPONENT_NAME,
    data: { paths: Object.keys(apiSpec.paths) }
  });
} catch (error) {
  logger.error(`${COMPONENT_NAME}: Error loading API specification`, {
    component: COMPONENT_NAME,
    data: { error }
  });
  apiSpec = { paths: {} };
}

// Initialize OpenAPI Backend
export const api = new OpenAPIBackend({
  definition: apiSpec,
  strict: true,
  validate: true,
  handlers: {
    validationFail: async (c: Context, req: NextRequest, h: any) => {
      logger.error(`${COMPONENT_NAME}: Validation failed`, {
        component: COMPONENT_NAME,
        data: { 
          errors: c.validation.errors,
          path: req.nextUrl.pathname,
          method: req.method
        }
      });
      
      return NextResponse.json({
        error: 'Validation Failed',
        message: c.validation.errors,
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString()
      }, { status: 400 });
    },
    notFound: async (c: Context, req: NextRequest, h: any) => {
      logger.error(`${COMPONENT_NAME}: Path not found`, {
        component: COMPONENT_NAME,
        data: { 
          path: req.nextUrl.pathname,
          method: req.method,
          availablePaths: Object.keys(apiSpec.paths)
        }
      });
      
      return NextResponse.json({
        error: 'Not Found',
        message: 'Path not found in API specification',
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString()
      }, { status: 404 });
    },
    notImplemented: async (c: Context, req: NextRequest, h: any) => {
      logger.error(`${COMPONENT_NAME}: Operation not implemented`, {
        component: COMPONENT_NAME,
        data: { 
          path: req.nextUrl.pathname,
          method: req.method,
          operation: c.operation.operationId
        }
      });
      
      return NextResponse.json({
        error: 'Not Implemented',
        message: `Operation ${c.operation.operationId} not implemented`,
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString()
      }, { status: 501 });
    }
  }
});

// Initialize API
try {
  api.init();
  logger.info(`${COMPONENT_NAME}: OpenAPI Backend initialized successfully`, {
    component: COMPONENT_NAME
  });
} catch (error) {
  logger.error(`${COMPONENT_NAME}: Failed to initialize OpenAPI Backend`, {
    component: COMPONENT_NAME,
    data: { error }
  });
}

// Helper function to validate request against OpenAPI spec
export async function validateRequest(request: NextRequest, handler: (c: Context, req: NextRequest, h: any) => Promise<NextResponse>) {
  try {
    const requestId = crypto.randomUUID();
    logger.info(`${COMPONENT_NAME}: Validating request`, {
      component: COMPONENT_NAME,
      data: { 
        requestId,
        path: request.nextUrl.pathname,
        method: request.method
      }
    });

    // Create the OpenAPI request object
    const openAPIRequest: Request = {
      path: request.nextUrl.pathname,
      method: request.method.toLowerCase(),
      body: request.body ? await request.clone().json() : undefined,
      query: Object.fromEntries(new URL(request.url).searchParams),
      headers: Object.fromEntries(request.headers)
    };

    // Find and register the operation handler
    const operation = api.router.matchOperation(openAPIRequest);
    if (operation?.operationId) {
      api.register(operation.operationId, handler);
    } else {
      logger.warn(`${COMPONENT_NAME}: No matching operation found`, {
        component: COMPONENT_NAME,
        data: { 
          path: request.nextUrl.pathname,
          method: request.method
        }
      });
    }

    // Handle the request through OpenAPI Backend
    const response = await api.handleRequest(openAPIRequest, request);

    return response;
  } catch (error) {
    logger.error(`${COMPONENT_NAME}: Request validation failed`, {
      component: COMPONENT_NAME,
      data: { 
        error,
        path: request.nextUrl.pathname,
        method: request.method
      }
    });

    return NextResponse.json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
      requestId: crypto.randomUUID(),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 