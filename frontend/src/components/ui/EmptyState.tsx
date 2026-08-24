import React from 'react';
import { cn } from '../../lib/utils';
import { Card } from './Card';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, title, description, icon, action, ...props }, ref) => {
    return (
      <Card
        ref={ref}
        className={cn(
          'p-8 sm:p-12 text-center border-dashed border-2 border-gray-200 bg-gray-50/50 flex flex-col items-center justify-center gap-4 rounded-3xl shadow-none',
          className
        )}
        {...props}
      >
        {icon && (
          <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center border border-brand-100 shadow-sm mb-1">
            {icon}
          </div>
        )}
        <div className="max-w-md flex flex-col gap-1">
          <h3 className="text-xl sm:text-2xl font-extrabold text-gray-900">{title}</h3>
          <p className="text-base sm:text-lg text-gray-500 font-medium leading-relaxed">{description}</p>
        </div>
        {action && <div className="mt-2">{action}</div>}
      </Card>
    );
  }
);
EmptyState.displayName = 'EmptyState';
