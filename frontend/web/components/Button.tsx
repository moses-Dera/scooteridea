'use client';

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const variantClasses = {
  primary:
    'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white shadow-md hover:shadow-lg border-0',
  secondary:
    'bg-neutral-700 hover:bg-neutral-600 active:bg-neutral-800 text-white border border-neutral-600 hover:border-neutral-500',
  ghost:
    'bg-transparent hover:bg-neutral-800 active:bg-neutral-700 text-white border border-neutral-600 hover:border-neutral-500',
  danger:
    'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white shadow-md hover:shadow-lg border-0',
} as const;

const sizeClasses = {
  sm: 'px-3 py-2 text-sm font-medium rounded-lg h-10',
  md: 'px-4 py-2 text-base font-semibold rounded-lg h-12',
  lg: 'px-6 py-3 text-lg font-bold rounded-xl h-14',
} as const;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      icon,
      children,
      disabled,
      className = '',
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${fullWidth ? 'w-full' : ''}
          flex items-center justify-center gap-2
          transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500
          ${className}
        `}
        {...props}
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : icon ? (
          icon
        ) : null}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
