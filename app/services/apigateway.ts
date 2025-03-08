export interface APIGateway {
  id: string;
  name: string;
  description?: string;
  endpointConfiguration: {
    types: string[];
  };
  protocol: string;
  createdDate: string;
}

export interface CreateAPIParams {
  name: string;
  description?: string;
  endpointType: 'REGIONAL' | 'EDGE' | 'PRIVATE';
  protocol: 'REST' | 'HTTP';
}

export async function listAPIs(): Promise<APIGateway[]> {
  const response = await fetch('/api/apigateway');
  if (!response.ok) {
    throw new Error('Failed to fetch API Gateway APIs');
  }
  return response.json();
}

export async function createAPI(params: CreateAPIParams): Promise<{ id: string }> {
  const response = await fetch('/api/apigateway', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error('Failed to create API Gateway');
  }

  return response.json();
} 