import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface VerifiedBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function VerifiedBadge({ size = 'md', showLabel = true, className = '' }: VerifiedBadgeProps) {
  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const textSizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  return (
    <span
      title="Verified Senior Citizen — Age (50+) & Identity Checked"
      className={`inline-flex items-center gap-1.5 font-bold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs cursor-help select-none ${textSizes[size]} ${className}`}
    >
      <ShieldCheck className={`${iconSizes[size]} text-emerald-600 shrink-0`} />
      {showLabel && <span>Verified Senior</span>}
    </span>
  );
}
