"use client";

import { ReactNode } from 'react';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    isPositive: boolean;
  };
  icon?: ReactNode;
  bgColor?: string;
}

export function KPICard({ 
  title, 
  value, 
  change, 
  icon, 
  bgColor = 'bg-slate-800' 
}: KPICardProps) {
  return (
    <div className={`${bgColor} border border-slate-700 rounded-lg p-6`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-slate-400 text-sm font-medium">{title}</p>
          <div className="text-3xl font-bold text-white mt-2">{value}</div>
          
          {change && (
            <p className={`text-sm mt-2 ${change.isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {change.isPositive ? '↑' : '↓'} {Math.abs(change.value)}% from last period
            </p>
          )}
        </div>
        
        {icon && (
          <div className="text-slate-500 text-3xl">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
