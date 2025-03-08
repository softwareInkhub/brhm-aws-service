'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Plus } from '@/app/components/ui/icons';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { listBuckets, type Bucket } from '@/app/services/s3';
import { logger } from '@/app/utils/logger';

export default function S3Page() {
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadBuckets() {
    logger.info('S3Page: Starting to load buckets', {
      component: 'S3Page'
    });
    setLoading(true);
    setError(null);

    try {
      logger.debug('S3Page: Calling listBuckets service', {
        component: 'S3Page'
      });
      const startTime = Date.now();
      
      const response = await listBuckets();
      
      setBuckets(response.buckets.map(bucket => ({
        ...bucket,
        CreationDate: new Date(bucket.CreationDate)
      })));
      
      const duration = Date.now() - startTime;
      logger.debug(`S3Page: listBuckets completed in ${duration}ms`, {
        component: 'S3Page'
      });
      
      logger.info('S3Page: Successfully loaded buckets', {
        component: 'S3Page',
        data: {
          count: response.buckets.length,
          requestId: response.requestId,
          region: response.region
        }
      });
    } catch (error) {
      logger.error('S3Page: Error loading buckets', {
        component: 'S3Page',
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
    logger.info('S3Page: Component mounted', {
      component: 'S3Page'
    });
    loadBuckets();
  }, []);

  const handleCreateBucket = () => {
    logger.info('Create bucket button clicked', { 
      component: 'S3Page'
    });
    // Implementation for create bucket modal/form
  };

  if (loading) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="p-4">
            <p>Loading S3 buckets...</p>
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
        <h1 className="text-3xl font-bold">S3 Buckets</h1>
        <Button onClick={handleCreateBucket}>
          <Plus className="mr-2 h-4 w-4" />
          Create Bucket
        </Button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Bucket List</CardTitle>
          </CardHeader>
          <CardContent>
            {buckets.length === 0 ? (
              <p className="text-sm text-gray-500">No buckets found</p>
            ) : (
              <ul className="space-y-2">
                {buckets.map((bucket) => (
                  <li key={bucket.Name} className="text-sm">
                    <span className="font-medium">{bucket.Name}</span>
                    {bucket.CreationDate && (
                      <span className="text-gray-500 ml-2">
                        Created: {new Date(bucket.CreationDate).toLocaleDateString()}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Storage Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Monitor storage usage and costs</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Access Control</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Manage bucket policies and permissions</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 