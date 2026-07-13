'use client';

import React from 'react';

interface StatCardProps {
  icon?: React.ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({ icon, label, value, unit, trend, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`
        bg-neutral-900 border border-neutral-800 rounded-xl p-4
        transition-all duration-200
        hover:border-neutral-700 hover:shadow-md
        ${onClick ? 'cursor-pointer' : ''}
      `}
    >
      <div className="flex items-center justify-between mb-2">
        {icon && <span className="w-5 h-5 text-emerald-400">{icon}</span>}
        {trend && (
          <span
            className={`
              text-xs font-semibold
              ${trend.direction === 'up' ? 'text-emerald-400' : 'text-red-400'}
            `}
          >
            {trend.direction === 'up' ? '↑' : '↓'} {trend.value}%
          </span>
        )}
      </div>

      <p className="text-xs text-neutral-400 mb-1 font-medium uppercase tracking-wide">{label}</p>

      <p className="text-2xl font-bold text-white flex items-baseline gap-1">
        {value}
        {unit && <span className="text-sm text-neutral-400 font-normal">{unit}</span>}
      </p>
    </div>
  );
};
