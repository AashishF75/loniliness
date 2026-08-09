import React from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-xl font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:pointer-events-none disabled:opacity-50',
          {
            'bg-brand-600 text-white hover:bg-brand-700': variant === 'primary',
            'bg-brand-100 text-brand-900 hover:bg-brand-200': variant === 'secondary',
            'border-2 border-brand-200 bg-transparent hover:bg-brand-50 text-brand-900': variant === 'outline',
            'hover:bg-brand-100 text-brand-900': variant === 'ghost',
            'h-12 px-5 py-2 text-base': size === 'sm',
            'h-14 px-6 py-3 text-lg': size === 'md',
            'h-16 px-8 py-4 text-xl': size === 'lg',
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
