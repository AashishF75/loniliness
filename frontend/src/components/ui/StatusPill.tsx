import React from 'react';
import { cn } from '../../lib/utils';

export type StatusVariant =
  | 'live'
  | 'active'
  | 'connected'
  | 'outdated'
  | 'pending'
  | 'offline'
  | 'disabled'
  | 'emergency'
  | 'critical';

export interface StatusPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: StatusVariant;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
}

export const StatusPill = React.forwardRef<HTMLSpanElement, StatusPillProps>(
  ({ className, status, label, size = 'md', showDot = true, ...props }, ref) => {
    const getStatusConfig = (variant: StatusVariant) => {
      switch (variant) {
        case 'live':
          return {
            bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
            dot: 'bg-emerald-500 animate-pulse',
            defaultText: 'Live'
          };
        case 'active':
          return {
            bg: 'bg-green-50 text-green-800 border-green-200',
            dot: 'bg-green-500',
            defaultText: 'Active'
          };
        case 'connected':
          return {
            bg: 'bg-teal-50 text-teal-800 border-teal-200',
            dot: 'bg-teal-500',
            defaultText: 'Connected'
          };
        case 'outdated':
          return {
            bg: 'bg-amber-50 text-amber-900 border-amber-200',
            dot: 'bg-amber-500',
            defaultText: 'Outdated'
          };
        case 'pending':
          return {
            bg: 'bg-yellow-50 text-yellow-900 border-yellow-200',
            dot: 'bg-yellow-500',
            defaultText: 'Pending'
          };
        case 'offline':
          return {
            bg: 'bg-gray-100 text-gray-700 border-gray-200',
            dot: 'bg-gray-400',
            defaultText: 'Offline'
          };
        case 'disabled':
          return {
            bg: 'bg-slate-100 text-slate-600 border-slate-200',
            dot: 'bg-slate-400',
            defaultText: 'Disabled'
          };
        case 'emergency':
          return {
            bg: 'bg-rose-50 text-rose-900 border-rose-200',
            dot: 'bg-rose-600 animate-ping',
            defaultText: 'Emergency'
          };
        case 'critical':
          return {
            bg: 'bg-red-100 text-red-950 border-red-300',
            dot: 'bg-red-600',
            defaultText: 'Critical'
          };
      }
    };

    const config = getStatusConfig(status);
    const displayText = label || config.defaultText;

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-2 rounded-full border font-bold transition-all shrink-0',
          config.bg,
          {
            'px-2.5 py-0.5 text-xs': size === 'sm',
            'px-3.5 py-1 text-sm': size === 'md',
            'px-4 py-1.5 text-base': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {showDot && (
          <span
            className={cn('rounded-full shrink-0', config.dot, {
              'w-1.5 h-1.5': size === 'sm',
              'w-2 h-2': size === 'md',
              'w-2.5 h-2.5': size === 'lg',
            })}
          />
        )}
        <span className="truncate">{displayText}</span>
      </span>
    );
  }
);
StatusPill.displayName = 'StatusPill';
