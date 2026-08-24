import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';
import { Card } from './Card';

export interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryText?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  className,
  title = 'Something went wrong',
  message,
  onRetry,
  retryText = 'Try Again',
  ...props
}) => {
  return (
    <Card
      className={cn(
        'p-6 sm:p-8 bg-red-50/70 border-red-200 text-red-950 flex flex-col items-center text-center gap-4 rounded-3xl',
        className
      )}
      {...props}
    >
      <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center border border-red-200 shadow-sm">
        <AlertCircle className="w-7 h-7" />
      </div>
      <div className="flex flex-col gap-1 max-w-md">
        <h3 className="text-xl font-extrabold text-red-900">{title}</h3>
        <p className="text-base text-red-700 font-medium">{message}</p>
      </div>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          className="border-red-300 text-red-800 hover:bg-red-100 font-bold px-6 py-2.5 rounded-xl text-base flex items-center gap-2 mt-1"
        >
          <RotateCcw className="w-4 h-4" />
          {retryText}
        </Button>
      )}
    </Card>
  );
};
