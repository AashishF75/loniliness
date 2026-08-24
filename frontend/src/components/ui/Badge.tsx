import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'purple' | 'amber' | 'green' | 'red';
  size?: 'sm' | 'md';
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-extrabold rounded-full transition-colors shrink-0',
          {
            'bg-brand-100 text-brand-900 border border-brand-200': variant === 'primary',
            'bg-gray-100 text-gray-800 border border-gray-200': variant === 'secondary',
            'bg-transparent text-gray-700 border border-gray-300': variant === 'outline',
            'bg-purple-100 text-purple-900 border border-purple-200': variant === 'purple',
            'bg-amber-100 text-amber-900 border border-amber-200': variant === 'amber',
            'bg-green-100 text-green-900 border border-green-200': variant === 'green',
            'bg-red-100 text-red-900 border border-red-200': variant === 'red',
            'px-2.5 py-0.5 text-xs': size === 'sm',
            'px-3.5 py-1 text-sm': size === 'md',
          },
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';
