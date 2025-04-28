import { NextRequest, NextResponse } from "next/server";
import { 
  LambdaClient, 
  UpdateFunctionCodeCommand,
  GetFunctionCommand,
  GetFunctionConfigurationCommand
} from "@aws-sdk/client-lambda";
import https from 'https';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as AdmZip from 'adm-zip';

export async function PUT(
  request: NextRequest,
  { params }: { params: { functionName: string } }
) {
  try {
    const { functionName } = await params;
    const decodedFunctionName = decodeURIComponent(functionName);
    
    if (!request.body) {
      return NextResponse.json(
        { message: "No file provided" },
        { status: 400 }
      );
    }

    // Get the form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { message: "No file provided in form data" },
        { status: 400 }
      );
    }

    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const zipBuffer = Buffer.from(arrayBuffer);

    const client = new LambdaClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });

    const command = new UpdateFunctionCodeCommand({
      FunctionName: decodedFunctionName,
      ZipFile: zipBuffer,
      Publish: true
    });

    const response = await client.send(command);

    return NextResponse.json({
      message: "Function code updated successfully",
      version: response.Version,
      lastModified: response.LastModified
    });
  } catch (error) {
    console.error("Error updating function code:", error);
    return NextResponse.json(
      { 
        message: error instanceof Error ? error.message : "Failed to update function code",
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { functionName: string } }
) {
  try {
    const { functionName } = await params;
    const decodedFunctionName = decodeURIComponent(functionName);
    
    const client = new LambdaClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });

    // Get function details including the code location
    const getFunctionCommand = new GetFunctionCommand({
      FunctionName: decodedFunctionName
    });

    const response = await client.send(getFunctionCommand);

    if (!response.Code?.Location) {
      throw new Error('Code location not found');
    }

    // Fetch the code from the signed URL
    const codeZip = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      https.get(response.Code.Location, (res) => {
        res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }).on('error', reject);
    });

    // Extract files from the zip
    const zip = new AdmZip(codeZip);
    const zipEntries = zip.getEntries();

    // Create a file structure from zip entries
    const fileStructure: any = {};
    const files: { [key: string]: string } = {};

    zipEntries.forEach(entry => {
      if (!entry.isDirectory) {
        const pathParts = entry.entryName.split('/');
        let current = fileStructure;
        
        // Build the tree structure
        for (let i = 0; i < pathParts.length - 1; i++) {
          const part = pathParts[i];
          if (!current[part]) {
            current[part] = {};
          }
          current = current[part];
        }
        
        // Add the file
        const fileName = pathParts[pathParts.length - 1];
        current[fileName] = 'file';
        
        // Store the file content
        files[entry.entryName] = entry.getData().toString('utf8');
      }
    });

    // Get the main handler file
    const config = await client.send(new GetFunctionConfigurationCommand({
      FunctionName: decodedFunctionName
    }));

    const handlerPath = config.Handler?.split('.')[0] + '.js';
    const mainCode = files[handlerPath] || Object.values(files)[0] || '';

    return NextResponse.json({
      code: mainCode,
      fileStructure,
      files,
      functionDetails: {
        runtime: config.Runtime,
        handler: config.Handler,
        lastModified: config.LastModified,
        description: config.Description
      }
    });
  } catch (error) {
    console.error("Error fetching function code:", error);
    return NextResponse.json(
      { 
        message: error instanceof Error ? error.message : "Failed to fetch function code",
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

async function getDirectoryStructure(dir: string): Promise<any> {
  const files = await fs.readdir(dir);
  const structure: any = {};

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stats = await fs.stat(fullPath);

    if (stats.isDirectory()) {
      structure[file] = await getDirectoryStructure(fullPath);
    } else {
      structure[file] = 'file';
    }
  }

  return structure;
} 