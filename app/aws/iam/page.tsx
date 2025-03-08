'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Plus } from '@/app/components/ui/icons';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { listRoles, type IAMRole } from '@/app/services/iam';
import { logger } from '@/app/utils/logger';

export default function IAMPage() {
  const [roles, setRoles] = useState<IAMRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadRoles() {
    logger.info('IAMPage: Starting to load roles', {
      component: 'IAMPage'
    });
    setLoading(true);
    setError(null);

    try {
      logger.debug('IAMPage: Calling listRoles service', {
        component: 'IAMPage'
      });
      const startTime = Date.now();
      
      const response = await listRoles();
      
      setRoles(response.roles);
      
      const duration = Date.now() - startTime;
      logger.debug(`IAMPage: listRoles completed in ${duration}ms`, {
        component: 'IAMPage'
      });
      
      logger.info('IAMPage: Successfully loaded roles', {
        component: 'IAMPage',
        data: {
          count: response.roles.length,
          requestId: response.requestId
        }
      });
    } catch (error) {
      logger.error('IAMPage: Error loading roles', {
        component: 'IAMPage',
        data: {
          error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack
          } : 'Unknown error'
        }
      });
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    logger.info('IAMPage: Component mounted', {
      component: 'IAMPage'
    });
    loadRoles();
  }, []);

  const handleCreateRole = () => {
    logger.info('Create role button clicked', { 
      component: 'IAMPage'
    });
    // Implementation for create role modal/form
  };

  if (loading) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="p-4">
            <p>Loading IAM roles...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">IAM Roles</h1>
        <Button onClick={handleCreateRole}>
          <Plus className="mr-2 h-4 w-4" />
          Create Role
        </Button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Role List</CardTitle>
          </CardHeader>
          <CardContent>
            {roles.length === 0 ? (
              <p className="text-sm text-gray-500">No roles found</p>
            ) : (
              <ul className="space-y-2">
                {roles.map((role) => (
                  <li key={role.RoleId} className="text-sm">
                    <span className="font-medium">{role.RoleName}</span>
                    <div className="text-gray-500 ml-2">
                      <div>ARN: {role.Arn}</div>
                      <div>Created: {new Date(role.CreateDate).toLocaleDateString()}</div>
                      {role.Description && <div>Description: {role.Description}</div>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Role Policies</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Manage role policies and permissions</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Access Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Analyze role usage and access patterns</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 