'use client'

import React from 'react'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean
  children: React.ReactNode
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ elevated = true, className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          bg-neutral-900 border border-neutral-800 rounded-xl p-4
          transition-all duration-200
          ${elevated ? 'shadow-md hover:shadow-lg hover:border-neutral-700' : ''}
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

interface CardHeaderProps {
  title?: React.ReactNode
  subtitle?: React.ReactNode
  action?: React.ReactNode
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  action,
}) => (
  <div className="flex items-start justify-between gap-4 mb-4">
    <div>
      {title && <h3 className="text-lg font-bold text-white">{title}</h3>}
      {subtitle && <p className="text-sm text-neutral-400 mt-1">{subtitle}</p>}
    </div>
    {action}
  </div>
)

interface CardContentProps {
  children: React.ReactNode
}

export const CardContent: React.FC<CardContentProps> = ({ children }) => (
  <div className="text-neutral-300">{children}</div>
)

interface CardFooterProps {
  children: React.ReactNode
}

export const CardFooter: React.FC<CardFooterProps> = ({ children }) => (
  <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-neutral-800">
    {children}
  </div>
)
