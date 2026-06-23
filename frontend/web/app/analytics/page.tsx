"use client";

import { useState, useEffect } from 'react';
import { StatCard, Card, CardHeader, CardContent, Badge, LoadingSpinner } from '@/components';
import { TrendingUp, BarChart, Star, Wrench, ClipboardList } from 'lucide-react';

interface Analytics {
  total_rides: number;
  total_revenue: number;
  active_users: number;
  fleet_utilization: number;
  avg_ride_duration: number;
  avg_ride_distance: number;
  bikes_active: number;
  bikes_total: number;
}

export default function AnalyticsOverview() {
  const [timeRange, setTimeRange] = useState('today');
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [riders, setRiders] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
        const [res, ridersRes, maintRes] = await Promise.all([
          fetch(`${baseUrl}/api/proxy/ride/analytics?timeRange=${timeRange}`),
          fetch(`${baseUrl}/api/proxy/ride/riders/top?limit=5`),
          fetch(`${baseUrl}/api/proxy/fleet/maintenance?status=open`)
        ]);

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) setAnalytics(json.data);
        }
        
        if (ridersRes.ok) {
          const json = await ridersRes.json();
          if (json.success && json.data) setRiders(json.data);
        }
        
        if (maintRes.ok) {
          const json = await maintRes.json();
          if (json.success && json.data) setMaintenance(json.data);
        }
      } catch (err) {
        console.error('Failed to fetch analytics', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [timeRange]);

  return (
    <div className="w-full p-6 space-y-6 bg-neutral-950 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-start pb-6 border-b border-neutral-800">
        <div>
          <div className="text-3xl font-bold text-white">Platform Analytics</div>
          <p className="text-sm text-neutral-400 mt-1">Real-time insights and performance metrics</p>
        </div>
        <div className="flex gap-2 bg-neutral-900 border border-neutral-800 rounded-lg p-1">
          {['Today', 'Week', 'Month'].map((period) => (
            <button
              key={period}
              onClick={() => setTimeRange(period.toLowerCase())}
              className={`px-4 py-2 rounded-md transition-colors text-sm font-medium ${
                timeRange === period.toLowerCase()
                  ? 'bg-emerald-500 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* Main KPI Cards - 4 Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Rides"
          value={loading ? '-' : analytics?.total_rides?.toLocaleString() || '0'}
          trend={{ value: 12, direction: 'up' }}
        />
        <StatCard
          label="Total Revenue"
          value={loading ? '-' : `₦${(analytics?.total_revenue || 0).toLocaleString()}`}
          trend={{ value: 8, direction: 'up' }}
        />
        <StatCard
          label="Active Users"
          value={loading ? '-' : (analytics?.active_users || 0).toLocaleString()}
          trend={{ value: 5, direction: 'up' }}
        />
        <StatCard
          label="Fleet Utilization"
          value={loading ? '-' : `${analytics?.fleet_utilization || 0}%`}
          trend={{ value: 3, direction: 'down' }}
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Avg Ride Duration"
          value={loading ? '-' : (analytics?.avg_ride_duration || 0).toFixed(1)}
          unit="min"
          trend={{ value: 2, direction: 'up' }}
        />
        <StatCard
          label="Avg Ride Distance"
          value={loading ? '-' : (analytics?.avg_ride_distance || 0).toFixed(1)}
          unit="km"
          trend={{ value: 1, direction: 'down' }}
        />
        <StatCard
          label="Bikes Active"
          value={loading ? '-' : `${analytics?.bikes_active || 0} / ${analytics?.bikes_total || 0}`}
          trend={{ value: 4, direction: 'up' }}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Placeholder for charts */}
        <Card>
          <CardHeader title="Revenue Trend" />
          <CardContent>
            <div className="h-64 rounded-lg bg-neutral-900 border border-dashed border-neutral-700 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2 text-neutral-500">
                <TrendingUp className="w-6 h-6" />
                <p>Revenue chart will render here</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="User Growth" />
          <CardContent>
            <div className="h-64 rounded-lg bg-neutral-900 border border-dashed border-neutral-700 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2 text-neutral-500">
                <BarChart className="w-6 h-6" />
                <p>Growth chart will render here</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Stats Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Riders */}
        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><Star className="w-4 h-4 text-yellow-500" /> Top Riders Today</span>} />
          <CardContent>
            <div className="space-y-3">
              {riders.length > 0 ? (
                riders.map((rider) => (
                  <div key={rider.id} className="flex justify-between items-center p-3 rounded-lg bg-neutral-900 hover:bg-neutral-800 transition-colors">
                    <div>
                      <p className="text-white font-medium text-sm">{rider.name}</p>
                      <p className="text-xs text-neutral-400">{rider.rides_count} rides</p>
                    </div>
                    <p className="text-emerald-400 font-bold text-sm">{(rider.total_distance / 1000).toFixed(1)} km</p>
                  </div>
                ))
              ) : (
                <p className="text-neutral-500 text-sm py-4 text-center">No rider data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Maintenance Needed */}
        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><Wrench className="w-4 h-4" /> Bikes Needing Maintenance</span>} />
          <CardContent>
            <div className="space-y-3">
              {maintenance.length > 0 ? (
                maintenance.map((bike) => (
                  <div key={bike.id} className="flex justify-between items-center p-3 rounded-lg bg-neutral-900 hover:bg-neutral-800 transition-colors border-l-2 border-red-500/50">
                    <div>
                      <p className="text-white font-medium text-sm">{bike.bike_id}</p>
                      <p className="text-xs text-neutral-400">{bike.issue_type}</p>
                    </div>
                    <Badge variant="error">
                      {bike.report_count} <ClipboardList className="w-4 h-4 inline ml-1" />
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-neutral-500 text-sm py-4 text-center">No maintenance issues</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
