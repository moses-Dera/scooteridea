'use client';

import { BikeFinder } from '@/components/bikes/BikeFinder';

export default function BikeBrowsePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="text-4xl font-bold text-white mb-2">Find a Bike</div>
          <p className="text-slate-400">Browse available bikes near your location</p>
        </div>

        <BikeFinder />
      </div>
    </div>
  );
}
