'use client';

import { RideTableComponent } from '@/components/rides/RideTable';

export default function RidesOverview() {
  return (
    <div className="space-y-4">
      <div>
        <div className="text-3xl font-bold text-white">Ride History</div>
        <p className="text-slate-400">Monitor all rides, disputes, and revenue</p>
      </div>
      <RideTableComponent />
    </div>
  );
}
