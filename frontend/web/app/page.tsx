'use client';

import { useEffect, useState } from 'react';
import { StatCard, Card, CardHeader, CardContent, Badge, LoadingSpinner } from '@/components';
import {
  BarChart,
  AlertTriangle,
  AlertCircle,
  Info,
  Wrench,
  ClipboardList,
  TrendingUp,
  BatteryWarning,
  Activity,
  Users,
  CheckCircle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

interface BikeModel {
  id: string;
  battery_pct: number;
  status: string;
}

interface Rider {
  id: string;
  name: string;
  email: string;
  rides_count: number;
  total_distance: number;
}

interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  bike_id: string;
  created_at: string;
}

interface MaintenanceIssue {
  id: string;
  bike_id: string;
  issue_type: string;
  report_count: number;
  status: string;
  created_at: string;
}

export default function DashboardOverview() {
  const [bikes, setBikes] = useState<BikeModel[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceIssue[]>([]);
  const [loading, setLoading] = useState(true);

  // Real data for chart will require analytics service
  const chartData: any[] = [];

  useEffect(() => {
    // Fetch all data
    const fetchAllData = async () => {
      try {
        setLoading(true);
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';

        // Fetch fleet data
        const fleetRes = await fetch(`/api/proxy/fleet/bikes`).catch(() => null);
        if (fleetRes?.ok) {
          const json = await fleetRes.json();
          if (json.success && json.data) setBikes(json.data);
        }

        // Fetch top riders
        const ridersRes = await fetch(`/api/proxy/rides/riders/top`).catch(() => null);
        if (ridersRes?.ok) {
          const json = await ridersRes.json();
          if (json.success && json.data) setRiders(json.data);
        }

        // Fetch system alerts
        const alertsRes = await fetch(`/api/proxy/fleet/alerts`).catch(() => null);
        if (alertsRes?.ok) {
          const json = await alertsRes.json();
          if (json.success && json.data) setAlerts(json.data);
        }

        // Fetch maintenance issues
        const maintRes = await fetch(`/api/proxy/fleet/maintenance`).catch(() => null);
        if (maintRes?.ok) {
          const json = await maintRes.json();
          if (json.success && json.data) setMaintenance(json.data);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
    const interval = setInterval(fetchAllData, 30000); // 30s polling
    return () => clearInterval(interval);
  }, []);

  const activeRides = bikes.filter((b) => b.status === 'IN_USE' || b.status === 'in_use').length;
  const availableBikes = bikes.filter(
    (b) => b.status === 'AVAILABLE' || b.status === 'available',
  ).length;
  const lowBatteryCount = bikes.filter((b) => b.battery_pct < 20).length;
  const totalFleet = bikes.length;

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500 font-sans text-slate-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 pb-6 border-b border-white/5">
        <div>
          <div className="text-3xl font-black text-white tracking-tight">Overview</div>
        </div>
      </div>

      {/* KPI Cards - Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-surface border border-white/5 rounded-2xl p-6 relative overflow-hidden group hover:border-primary/50 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity className="w-16 h-16 text-primary" />
          </div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">
            Active Rides
          </p>
          <div className="text-4xl font-black text-white">{loading ? '-' : activeRides}</div>
        </div>

        <div className="bg-surface border border-white/5 rounded-2xl p-6 relative overflow-hidden group hover:border-blue-500/50 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <BarChart className="w-16 h-16 text-blue-500" />
          </div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">
            Available
          </p>
          <div className="text-4xl font-black text-white">{loading ? '-' : availableBikes}</div>
          <p className="text-xs text-slate-500 font-medium mt-2">Ready for deployment</p>
        </div>

        <div className="bg-surface border border-white/5 rounded-2xl p-6 relative overflow-hidden group hover:border-warning/50 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <BatteryWarning className="w-16 h-16 text-warning" />
          </div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">
            Low Battery
          </p>
          <div className="text-4xl font-black text-white">{loading ? '-' : lowBatteryCount}</div>
          <p className="text-xs text-warning font-medium mt-2 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Needs attention
          </p>
        </div>

        <div className="bg-surface border border-white/5 rounded-2xl p-6 relative overflow-hidden group hover:border-purple-500/50 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Users className="w-16 h-16 text-purple-500" />
          </div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">
            Total Fleet
          </p>
          <div className="text-4xl font-black text-white">{loading ? '-' : totalFleet}</div>
          <p className="text-xs text-slate-500 font-medium mt-2">Registered assets</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart Area */}
        <div className="lg:col-span-2 bg-surface border border-white/5 rounded-2xl p-6 h-[460px] flex flex-col shadow-2xl relative overflow-hidden">
          {/* Subtle gradient background for the chart container */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none"></div>

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-8 relative z-10">
            <div>
              <div className="text-xl font-bold text-white">Fleet Utilisation</div>
              <p className="text-sm text-slate-400">Active vs Available bikes across network</p>
            </div>
            <select className="w-full sm:w-auto bg-surfaceLight border border-white/10 rounded-xl px-4 py-2 text-sm font-semibold text-white outline-none focus:ring-2 focus:ring-primary hover:border-white/20 transition-colors">
              <option>Today</option>
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>

          <div className="flex-1 w-full h-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1ED760" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#1ED760" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorAvailable" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="time"
                  stroke="#475569"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#1E293B',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                  }}
                  itemStyle={{ color: '#E2E8F0', fontWeight: 'bold' }}
                />
                <Area
                  type="monotone"
                  dataKey="available"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorAvailable)"
                  name="Available"
                />
                <Area
                  type="monotone"
                  dataKey="active"
                  stroke="#1ED760"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorActive)"
                  name="Active Rides"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Alerts Feed */}
        <div className="bg-surface border border-white/5 rounded-2xl flex flex-col h-[460px] shadow-2xl">
          <div className="p-6 border-b border-white/5 flex justify-between items-center">
            <div>
              <div className="text-xl font-bold text-white">System Alerts</div>
              <p className="text-sm text-slate-400">Live operational feed</p>
            </div>
            <div className="px-3 py-1 bg-danger/10 border border-danger/20 rounded-full text-xs font-bold text-danger flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {alerts.length} Active
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {loading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="md" />
              </div>
            ) : alerts.length > 0 ? (
              alerts.map((alert) => {
                const iconMap: Record<string, React.ReactNode> = {
                  error: <AlertCircle className="w-5 h-5 text-danger" />,
                  warning: <AlertTriangle className="w-5 h-5 text-warning" />,
                  info: <Info className="w-5 h-5 text-blue-500" />,
                };

                return (
                  <div
                    key={alert.id}
                    className="p-4 rounded-xl bg-surfaceLight border border-white/5 hover:border-white/10 transition-all cursor-pointer group"
                  >
                    <div className="flex gap-4">
                      <div className="mt-1 bg-white/5 p-2 rounded-lg group-hover:scale-110 transition-transform">
                        {iconMap[alert.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white mb-1">{alert.title}</p>
                        <p className="text-xs text-slate-400 leading-relaxed">{alert.message}</p>
                        <p className="text-[10px] text-slate-500 mt-2 font-medium tracking-wider uppercase">
                          {new Date(alert.created_at).toLocaleTimeString()} • {alert.bike_id}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <CheckCircle className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm font-medium">All systems normal</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Secondary Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Riders */}
        <div className="bg-surface border border-white/5 rounded-2xl flex flex-col shadow-2xl p-6">
          <div className="mb-6">
            <div className="text-xl font-bold text-white">Top Riders Today</div>
            <p className="text-sm text-slate-400">Highest volume users</p>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="md" />
              </div>
            ) : riders.length > 0 ? (
              riders.map((rider, i) => (
                <div
                  key={rider.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-surfaceLight border border-white/5 hover:border-primary/20 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center text-lg">
                      #{i + 1}
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">{rider.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {rider.rides_count} total rides
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-primary font-black text-lg">
                      {(rider.total_distance / 1000).toFixed(1)} km
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-500 text-sm text-center py-4">No rider data available</p>
            )}
          </div>
        </div>

        {/* Maintenance Issues */}
        <div className="bg-surface border border-white/5 rounded-2xl flex flex-col shadow-2xl p-6">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <div className="text-xl font-bold text-white flex items-center gap-2">
                <Wrench className="w-5 h-5 text-slate-400" /> Maintenance Required
              </div>
              <p className="text-sm text-slate-400">Bikes flagged for service</p>
            </div>
            <span className="text-xs font-bold text-danger bg-danger/10 px-3 py-1 rounded-full border border-danger/20">
              {maintenance.length} Tickets
            </span>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="md" />
              </div>
            ) : maintenance.length > 0 ? (
              maintenance.map((bike) => (
                <div
                  key={bike.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-surfaceLight border-l-4 border-l-danger border-y border-r border-white/5 hover:bg-white/5 transition-colors"
                >
                  <div>
                    <p className="text-white font-bold text-sm flex items-center gap-2">
                      {bike.bike_id}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">{bike.issue_type}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1 text-danger bg-danger/10 px-2 py-1 rounded text-xs font-bold mb-1">
                      <ClipboardList className="w-3 h-3" /> {bike.report_count} Reports
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                      {bike.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-500 text-sm text-center py-4">No pending maintenance</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
