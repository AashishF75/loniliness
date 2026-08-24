import React from 'react';
import { cn } from '../../lib/utils';
import { StatusPill, type StatusVariant } from './StatusPill';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name?: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  status?: StatusVariant;
  colorScheme?: 'brand' | 'purple' | 'amber' | 'green' | 'blue';
}

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, name = 'User', src, size = 'md', status, colorScheme = 'brand', ...props }, ref) => {
    const initial = name.trim() ? name.trim()[0].toUpperCase() : 'U';

    const colorClasses = {
      brand: 'bg-brand-100 text-brand-700 border-brand-200',
      purple: 'bg-purple-100 text-purple-700 border-purple-200',
      amber: 'bg-amber-100 text-amber-700 border-amber-200',
      green: 'bg-green-100 text-green-700 border-green-200',
      blue: 'bg-blue-100 text-blue-700 border-blue-200'
    };

    const sizeClasses = {
      sm: 'w-8 h-8 text-sm border',
      md: 'w-11 h-11 text-base border-2',
      lg: 'w-14 h-14 text-xl border-2',
      xl: 'w-16 h-16 text-2xl border-2',
      '2xl': 'w-20 h-20 text-3xl border-4'
    };

    return (
      <div ref={ref} className={cn('relative inline-flex shrink-0', className)} {...props}>
        {src ? (
          <img
            src={src}
            alt={name}
            className={cn(
              'rounded-2xl object-cover shadow-sm border-gray-200',
              sizeClasses[size]
            )}
          />
        ) : (
          <div
            className={cn(
              'rounded-2xl font-extrabold flex items-center justify-center shadow-sm select-none',
              colorClasses[colorScheme],
              sizeClasses[size]
            )}
          >
            {initial}
          </div>
        )}

        {status && (
          <div className="absolute -bottom-1 -right-1 z-10">
            <StatusPill status={status} size="sm" showDot label="" className="p-1 rounded-full bg-white shadow-md border-white" />
          </div>
        )}
      </div>
    );
  }
);
Avatar.displayName = 'Avatar';
