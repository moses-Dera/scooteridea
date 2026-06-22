"use client";

import { useEffect, useState } from 'react';
import { FaExclamationTriangle, FaBatteryQuarter, FaWrench } from 'react-icons/fa';

interface Bike {
  id: string;
  battery_pct: number;
  status: string;
}

export default function DashboardOverview() {
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch live snapshot from fleet service
    const fetchFleet = async () => {
      try {
        const res = await fetch('http://localhost/fleet/bikes');
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
    // In a fully wired production app, we would listen to websocket-hub here
    const interval = setInterval(fetchFleet, 5000);
    return () => clearInterval(interval);
  }, []);

  const activeRides = bikes.filter(b => b.status === 'IN_USE' || b.status === 'in_use').length;
  const availableBikes = bikes.filter(b => b.status === 'AVAILABLE' || b.status === 'available').length;
  const lowBatteryCount = bikes.filter(b => b.battery_pct < 20).length;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-panel p-6 rounded-2xl flex flex-col gap-2 relative overflow-hidden group hover:border-primary/50 transition-colors">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-primary/20 rounded-full blur-2xl group-hover:bg-primary/30 transition-colors"></div>
          <span className="text-sm font-medium text-slate-400">Active Rides</span>
          <span className="text-4xl font-bold tracking-tight text-white">{loading ? '...' : activeRides}</span>
          <span className="text-xs text-accent mt-1 flex items-center gap-1">Real-time simulator data</span>
        </div>
        
        <div className="glass-panel p-6 rounded-2xl flex flex-col gap-2 relative overflow-hidden group hover:border-accent/50 transition-colors">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-accent/20 rounded-full blur-2xl group-hover:bg-accent/30 transition-colors"></div>
          <span className="text-sm font-medium text-slate-400">Available Bikes</span>
          <span className="text-4xl font-bold tracking-tight text-white">{loading ? '...' : availableBikes}</span>
          <span className="text-xs text-slate-400 mt-1">Ready for unlocking</span>
        </div>
        
        <div className="glass-panel p-6 rounded-2xl flex flex-col gap-2 relative overflow-hidden group hover:border-warning/50 transition-colors">
           <div className="absolute -right-6 -top-6 w-24 h-24 bg-warning/20 rounded-full blur-2xl group-hover:bg-warning/30 transition-colors"></div>
          <span className="text-sm font-medium text-slate-400">Low Battery (&lt;20%)</span>
          <span className="text-4xl font-bold tracking-tight text-white">{loading ? '...' : lowBatteryCount}</span>
          <span className="text-xs text-warning mt-1 flex items-center gap-1">Action required</span>
        </div>
        
        <div className="glass-panel p-6 rounded-2xl flex flex-col gap-2 relative overflow-hidden group hover:border-purple-500/50 transition-colors">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl group-hover:bg-purple-500/30 transition-colors"></div>
          <span className="text-sm font-medium text-slate-400">Total Fleet Size</span>
          <span className="text-4xl font-bold tracking-tight text-white">{loading ? '...' : bikes.length}</span>
          <span className="text-xs text-accent mt-1 flex items-center gap-1">Connected to simulator</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart Area */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 h-[400px] flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-white">Fleet Utilisation</h3>
            <select className="bg-surface/50 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-slate-300 outline-none">
              <option>Today</option>
              <option>This Week</option>
            </select>
          </div>
          <div className="flex-1 rounded-xl bg-surface/30 border border-white/5 flex items-center justify-center">
            {/* Chart Placeholder */}
            <p className="text-slate-500 text-sm">Recharts Area Chart will render here</p>
          </div>
        </div>

        {/* Live Alerts Feed */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-white">Live Alerts</h3>
            <span className="px-2 py-1 bg-danger/20 text-danger text-xs font-medium rounded-full">3 New</span>
          </div>
          <div className="flex flex-col gap-4 flex-1 overflow-y-auto pr-2">
            
            <div className="p-4 rounded-xl bg-surface/50 border border-danger/20 flex gap-4">
              <div className="w-8 h-8 rounded-full bg-danger/20 flex items-center justify-center shrink-0">
                <span className="text-danger text-lg"><FaExclamationTriangle /></span>
              </div>
              <div>
                <p className="text-sm font-medium text-white">Geofence Violation</p>
                <p className="text-xs text-slate-400 mt-1">Bike BK-891 left the operational zone.</p>
                <p className="text-xs text-slate-500 mt-2">2 mins ago</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface/50 border border-warning/20 flex gap-4">
              <div className="w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center shrink-0">
                <span className="text-warning text-lg"><FaBatteryQuarter /></span>
              </div>
              <div>
                <p className="text-sm font-medium text-white">Critical Battery</p>
                <p className="text-xs text-slate-400 mt-1">Bike BK-102 at 5% battery in transit.</p>
                <p className="text-xs text-slate-500 mt-2">14 mins ago</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface/50 border border-primary/20 flex gap-4">
               <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <span className="text-primary text-lg"><FaWrench /></span>
              </div>
              <div>
                <p className="text-sm font-medium text-white">Maintenance Required</p>
                <p className="text-xs text-slate-400 mt-1">User reported flat tire on BK-441.</p>
                <p className="text-xs text-slate-500 mt-2">1 hr ago</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

