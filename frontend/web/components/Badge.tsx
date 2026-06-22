'use client'

import React from 'react'

type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'neutral'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  children: React.ReactNode
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  error: 'bg-red-500/20 text-red-300 border border-red-500/30',
  warning: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  info: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  neutral: 'bg-neutral-700 text-neutral-200 border border-neutral-600',
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'neutral', className = '', children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={`
          inline-block px-3 py-1 rounded-full text-xs font-semibold
          ${variantClasses[variant]}
          ${className}
        `}
        {...props}
      >
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'
