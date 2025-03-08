import { cn } from '@/app/utils/cn';
import React from 'react';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive';
}

export function Alert({
  children,
  className,
  variant = 'default',
  ...props
}: AlertProps) {
  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        {
          'bg-red-50 border-red-200 text-red-800': variant === 'destructive',
          'bg-gray-50 border-gray-200': variant === 'default',
        },
        className
      )}
      role="alert"
      {...props}
    >
      {children}
    </div>
  );
}

export function AlertDescription({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-sm leading-5', className)}
      {...props}
    >
      {children}
    </p>
  );
} 