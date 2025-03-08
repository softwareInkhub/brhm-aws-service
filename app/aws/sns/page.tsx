'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Plus } from '@/app/components/ui/icons';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/app/components/ui/dialog';
import { DataTable } from '@/app/components/ui/data-table';
import { listTopics, createTopic, deleteTopic, type SNSTopic, type CreateTopicParams } from '@/app/services/sns';
import { logger } from '@/app/utils/logger';

interface CreateTopicDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTopicParams) => Promise<void>;
}

function CreateTopicDialog({ isOpen, onClose, onSubmit }: CreateTopicDialogProps) {
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        Name: name,
        ...(displayName && { DisplayName: displayName }),
      });
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create topic');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Create SNS Topic">
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>Create New Topic</DialogTitle>
          <DialogDescription>
            Create a new SNS topic to start sending notifications.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 p-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Topic Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              required
            />
          </div>

          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
              Display Name (Optional)
            </label>
            <input
              type="text"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Topic'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

interface DeleteTopicDialogProps {
  isOpen: boolean;
  onClose: () => void;
  topic: SNSTopic | null;
  onConfirm: (topicArn: string) => Promise<void>;
}

function DeleteTopicDialog({ isOpen, onClose, topic, onConfirm }: DeleteTopicDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!topic) return;
    setIsDeleting(true);
    setError(null);

    try {
      await onConfirm(topic.TopicArn);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete topic');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Delete Topic">
      <DialogHeader>
        <DialogTitle>Delete Topic</DialogTitle>
        <DialogDescription>
          Are you sure you want to delete this topic? This action cannot be undone.
        </DialogDescription>
      </DialogHeader>

      <div className="p-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <p className="text-sm text-gray-500">
          Topic: {topic?.Name || topic?.TopicArn.split(':').pop()}
        </p>
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isDeleting}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? 'Deleting...' : 'Delete Topic'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

export default function SNSPage() {
  const [topics, setTopics] = useState<SNSTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deleteDialogTopic, setDeleteDialogTopic] = useState<SNSTopic | null>(null);
  const [sortColumn, setSortColumn] = useState<string>('Name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  async function loadTopics() {
    logger.info('SNSPage: Starting to load topics', {
      component: 'SNSPage'
    });
    setLoading(true);
    setError(null);

    try {
      const response = await listTopics();
      setTopics(response.topics);
    } catch (error) {
      logger.error('SNSPage: Error loading topics', {
        component: 'SNSPage',
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
    loadTopics();
  }, []);

  const handleCreateTopic = async (data: CreateTopicParams) => {
    await createTopic(data);
    await loadTopics();
  };

  const handleDeleteTopic = async (topicArn: string) => {
    await deleteTopic(topicArn);
    await loadTopics();
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedTopics = [...topics].sort((a, b) => {
    const aValue = a[sortColumn as keyof SNSTopic] || '';
    const bValue = b[sortColumn as keyof SNSTopic] || '';
    const comparison = String(aValue).localeCompare(String(bValue));
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const columns = [
    {
      key: 'Name',
      header: 'Name',
      render: (topic: SNSTopic) => topic.Name || topic.TopicArn.split(':').pop(),
      sortable: true,
    },
    {
      key: 'DisplayName',
      header: 'Display Name',
      sortable: true,
    },
    {
      key: 'SubscriptionsConfirmed',
      header: 'Subscriptions',
      render: (topic: SNSTopic) => (
        <span className="inline-flex items-center">
          <span className="text-green-600 font-medium">{topic.SubscriptionsConfirmed || 0}</span>
          {typeof topic.SubscriptionsPending === 'number' && topic.SubscriptionsPending > 0 && (
            <span className="ml-2 text-yellow-600">
              ({topic.SubscriptionsPending} pending)
            </span>
          )}
        </span>
      ),
      sortable: true,
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (topic: SNSTopic) => (
        <div className="flex justify-end space-x-2">
          <Button variant="outline" size="sm">
            View Subscriptions
          </Button>
          <Button variant="outline" size="sm">
            Add Subscription
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 hover:text-red-700"
            onClick={() => setDeleteDialogTopic(topic)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

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
        <div>
          <h1 className="text-3xl font-bold">SNS Topics</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your Simple Notification Service topics and subscriptions
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Topic
        </Button>
      </div>
      
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Topics</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              data={sortedTopics}
              columns={columns}
              keyExtractor={(topic) => topic.TopicArn}
              isLoading={loading}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              emptyMessage="No topics found. Create your first topic to get started."
            />
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Topic Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">Monitor message delivery and subscription status</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Topic Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">Configure delivery policies and access controls</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <CreateTopicDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSubmit={handleCreateTopic}
      />

      <DeleteTopicDialog
        isOpen={!!deleteDialogTopic}
        onClose={() => setDeleteDialogTopic(null)}
        topic={deleteDialogTopic}
        onConfirm={handleDeleteTopic}
      />
    </div>
  );
} 