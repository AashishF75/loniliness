import React from 'react';
import { Heart } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface LoadingStateProps extends React.HTMLAttributes<HTMLDivElement> {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  className,
  message = 'Loading...',
  ...props
}) => {
  return (
    <div
      className={cn(
        'p-10 flex flex-col items-center justify-center min-h-[300px] text-center gap-4',
        className
      )}
      {...props}
    >
      <div className="w-16 h-16 rounded-2xl bg-brand-100/80 text-brand-600 flex items-center justify-center border border-brand-200 shadow-inner">
        <Heart className="w-8 h-8 animate-bounce text-brand-600" />
      </div>
      <p className="text-xl font-bold text-gray-600 animate-pulse">{message}</p>
    </div>
  );
};
