'use client';

import { useEffect } from 'react';
import { ridesService } from '@/lib/ridesService';
import { useRide } from '@/context/RideContext';

interface RideTimerProps {
  surgeMultiplier?: number;
  baseRate?: number;
}

export function RideTimer({ surgeMultiplier = 1, baseRate = 50 }: RideTimerProps) {
  const { state, updateTimer, updateCost } = useRide();

  useEffect(() => {
    if (!state.activeRide) return;

    const interval = setInterval(() => {
      const elapsed = state.elapsedSeconds + 1;
      updateTimer(elapsed);

      const cost = ridesService.calculateCost(elapsed, baseRate, surgeMultiplier);
      updateCost(cost);
    }, 1000);

    return () => clearInterval(interval);
  }, [state.activeRide, state.elapsedSeconds, baseRate, surgeMultiplier, updateTimer, updateCost]);

  const formattedTime = ridesService.formatElapsedTime(state.elapsedSeconds);

  return (
    <div className="flex flex-col items-center">
      <div className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-1">
        Active Ride
      </div>
      <div className="text-3xl font-black font-mono tracking-tight text-white">{formattedTime}</div>
      <div className="text-slate-400 text-sm mt-2">
        Cost: <span className="text-white font-bold">₦ {state.cost.toFixed(2)}</span>
      </div>
    </div>
  );
}
