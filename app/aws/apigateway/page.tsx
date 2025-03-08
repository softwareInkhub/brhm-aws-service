'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Plus } from '@/app/components/ui/icons';
import { listAPIs, type APIGateway } from '@/app/services/apigateway';

export default function APIGatewayPage() {
  const [apis, setApis] = useState<APIGateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAPIs();
  }, []);

  async function loadAPIs() {
    try {
      const data = await listAPIs();
      setApis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load APIs');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">API Gateway</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create API
        </Button>
      </div>
      
      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>API List</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-gray-500">Loading APIs...</p>
            ) : apis.length === 0 ? (
              <p className="text-sm text-gray-500">No APIs found</p>
            ) : (
              <ul className="space-y-2">
                {apis.map((api) => (
                  <li key={api.id} className="text-sm">
                    <div className="font-medium">{api.name}</div>
                    {api.description && (
                      <div className="text-gray-500">{api.description}</div>
                    )}
                    <div className="text-gray-500">
                      Protocol: {api.protocol} | Endpoint: {api.endpointConfiguration.types.join(', ')}
                    </div>
                    <div className="text-gray-500">
                      Created: {new Date(api.createdDate).toLocaleDateString()}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>API Monitoring</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Monitor API performance and usage</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Manage API keys and authorizers</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 