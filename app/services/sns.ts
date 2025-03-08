import { logger } from '@/app/utils/logger';

export interface SNSTopic {
  TopicArn: string;
  Name?: string;
  DisplayName?: string;
  SubscriptionsConfirmed?: number;
  SubscriptionsPending?: number;
}

export interface SNSSubscription {
  SubscriptionArn: string;
  TopicArn: string;
  Protocol: string;
  Endpoint: string;
  Status: string;
}

export interface SNSResponse {
  topics: SNSTopic[];
  requestId: string;
  timestamp: string;
}

export interface SNSError {
  error: string;
  message: string;
  requestId: string;
  timestamp: string;
}

export interface CreateTopicParams {
  Name: string;
  DisplayName?: string;
  Policy?: string | object;
  DeliveryPolicy?: string | object;
  Tags?: Array<{ Key: string; Value: string }>;
}

export interface CreateSubscriptionParams {
  TopicArn: string;
  Protocol: 'http' | 'https' | 'email' | 'email-json' | 'sms' | 'sqs' | 'application' | 'lambda';
  Endpoint: string;
  FilterPolicy?: object;
}

export async function listTopics(): Promise<SNSResponse> {
  logger.info('Initiating request to list SNS topics', {
    component: 'SNSService'
  });
  
  try {
    const response = await fetch('/api/sns/topics');
    
    if (!response.ok) {
      const errorData: SNSError = await response.json();
      logger.error('Failed to list SNS topics', {
        component: 'SNSService',
        data: {
          status: response.status,
          error: errorData
        }
      });
      throw new Error(errorData.message || 'Failed to fetch SNS topics');
    }

    const data: SNSResponse = await response.json();
    logger.info('Successfully retrieved SNS topics', {
      component: 'SNSService',
      data: {
        count: data.topics.length,
        requestId: data.requestId
      }
    });

    return data;
  } catch (error) {
    logger.error('Error in listTopics', {
      component: 'SNSService',
      data: {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    });
    throw error;
  }
}

export async function createTopic(params: CreateTopicParams): Promise<{ topicArn: string }> {
  logger.info('Creating SNS topic', {
    component: 'SNSService',
    data: { name: params.Name }
  });

  try {
    const response = await fetch('/api/sns/topics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json();
      logger.error('Failed to create SNS topic', {
        component: 'SNSService',
        data: {
          status: response.status,
          error: errorData
        }
      });
      throw new Error(errorData.message || 'Failed to create SNS topic');
    }

    const data = await response.json();
    logger.info('SNS topic created successfully', {
      component: 'SNSService',
      data: {
        name: params.Name,
        topicArn: data.topicArn,
        requestId: data.requestId
      }
    });

    return { topicArn: data.topicArn };
  } catch (error) {
    logger.error('Error creating SNS topic', {
      component: 'SNSService',
      data: {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    });
    throw error;
  }
}

export async function deleteTopic(topicArn: string): Promise<void> {
  logger.info('Deleting SNS topic', {
    component: 'SNSService',
    data: { topicArn }
  });

  try {
    const response = await fetch(`/api/sns/topics/${encodeURIComponent(topicArn)}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      logger.error('Failed to delete SNS topic', {
        component: 'SNSService',
        data: {
          status: response.status,
          error: errorData
        }
      });
      throw new Error(errorData.message || 'Failed to delete SNS topic');
    }

    logger.info('SNS topic deleted successfully', {
      component: 'SNSService',
      data: { topicArn }
    });
  } catch (error) {
    logger.error('Error deleting SNS topic', {
      component: 'SNSService',
      data: {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    });
    throw error;
  }
}

export async function createSubscription(params: CreateSubscriptionParams): Promise<{ subscriptionArn: string }> {
  logger.info('Creating SNS subscription', {
    component: 'SNSService',
    data: {
      topicArn: params.TopicArn,
      protocol: params.Protocol
    }
  });

  try {
    const response = await fetch('/api/sns/subscriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json();
      logger.error('Failed to create SNS subscription', {
        component: 'SNSService',
        data: {
          status: response.status,
          error: errorData
        }
      });
      throw new Error(errorData.message || 'Failed to create SNS subscription');
    }

    const data = await response.json();
    logger.info('SNS subscription created successfully', {
      component: 'SNSService',
      data: {
        topicArn: params.TopicArn,
        subscriptionArn: data.subscriptionArn,
        requestId: data.requestId
      }
    });

    return { subscriptionArn: data.subscriptionArn };
  } catch (error) {
    logger.error('Error creating SNS subscription', {
      component: 'SNSService',
      data: {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    });
    throw error;
  }
} 