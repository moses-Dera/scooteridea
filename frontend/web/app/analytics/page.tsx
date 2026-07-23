'use client';

import { useState, useEffect } from 'react';
import { StatCard, Card, CardHeader, CardContent, Badge, LoadingSpinner } from '@/components';
import { TrendingUp, BarChart, Star, Wrench, ClipboardList } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart as ReBarChart,
  Bar,
} from 'recharts';

interface Analytics {
  totalRides: number;
  totalRevenue: number;
  activeUsers: number;
  fleetUtilization: number;
  avgRideDuration: number;
  avgRideDistance: number;
  bikesActive: number;
  bikesTotal: number;
  revenueTrend: { time: string; revenue: number; rides: number }[];
  userGrowth: { time: string; users: number }[];
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
        const [res, ridersRes, maintRes] = await Promise.all([
          fetch(`/api/proxy/rides/analytics?timeRange=${timeRange}`),
          fetch(`/api/proxy/rides/riders/top?limit=5`),
          fetch(`/api/proxy/fleet/maintenance?status=open`),
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
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-neutral-800">
        <div>
          <div className="text-3xl font-bold text-white">Platform Analytics</div>
          <p className="text-sm text-neutral-400 mt-1">
            Real-time insights and performance metrics
          </p>
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
          value={loading ? '-' : analytics?.totalRides?.toLocaleString() || '0'}
        />
        <StatCard
          label="Total Revenue"
          value={loading ? '-' : `₦${(analytics?.totalRevenue || 0).toLocaleString()}`}
        />
        <StatCard
          label="Active Users"
          value={loading ? '-' : (analytics?.activeUsers || 0).toLocaleString()}
        />
        <StatCard
          label="Fleet Utilization"
          value={loading ? '-' : `${analytics?.fleetUtilization || 0}%`}
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Avg Ride Duration"
          value={loading ? '-' : (analytics?.avgRideDuration || 0).toFixed(1)}
          unit="min"
        />
        <StatCard
          label="Avg Ride Distance"
          value={loading ? '-' : (analytics?.avgRideDistance || 0).toFixed(1)}
          unit="km"
        />
        <StatCard
          label="Bikes Active"
          value={loading ? '-' : `${analytics?.bikesActive || 0} / ${analytics?.bikesTotal || 0}`}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Revenue Trend" />
          <CardContent>
            <div className="h-72 w-full pt-4">
              {loading ? (
                <div className="w-full h-full flex items-center justify-center text-neutral-500">
                  <LoadingSpinner />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics?.revenueTrend || []}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                    <XAxis
                      dataKey="time"
                      stroke="#525252"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#525252"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `₦${value}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#171717',
                        borderColor: '#262626',
                        color: '#fff',
                      }}
                      itemStyle={{ color: '#10b981' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="User Growth" />
          <CardContent>
            <div className="h-72 w-full pt-4">
              {loading ? (
                <div className="w-full h-full flex items-center justify-center text-neutral-500">
                  <LoadingSpinner />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ReBarChart data={analytics?.userGrowth || []} barSize={24}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                    <XAxis
                      dataKey="time"
                      stroke="#525252"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis stroke="#525252" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#171717',
                        borderColor: '#262626',
                        color: '#fff',
                      }}
                      itemStyle={{ color: '#3b82f6' }}
                      cursor={{ fill: '#262626' }}
                    />
                    <Bar dataKey="users" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </ReBarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Stats Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Riders */}
        <Card>
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500" /> Top Riders Today
              </span>
            }
          />
          <CardContent>
            <div className="space-y-3">
              {riders.length > 0 ? (
                riders.map((rider) => (
                  <div
                    key={rider.id}
                    className="flex justify-between items-center p-3 rounded-lg bg-neutral-900 hover:bg-neutral-800 transition-colors"
                  >
                    <div>
                      <p className="text-white font-medium text-sm">{rider.name}</p>
                      <p className="text-xs text-neutral-400">{rider.rides_count} rides</p>
                    </div>
                    <p className="text-emerald-400 font-bold text-sm">
                      {(rider.total_distance / 1000).toFixed(1)} km
                    </p>
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
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <Wrench className="w-4 h-4" /> Bikes Needing Maintenance
              </span>
            }
          />
          <CardContent>
            <div className="space-y-3">
              {maintenance.length > 0 ? (
                maintenance.map((bike) => (
                  <div
                    key={bike.id}
                    className="flex justify-between items-center p-3 rounded-lg bg-neutral-900 hover:bg-neutral-800 transition-colors border-l-2 border-red-500/50"
                  >
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
