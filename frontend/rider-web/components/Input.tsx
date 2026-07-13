'use client';

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, helperText, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-neutral-300 mb-2">{label}</label>
        )}

        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">{icon}</div>
          )}

          <input
            ref={ref}
            className={`
              w-full h-12 px-4 py-3
              ${icon ? 'pl-10' : 'pl-4'}
              bg-neutral-800 border border-neutral-700 rounded-lg
              text-white placeholder-neutral-500
              focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
              transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              ${error ? 'border-red-500 focus:ring-red-500' : ''}
              ${className}
            `}
            {...props}
          />
        </div>

        {error && (
          <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18.101 12.93a1 1 0 00-1.414-1.414L10 15.586l-6.687-6.687a1 1 0 00-1.414 1.414l8.1 8.1a1 1 0 001.414 0l9.9-9.9z"
              />
            </svg>
            {error}
          </p>
        )}

        {helperText && !error && <p className="text-xs text-neutral-400 mt-2">{helperText}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
