'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function StepFunctionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isRoot = pathname === '/aws/stepfunctions';

  return (
    <div className="min-h-screen bg-gray-50">
      {!isRoot && (
        <div className="h-12 border-b bg-white px-6 flex items-center">
          <Link 
            href="/aws/stepfunctions" 
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
          >
            <svg 
              className="w-4 h-4 mr-1" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M15 19l-7-7 7-7" 
              />
            </svg>
            Step Functions
          </Link>
        </div>
      )}
      <div className="px-6 py-6">
        {children}
      </div>
    </div>
  );
} 