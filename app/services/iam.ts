import { IAM } from 'aws-sdk';
import { logger } from '../utils/logger';

const iam = new IAM({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  }
});

export interface IAMRole {
  RoleName: string;
  RoleId: string;
  Arn: string;
  CreateDate: Date;
  Description?: string;
  AssumeRolePolicyDocument?: any;
  AttachedPolicies?: IAMPolicy[];
}

export interface IAMPolicy {
  PolicyName: string;
  PolicyArn: string;
  Description?: string;
}

export interface IAMUser {
  UserName: string;
  UserId: string;
  Arn: string;
  CreateDate: Date;
  PasswordLastUsed?: Date;
  Tags?: { Key: string; Value: string; }[];
}

export interface IAMGroup {
  GroupName: string;
  GroupId: string;
  Arn: string;
  CreateDate: Date;
  UserCount: number;
}

// Users
export async function listUsers() {
  try {
    const response = await iam.listUsers().promise();
    return {
      users: response.Users || [],
      requestId: response.$response.requestId
    };
  } catch (error) {
    logger.error('Error listing IAM users:', { 
      component: 'IAMService',
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
    throw error;
  }
}

export async function createUser(userName: string) {
  try {
    const response = await iam.createUser({
      UserName: userName
    }).promise();
    return response.User;
  } catch (error) {
    logger.error('Error creating IAM user:', { 
      component: 'IAMService',
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
    throw error;
  }
}

export async function deleteUser(userName: string) {
  try {
    await iam.deleteUser({
      UserName: userName
    }).promise();
  } catch (error) {
    logger.error('Error deleting IAM user:', { 
      component: 'IAMService',
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
    throw error;
  }
}

// Groups
export async function listGroups() {
  try {
    const response = await iam.listGroups().promise();
    return {
      groups: response.Groups || [],
      requestId: response.$response.requestId
    };
  } catch (error) {
    logger.error('Error listing IAM groups:', { 
      component: 'IAMService',
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
    throw error;
  }
}

export async function createGroup(groupName: string) {
  try {
    const response = await iam.createGroup({
      GroupName: groupName
    }).promise();
    return response.Group;
  } catch (error) {
    logger.error('Error creating IAM group:', { 
      component: 'IAMService',
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
    throw error;
  }
}

export async function deleteGroup(groupName: string) {
  try {
    await iam.deleteGroup({
      GroupName: groupName
    }).promise();
  } catch (error) {
    logger.error('Error deleting IAM group:', { 
      component: 'IAMService',
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
    throw error;
  }
}

// Roles
export async function listRoles() {
  try {
    const response = await iam.listRoles().promise();
    const roles = await Promise.all((response.Roles || []).map(async (role) => {
      const attachedPolicies = await listAttachedRolePolicies(role.RoleName);
      return {
        ...role,
        AttachedPolicies: attachedPolicies.map(policy => ({
          PolicyName: policy.PolicyName || '',
          PolicyArn: policy.PolicyArn || ''
        }))
      };
    }));
    
    return {
      roles,
      requestId: response.$response.requestId
    };
  } catch (error) {
    logger.error('Error listing IAM roles:', { 
      component: 'IAMService',
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
    throw error;
  }
}

export async function createRole(params: {
  RoleName: string;
  Description?: string;
  AssumeRolePolicyDocument: any;
}) {
  try {
    const response = await iam.createRole({
      RoleName: params.RoleName,
      Description: params.Description,
      AssumeRolePolicyDocument: JSON.stringify(params.AssumeRolePolicyDocument)
    }).promise();
    return response.Role;
  } catch (error) {
    logger.error('Error creating IAM role:', { 
      component: 'IAMService',
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
    throw error;
  }
}

export async function deleteRole(roleName: string) {
  try {
    // First detach all policies
    const policies = await listAttachedRolePolicies(roleName);
    for (const policy of policies) {
      if (policy.PolicyArn) {
        await detachRolePolicy(roleName, policy.PolicyArn);
      }
    }
    
    await iam.deleteRole({
      RoleName: roleName
    }).promise();
  } catch (error) {
    logger.error('Error deleting IAM role:', { 
      component: 'IAMService',
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
    throw error;
  }
}

// Policies
export async function listPolicies() {
  try {
    const response = await iam.listPolicies({
      Scope: 'All'
    }).promise();
    return {
      policies: response.Policies || [],
      requestId: response.$response.requestId
    };
  } catch (error) {
    logger.error('Error listing IAM policies:', { 
      component: 'IAMService',
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
    throw error;
  }
}

export async function createPolicy(params: {
  PolicyName: string;
  Description?: string;
  PolicyDocument: any;
}) {
  try {
    const response = await iam.createPolicy({
      PolicyName: params.PolicyName,
      Description: params.Description,
      PolicyDocument: JSON.stringify(params.PolicyDocument)
    }).promise();
    return response.Policy;
  } catch (error) {
    logger.error('Error creating IAM policy:', { 
      component: 'IAMService',
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
    throw error;
  }
}

export async function deletePolicy(policyArn: string) {
  try {
    await iam.deletePolicy({
      PolicyArn: policyArn
    }).promise();
  } catch (error) {
    logger.error('Error deleting IAM policy:', { 
      component: 'IAMService',
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
    throw error;
  }
}

// Role-Policy Operations
export async function listAttachedRolePolicies(roleName: string) {
  try {
    const response = await iam.listAttachedRolePolicies({
      RoleName: roleName
    }).promise();
    return response.AttachedPolicies || [];
  } catch (error) {
    logger.error('Error listing attached role policies:', { 
      component: 'IAMService',
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
    throw error;
  }
}

export async function attachRolePolicy(roleName: string, policyArn: string) {
  try {
    await iam.attachRolePolicy({
      RoleName: roleName,
      PolicyArn: policyArn
    }).promise();
  } catch (error) {
    logger.error('Error attaching role policy:', { 
      component: 'IAMService',
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
    throw error;
  }
}

export async function detachRolePolicy(roleName: string, policyArn: string) {
  try {
    await iam.detachRolePolicy({
      RoleName: roleName,
      PolicyArn: policyArn
    }).promise();
  } catch (error) {
    logger.error('Error detaching role policy:', { 
      component: 'IAMService',
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
    throw error;
  }
}

// Tags
export async function listRoleTags(roleName: string) {
  try {
    const response = await iam.listRoleTags({
      RoleName: roleName
    }).promise();
    return response.Tags || [];
  } catch (error) {
    logger.error('Error listing role tags:', { 
      component: 'IAMService',
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
    throw error;
  }
}

export async function tagRole(roleName: string, tags: { Key: string; Value: string; }[]) {
  try {
    await iam.tagRole({
      RoleName: roleName,
      Tags: tags
    }).promise();
  } catch (error) {
    logger.error('Error tagging role:', { 
      component: 'IAMService',
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
    throw error;
  }
}

export async function untagRole(roleName: string, tagKeys: string[]) {
  try {
    await iam.untagRole({
      RoleName: roleName,
      TagKeys: tagKeys
    }).promise();
  } catch (error) {
    logger.error('Error untagging role:', { 
      component: 'IAMService',
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
    throw error;
  }
} 