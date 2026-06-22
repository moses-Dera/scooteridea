"use client";

import { DockGridComponent } from '@/components/docks/DockGrid';

export default function DocksOverview() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-white">Docking Stations</h1>
        <p className="text-slate-400">Manage dock capacity, charging stations, and bike inventory</p>
      </div>
      <DockGridComponent />
    </div>
  );
}
