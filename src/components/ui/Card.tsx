import React from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-2xl border border-gray-200 bg-white p-6 shadow-sm',
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = 'Card';
