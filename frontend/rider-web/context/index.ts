'use client';

import { useContext } from 'react';
import { RideContext, RideContextType } from './RideContext';

export function useRide(): RideContextType {
  const context = useContext(RideContext);
  if (!context) {
    throw new Error('useRide must be used within RideProvider');
  }
  return context;
}
