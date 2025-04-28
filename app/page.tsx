'use client';

import React from 'react';
import Link from 'next/link';

const serviceCards = [
  {
    title: 'S3 Buckets',
    description: 'Manage your S3 storage buckets',
    href: '/aws/s3',
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M3 3h18v18H3V3zm16 16V5H5v14h14zM7 7h10v2H7V7zm0 4h10v2H7v-2zm0 4h7v2H7v-2z"/>
      </svg>
    ),
  },
  {
    title: 'DynamoDB Tables',
    description: 'Manage your DynamoDB tables',
    href: '/aws/dynamodb',
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M3 3h18v18H3V3zm16 16V5H5v14h14zM7 7h10v2H7V7zm0 4h10v2H7v-2zm0 4h10v2H7v-2z"/>
      </svg>
    ),
  },
  {
    title: 'Lambda Functions',
    description: 'Manage your Lambda functions',
    href: '/aws/lambda',
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
    ),
  },
  {
    title: 'API Gateway',
    description: 'Manage your API endpoints',
    href: '/aws/apigateway',
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M3 3h18v18H3V3zm16 16V5H5v14h14zM7 7h10v2H7V7zm0 4h10v2H7v-2zm0 4h10v2H7v-2z"/>
      </svg>
    ),
  },
  {
    title: 'IAM Roles',
    description: 'Manage your IAM roles and policies',
    href: '/aws/iam',
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
      </svg>
    ),
  },
  {
    title: 'Step Functions',
    description: 'Build visual workflows for applications',
    href: '/aws/stepfunctions',
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
      </svg>
    ),
  },
];

export default function Home() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">AWS Services Overview</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage and monitor your AWS services from one central dashboard
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {serviceCards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
          >
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
                {card.icon}
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">{card.title}</h3>
                <p className="mt-1 text-sm text-gray-500">{card.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
