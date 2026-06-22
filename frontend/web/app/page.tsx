"use client";

import { useEffect, useState } from 'react';
import { AlertTriangle, BatteryWarning, Wrench, Activity, Bike, Zap, BarChart3, Bell } from 'lucide-react';

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

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 font-sans">
      
      {/* Header */}
      <div className="flex justify-between items-center pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Fleet Overview</h1>
          <p className="text-sm text-slate-400 mt-1">Real-time telemetry and operational status</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg transition-colors border border-slate-700 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Generate Report
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-[#111827] border border-slate-800 p-5 rounded-xl shadow-sm flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-slate-400">Active Rides</span>
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Activity className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-bold text-slate-100">{loading ? '-' : activeRides}</span>
            <p className="text-xs text-emerald-400 mt-1 font-medium">+12% from last hour</p>
          </div>
        </div>
        
        {/* Card 2 */}
        <div className="bg-[#111827] border border-slate-800 p-5 rounded-xl shadow-sm flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-slate-400">Available Bikes</span>
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Bike className="w-4 h-4 text-blue-500" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-bold text-slate-100">{loading ? '-' : availableBikes}</span>
            <p className="text-xs text-slate-500 mt-1">Ready for deployment</p>
          </div>
        </div>
        
        {/* Card 3 */}
        <div className="bg-[#111827] border border-slate-800 p-5 rounded-xl shadow-sm flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-slate-400">Low Battery</span>
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Zap className="w-4 h-4 text-amber-500" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-bold text-slate-100">{loading ? '-' : lowBatteryCount}</span>
            <p className="text-xs text-amber-500 mt-1 font-medium">Requires charging intervention</p>
          </div>
        </div>
        
        {/* Card 4 */}
        <div className="bg-[#111827] border border-slate-800 p-5 rounded-xl shadow-sm flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-slate-400">Total Fleet</span>
            <div className="p-2 bg-slate-700/50 rounded-lg">
              <BarChart3 className="w-4 h-4 text-slate-300" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-bold text-slate-100">{loading ? '-' : bikes.length}</span>
            <p className="text-xs text-slate-500 mt-1">Total registered assets</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart Area */}
        <div className="lg:col-span-2 bg-[#111827] border border-slate-800 rounded-xl p-5 h-[420px] flex flex-col shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-semibold text-slate-200">Fleet Utilisation Trend</h3>
            <select className="bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-slate-300 outline-none focus:ring-2 focus:ring-blue-500">
              <option>Today</option>
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          <div className="flex-1 rounded-lg bg-slate-900/50 border border-slate-800 border-dashed flex items-center justify-center">
            <p className="text-slate-500 text-sm">Utilisation metrics will render here.</p>
          </div>
        </div>

        {/* Live Alerts Feed */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 flex flex-col shadow-sm">
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-slate-400" />
              <h3 className="text-base font-semibold text-slate-200">System Alerts</h3>
            </div>
            <span className="px-2.5 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-semibold rounded-full">3 Critical</span>
          </div>
          
          <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
            
            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800 flex gap-3 hover:border-slate-700 transition-colors cursor-pointer">
              <div className="mt-0.5">
                <AlertTriangle className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">Geofence Violation</p>
                <p className="text-xs text-slate-400 mt-0.5">Asset BK-891 breached the primary operational zone boundary.</p>
                <p className="text-[10px] text-slate-500 mt-1 uppercase font-semibold">2 mins ago</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800 flex gap-3 hover:border-slate-700 transition-colors cursor-pointer">
              <div className="mt-0.5">
                <BatteryWarning className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">Critical Battery Warning</p>
                <p className="text-xs text-slate-400 mt-0.5">Asset BK-102 dropped below 5% charge while in transit.</p>
                <p className="text-[10px] text-slate-500 mt-1 uppercase font-semibold">14 mins ago</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800 flex gap-3 hover:border-slate-700 transition-colors cursor-pointer">
              <div className="mt-0.5">
                <Wrench className="w-4 h-4 text-slate-300" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">Maintenance Request</p>
                <p className="text-xs text-slate-400 mt-0.5">User-submitted report: Flat rear tire on BK-441.</p>
                <p className="text-[10px] text-slate-500 mt-1 uppercase font-semibold">1 hr ago</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

