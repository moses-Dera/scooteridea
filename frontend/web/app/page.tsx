"use client";

import { useEffect, useState } from 'react';
import { StatCard, Card, CardHeader, CardContent, Badge, LoadingSpinner } from '@/components';

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

  useEffect(() => {
    // Fetch all data
    const fetchAllData = async () => {
      try {
        setLoading(true);
        
        // Fetch fleet data
        const fleetRes = await fetch('http://localhost:3002/bikes');
        if (fleetRes.ok) {
          const json = await fleetRes.json();
          if (json.success && json.data) {
            setBikes(json.data);
          }
        }
        
        // Fetch top riders - get from ride history/stats
        const ridersRes = await fetch('http://localhost:3001/api/riders/top?limit=5');
        if (ridersRes.ok) {
          const json = await ridersRes.json();
          if (json.success && json.data) {
            setRiders(json.data);
          }
        }
        
        // Fetch system alerts
        const alertsRes = await fetch('http://localhost:3002/alerts?limit=3');
        if (alertsRes.ok) {
          const json = await alertsRes.json();
          if (json.success && json.data) {
            setAlerts(json.data);
          }
        }
        
        // Fetch maintenance issues
        const maintRes = await fetch('http://localhost:3002/maintenance?status=open');
        if (maintRes.ok) {
          const json = await maintRes.json();
          if (json.success && json.data) {
            setMaintenance(json.data);
          }
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
    const interval = setInterval(fetchAllData, 5000);
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
                  ⚠️ {alerts.length} Active
                </Badge>
              }
            />
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="md" />
                </div>
              ) : alerts.length > 0 ? (
                <div className="space-y-3">
                  {alerts.map((alert) => {
                    const iconMap: Record<string, string> = {
                      'error': '🚨',
                      'warning': '⚠️',
                      'info': 'ℹ️'
                    };
                    const colorMap: Record<string, string> = {
                      'error': 'red',
                      'warning': 'amber',
                      'info': 'blue'
                    };
                    const color = colorMap[alert.type] || 'neutral';
                    const borderColor = `border-${color}-500/30`;
                    const hoverBorderColor = `hover:border-${color}-500/50`;
                    
                    return (
                      <div 
                        key={alert.id}
                        className={`p-3 rounded-lg bg-neutral-900 border ${borderColor} ${hoverBorderColor} transition-colors cursor-pointer`}
                      >
                        <div className="flex gap-3">
                          <span className="text-lg mt-0.5">{iconMap[alert.type]}</span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold text-${color}-300`}>{alert.title}</p>
                            <p className="text-xs text-neutral-400 mt-0.5 line-clamp-2">{alert.message}</p>
                            <p className="text-[10px] text-neutral-500 mt-1">
                              {new Date(alert.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-neutral-400 text-sm">No active alerts</p>
              )}
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
            {loading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="md" />
              </div>
            ) : riders.length > 0 ? (
              <div className="space-y-3">
                {riders.map((rider) => (
                  <div key={rider.id} className="flex items-center justify-between p-3 rounded-lg bg-neutral-900 hover:bg-neutral-800 transition-colors">
                    <div>
                      <p className="text-white font-medium text-sm">{rider.name}</p>
                      <p className="text-xs text-neutral-400">{rider.rides_count} rides</p>
                    </div>
                    <p className="text-emerald-400 font-bold text-sm">{(rider.total_distance / 1000).toFixed(1)} km</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-neutral-400 text-sm">No rider data available</p>
            )}
          </CardContent>
        </Card>

        {/* Maintenance Issues */}
        <Card>
          <CardHeader title="🔧 Bikes Needing Maintenance" />
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="md" />
              </div>
            ) : maintenance.length > 0 ? (
              <div className="space-y-3">
                {maintenance.map((bike) => (
                  <div key={bike.id} className="flex items-center justify-between p-3 rounded-lg bg-neutral-900 hover:bg-neutral-800 transition-colors border-l-2 border-red-500/50">
                    <div>
                      <p className="text-white font-medium text-sm">{bike.bike_id}</p>
                      <p className="text-xs text-neutral-400">{bike.issue_type}</p>
                    </div>
                    <Badge variant="error">
                      {bike.report_count} 📋
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-neutral-400 text-sm">No maintenance issues</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

