'use client';

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

const sizeMap = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', text }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div
        className={`
          ${sizeMap[size]}
          border-2 border-neutral-700 border-t-emerald-500
          rounded-full animate-spin
        `}
      />
      {text && <p className="text-sm text-neutral-400">{text}</p>}
    </div>
  );
};
