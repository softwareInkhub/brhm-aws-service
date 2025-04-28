const { IAMClient, GetRoleCommand, UpdateAssumeRolePolicyCommand } = require('@aws-sdk/client-iam');
require('dotenv').config({ path: '.env.local' });

async function updateStepFunctionsRole() {
  const roleName = process.env.STEP_FUNCTIONS_ROLE_ARN.split('/').pop();
  const accountId = process.env.AWS_ACCOUNT_ID;
  const region = process.env.AWS_REGION || 'us-east-1';

  console.log(`Updating trust policy for role: ${roleName}`);
  console.log(`Account ID: ${accountId}`);
  console.log(`Region: ${region}`);

  const iamClient = new IAMClient({ region });

  try {
    // Get the current role
    const getRoleResponse = await iamClient.send(
      new GetRoleCommand({
        RoleName: roleName
      })
    );

    console.log('Current role details:');
    console.log(JSON.stringify(getRoleResponse.Role, null, 2));

    // Update the trust policy
    const trustPolicy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: {
            Service: 'states.amazonaws.com'
          },
          Action: 'sts:AssumeRole'
        }
      ]
    };

    const updateResponse = await iamClient.send(
      new UpdateAssumeRolePolicyCommand({
        RoleName: roleName,
        PolicyDocument: JSON.stringify(trustPolicy)
      })
    );

    console.log('Trust policy updated successfully');
    console.log(JSON.stringify(updateResponse, null, 2));
  } catch (error) {
    console.error('Error updating trust policy:', error);
  }
}

updateStepFunctionsRole(); 