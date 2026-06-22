"use client";

import { RideHistoryComponent } from '@/components/bikes/RideHistory';

export default function RideHistoryPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Your Rides</h1>
          <p className="text-slate-400">View your ride history, statistics, and ratings</p>
        </div>

        <RideHistoryComponent />
      </div>
    </div>
  );
}
