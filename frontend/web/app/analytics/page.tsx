"use client";

import { useState } from 'react';
import { KPICard } from '@/components/analytics/KPICard';
import { AnalyticsCharts } from '@/components/analytics/AnalyticsCharts';

export default function AnalyticsOverview() {
  const [timeRange, setTimeRange] = useState('today');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Platform Analytics</h1>
          <p className="text-slate-400">Real-time insights and performance metrics</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTimeRange('today')}
            className={`px-4 py-2 rounded transition-colors ${
              timeRange === 'today'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setTimeRange('week')}
            className={`px-4 py-2 rounded transition-colors ${
              timeRange === 'week'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setTimeRange('month')}
            className={`px-4 py-2 rounded transition-colors ${
              timeRange === 'month'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Month
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Rides"
          value="2,847"
          change={{ value: 12, isPositive: true }}
          bgColor="bg-gradient-to-br from-blue-900 to-blue-800"
        />
        <KPICard
          title="Total Revenue"
          value="₦427,050"
          change={{ value: 8, isPositive: true }}
          bgColor="bg-gradient-to-br from-green-900 to-green-800"
        />
        <KPICard
          title="Active Users"
          value="1,234"
          change={{ value: 5, isPositive: true }}
          bgColor="bg-gradient-to-br from-purple-900 to-purple-800"
        />
        <KPICard
          title="Fleet Utilization"
          value="78%"
          change={{ value: 3, isPositive: false }}
          bgColor="bg-gradient-to-br from-amber-900 to-amber-800"
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          title="Avg Ride Duration"
          value="18.5 min"
          change={{ value: 2, isPositive: true }}
        />
        <KPICard
          title="Avg Ride Distance"
          value="4.2 km"
          change={{ value: 1, isPositive: false }}
        />
        <KPICard
          title="Bikes Active"
          value="156 / 200"
          change={{ value: 4, isPositive: true }}
        />
      </div>

      {/* Charts */}
      <AnalyticsCharts />

      {/* Bottom Stats Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Riders */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <h3 className="font-bold text-white mb-4">Top Riders Today</h3>
          <div className="space-y-3">
            {[
              { name: 'Chioma A.', rides: 12, distance: '48.2 km' },
              { name: 'Tunde O.', rides: 10, distance: '42.1 km' },
              { name: 'Zainab M.', rides: 9, distance: '38.5 km' },
              { name: 'Seun I.', rides: 8, distance: '35.3 km' },
              { name: 'Ada E.', rides: 7, distance: '31.8 km' },
            ].map((rider, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm">
                <div>
                  <p className="text-white font-medium">{rider.name}</p>
                  <p className="text-slate-400 text-xs">{rider.rides} rides</p>
                </div>
                <p className="text-blue-400 font-bold">{rider.distance}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Problem Bikes */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <h3 className="font-bold text-white mb-4">Bikes Needing Maintenance</h3>
          <div className="space-y-3">
            {[
              { id: 'BIKE-042', issue: 'Brake issue', reports: 3 },
              { id: 'BIKE-089', issue: 'Flat tire', reports: 2 },
              { id: 'BIKE-156', issue: 'Chain noise', reports: 2 },
              { id: 'BIKE-234', issue: 'Battery low', reports: 1 },
              { id: 'BIKE-301', issue: 'Lock jamming', reports: 1 },
            ].map((bike, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm">
                <div>
                  <p className="text-white font-medium">{bike.id}</p>
                  <p className="text-slate-400 text-xs">{bike.issue}</p>
                </div>
                <span className="bg-red-900 text-red-200 px-2 py-1 rounded text-xs font-bold">
                  {bike.reports} reports
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
