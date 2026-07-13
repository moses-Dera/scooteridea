'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  href: string;
  icon: React.ReactNode;
  label: string;
}

interface BottomNavigationProps {
  items: NavItem[];
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ items }) => {
  const pathname = usePathname();

  return (
    <nav
      className={`
        fixed bottom-0 left-0 right-0 z-40
        bg-neutral-900 border-t border-neutral-800
        sm:static sm:border-t-0 sm:border-r
        flex sm:flex-col
        sm:w-64 sm:h-screen
        pb-6 sm:pb-0
      `}
    >
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`
              flex-1 sm:flex-none
              flex items-center justify-center sm:justify-start
              gap-3 px-4 py-3
              text-sm font-medium
              transition-colors duration-200
              ${
                isActive
                  ? 'text-emerald-400 bg-emerald-500/10 border-l-4 sm:border-l-0 sm:border-r-4 border-emerald-400'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }
            `}
          >
            <span className="w-6 h-6">{item.icon}</span>
            <span className="hidden sm:inline">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
