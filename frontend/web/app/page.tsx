"use client";

import { useEffect, useState } from 'react';
import { StatCard, Card, CardHeader, CardContent, Badge, LoadingSpinner } from '@/components';

interface BikeModel {
  id: string;
  battery_pct: number;
  status: string;
}

export default function DashboardOverview() {
  const [bikes, setBikes] = useState<BikeModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch live snapshot from fleet service
    const fetchFleet = async () => {
      try {
        const res = await fetch('http://localhost:3002/bikes'); // Updated to correct port
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            setBikes(json.data);
          }
        }
      } catch (err) {
        console.error('Failed to fetch fleet data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFleet();
    const interval = setInterval(fetchFleet, 5000);
    return () => clearInterval(interval);
  }, []);

  const activeRides = bikes.filter(b => b.status === 'IN_USE' || b.status === 'in_use').length;
  const availableBikes = bikes.filter(b => b.status === 'AVAILABLE' || b.status === 'available').length;
  const lowBatteryCount = bikes.filter(b => b.battery_pct < 20).length;
  const totalFleet = bikes.length;

  return (
    <div className="w-full p-4 sm:p-6 space-y-6 animate-in fade-in duration-500 font-sans bg-neutral-950 min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Fleet Overview</h1>
          <p className="text-sm text-slate-400 mt-1">Real-time telemetry and operational status</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg transition-colors border border-slate-700 flex items-center justify-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Generate Report
          </button>
          <div className="flex items-center justify-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs font-semibold text-emerald-300">Live</span>
          </div>
        </div>
      </div>

      {/* KPI Cards - Grid with StatCard component */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Rides"
          value={loading ? '-' : activeRides}
          trend={{ value: 12, direction: 'up' }}
          onClick={() => {}}
        />
        <StatCard
          label="Available Bikes"
          value={loading ? '-' : availableBikes}
          unit="ready"
        />
        <StatCard
          label="Low Battery"
          value={loading ? '-' : lowBatteryCount}
          unit="need charge"
        />
        <StatCard
          label="Total Fleet"
          value={loading ? '-' : totalFleet}
          unit="registered"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart Area */}
        <div className="lg:col-span-2 bg-[#111827] border border-slate-800 rounded-xl p-5 h-[420px] flex flex-col shadow-sm">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
            <h3 className="text-base font-semibold text-slate-200">Fleet Utilisation Trend</h3>
            <select className="w-full sm:w-auto bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-slate-300 outline-none focus:ring-2 focus:ring-blue-500">
              <option>Today</option>
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          <div className="flex-1 rounded-lg bg-slate-900/50 border border-slate-800 border-dashed flex items-center justify-center">
            <p className="text-slate-500 text-sm text-center px-4">Utilisation metrics will render here.</p>
          </div>
        </div>

        {/* Live Alerts Feed */}
        <div>
          <Card>
            <CardHeader
              title="System Alerts"
              action={
                <Badge variant="error">
                  ⚠️ 3 Critical
                </Badge>
              }
            />
            <CardContent>
              <div className="space-y-3">
                {/* Alert Items */}
                <div className="p-3 rounded-lg bg-neutral-900 border border-red-500/30 hover:border-red-500/50 transition-colors cursor-pointer">
                  <div className="flex gap-3">
                    <span className="text-lg mt-0.5">🚨</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-red-300">Geofence Violation</p>
                      <p className="text-xs text-neutral-400 mt-0.5 line-clamp-2">Asset BK-891 breached operational zone</p>
                      <p className="text-[10px] text-neutral-500 mt-1">2 mins ago</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-neutral-900 border border-amber-500/30 hover:border-amber-500/50 transition-colors cursor-pointer">
                  <div className="flex gap-3">
                    <span className="text-lg mt-0.5">🔋</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-amber-300">Critical Battery</p>
                      <p className="text-xs text-neutral-400 mt-0.5 line-clamp-2">Asset BK-102 at 5% charge in transit</p>
                      <p className="text-[10px] text-neutral-500 mt-1">14 mins ago</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-700 hover:border-neutral-600 transition-colors cursor-pointer">
                  <div className="flex gap-3">
                    <span className="text-lg mt-0.5">🔧</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-neutral-300">Maintenance Request</p>
                      <p className="text-xs text-neutral-400 mt-0.5 line-clamp-2">Flat rear tire on BK-441</p>
                      <p className="text-[10px] text-neutral-500 mt-1">1 hr ago</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Secondary Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Riders */}
        <Card>
          <CardHeader title="Top Riders Today" />
          <CardContent>
            <div className="space-y-3">
              {[
                { name: 'Chioma A.', rides: 12, distance: '48.2 km', color: 'emerald' },
                { name: 'Tunde O.', rides: 10, distance: '42.1 km', color: 'blue' },
                { name: 'Zainab M.', rides: 9, distance: '38.5 km', color: 'cyan' },
                { name: 'Seun I.', rides: 8, distance: '35.3 km', color: 'amber' },
                { name: 'Ada E.', rides: 7, distance: '31.8 km', color: 'purple' },
              ].map((rider, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-neutral-900 hover:bg-neutral-800 transition-colors">
                  <div>
                    <p className="text-white font-medium text-sm">{rider.name}</p>
                    <p className="text-xs text-neutral-400">{rider.rides} rides</p>
                  </div>
                  <p className="text-emerald-400 font-bold text-sm">{rider.distance}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Maintenance Issues */}
        <Card>
          <CardHeader title="🔧 Bikes Needing Maintenance" />
          <CardContent>
            <div className="space-y-3">
              {[
                { id: 'BIKE-042', issue: 'Brake issue', reports: 3 },
                { id: 'BIKE-089', issue: 'Flat tire', reports: 2 },
                { id: 'BIKE-156', issue: 'Chain noise', reports: 2 },
                { id: 'BIKE-234', issue: 'Battery degradation', reports: 1 },
                { id: 'BIKE-301', issue: 'Lock jamming', reports: 1 },
              ].map((bike, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-neutral-900 hover:bg-neutral-800 transition-colors border-l-2 border-red-500/50">
                  <div>
                    <p className="text-white font-medium text-sm">{bike.id}</p>
                    <p className="text-xs text-neutral-400">{bike.issue}</p>
                  </div>
                  <Badge variant="error">
                    {bike.reports} 📋
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

