import { SFNClient } from '@aws-sdk/client-sfn';
import { CloudWatchClient } from '@aws-sdk/client-cloudwatch';

console.log('Initializing AWS clients with config:', {
  region: process.env.AWS_REGION || 'us-east-1',
  hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
  hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY
});

const config = {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
};

export const sfnClient = new SFNClient(config);
export const cloudWatchClient = new CloudWatchClient(config); 