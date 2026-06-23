"use client";

import { DockGridComponent } from '@/components/docks/DockGrid';

export default function DocksOverview() {
  return (
    <div className="space-y-4">
      <div>
        <div className="text-3xl font-bold text-white">Docking Stations</div>
        <p className="text-slate-400">Manage dock capacity, charging stations, and bike inventory</p>
      </div>
      <DockGridComponent />
    </div>
  );
}
