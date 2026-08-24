import React from 'react';
import { cn } from '../../lib/utils';

export interface SectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  badge?: React.ReactNode;
}

export const SectionHeader = React.forwardRef<HTMLDivElement, SectionHeaderProps>(
  ({ className, title, subtitle, icon, action, badge, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2',
          className
        )}
        {...props}
      >
        <div className="flex items-start sm:items-center gap-3">
          {icon && <div className="shrink-0 text-brand-600 mt-1 sm:mt-0">{icon}</div>}
          <div className="flex flex-col">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">{title}</h2>
              {badge}
            </div>
            {subtitle && <p className="text-base sm:text-lg text-gray-600 font-medium mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {action && <div className="shrink-0 self-start sm:self-auto">{action}</div>}
      </div>
    );
  }
);
SectionHeader.displayName = 'SectionHeader';
