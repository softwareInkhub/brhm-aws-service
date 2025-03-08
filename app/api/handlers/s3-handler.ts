import { S3 } from '@aws-sdk/client-s3';
import { NextResponse } from 'next/server';

const s3Client = new S3({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export async function GET() {
  try {
    const { Buckets } = await s3Client.listBuckets({});
    return NextResponse.json(Buckets);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to list S3 buckets' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, region, versioning, encryption } = body;

    const createBucketParams = {
      Bucket: name,
      CreateBucketConfiguration: {
        LocationConstraint: region,
      },
    };

    await s3Client.createBucket(createBucketParams);

    // Configure bucket settings
    if (versioning) {
      await s3Client.putBucketVersioning({
        Bucket: name,
        VersioningConfiguration: {
          Status: 'Enabled',
        },
      });
    }

    if (encryption) {
      await s3Client.putBucketEncryption({
        Bucket: name,
        ServerSideEncryptionConfiguration: {
          Rules: [
            {
              ApplyServerSideEncryptionByDefault: {
                SSEAlgorithm: encryption,
              },
            },
          ],
        },
      });
    }

    return NextResponse.json({ message: 'Bucket created successfully' }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create S3 bucket' },
      { status: 500 }
    );
  }
} 