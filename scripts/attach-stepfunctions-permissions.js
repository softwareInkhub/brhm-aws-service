const { IAMClient, AttachRolePolicyCommand, ListAttachedRolePoliciesCommand } = require('@aws-sdk/client-iam');
require('dotenv').config({ path: '.env.local' });

async function attachStepFunctionsPermissions() {
  const roleName = process.env.STEP_FUNCTIONS_ROLE_ARN.split('/').pop();
  const region = process.env.AWS_REGION || 'us-east-1';

  console.log(`Attaching permissions to role: ${roleName}`);
  console.log(`Region: ${region}`);

  const iamClient = new IAMClient({ region });

  try {
    // List current attached policies
    const listPoliciesResponse = await iamClient.send(
      new ListAttachedRolePoliciesCommand({
        RoleName: roleName
      })
    );

    console.log('Current attached policies:');
    console.log(JSON.stringify(listPoliciesResponse.AttachedPolicies, null, 2));

    // Check if the role already has AdministratorAccess
    const hasAdminAccess = listPoliciesResponse.AttachedPolicies.some(
      policy => policy.PolicyArn === 'arn:aws:iam::aws:policy/AdministratorAccess'
    );

    if (hasAdminAccess) {
      console.log('Role already has AdministratorAccess policy, which includes Step Functions permissions');
      return;
    }

    // Attach Step Functions execution policy
    const attachResponse = await iamClient.send(
      new AttachRolePolicyCommand({
        RoleName: roleName,
        PolicyArn: 'arn:aws:iam::aws:policy/AWSStepFunctionsFullAccess'
      })
    );

    console.log('Step Functions execution policy attached successfully');
    console.log(JSON.stringify(attachResponse, null, 2));
  } catch (error) {
    console.error('Error attaching permissions:', error);
  }
}

attachStepFunctionsPermissions(); 