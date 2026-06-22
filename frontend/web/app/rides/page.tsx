"use client";

import { RideTableComponent } from '@/components/rides/RideTable';

export default function RidesOverview() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-white">Ride History</h1>
        <p className="text-slate-400">Monitor all rides, disputes, and revenue</p>
      </div>
      <RideTableComponent />
    </div>
  );
}
