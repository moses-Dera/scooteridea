"use client";

import { useState, useEffect } from 'react';
import { StatCard, Card, CardHeader, CardContent, Badge, LoadingSpinner } from '@/components';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const res = await fetch(`http://localhost:3001/api/analytics?timeRange=${timeRange}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setAnalytics(json.data);
          }
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
          <h1 className="text-3xl font-bold text-white">Platform Analytics</h1>
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
              <p className="text-neutral-500">📈 Revenue chart will render here</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="User Growth" />
          <CardContent>
            <div className="h-64 rounded-lg bg-neutral-900 border border-dashed border-neutral-700 flex items-center justify-center">
              <p className="text-neutral-500">📊 Growth chart will render here</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Stats Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Riders */}
        <Card>
          <CardHeader title="⭐ Top Riders Today" />
          <CardContent>
            <div className="space-y-3">
              {[
                { name: 'Chioma A.', rides: 12, distance: '48.2 km' },
                { name: 'Tunde O.', rides: 10, distance: '42.1 km' },
                { name: 'Zainab M.', rides: 9, distance: '38.5 km' },
                { name: 'Seun I.', rides: 8, distance: '35.3 km' },
                { name: 'Ada E.', rides: 7, distance: '31.8 km' },
              ].map((rider, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 rounded-lg bg-neutral-900 hover:bg-neutral-800 transition-colors">
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

        {/* Maintenance Needed */}
        <Card>
          <CardHeader title="🔧 Bikes Needing Maintenance" />
          <CardContent>
            <div className="space-y-3">
              {[
                { id: 'BIKE-042', issue: 'Brake issue', reports: 3 },
                { id: 'BIKE-089', issue: 'Flat tire', reports: 2 },
                { id: 'BIKE-156', issue: 'Chain noise', reports: 2 },
                { id: 'BIKE-234', issue: 'Battery low', reports: 1 },
                { id: 'BIKE-301', issue: 'Lock jamming', reports: 1 },
              ].map((bike, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 rounded-lg bg-neutral-900 hover:bg-neutral-800 transition-colors border-l-2 border-red-500/50">
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
  );
}
