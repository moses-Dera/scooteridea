// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899'];

interface ChartData {
  name: string;
  value: number;
  revenue?: number;
}

export function AnalyticsCharts() {
  const [timeseriesData, setTimeseriesData] = useState<ChartData[]>([]);
  const [topRidesData, setTopRidesData] = useState<ChartData[]>([]);
  const [bikeUsageData, setBikeUsageData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // Simulate analytics data (in production, fetch from API)
        const hours = Array.from({ length: 24 }, (_, i) => ({
          name: `${i}:00`,
          value: Math.floor(Math.random() * 50 + 10),
          revenue: Math.floor(Math.random() * 5000 + 1000),
        }));

        const topRides = [
          { name: 'Lekki → VI', value: 245, revenue: 18500 },
          { name: 'Ikoyi → Lekki', value: 198, revenue: 15200 },
          { name: 'VI → Surulere', value: 156, revenue: 12800 },
          { name: 'Yaba → Lekki', value: 134, revenue: 10600 },
          { name: 'Island → Mainland', value: 98, revenue: 8200 },
        ];

        const bikeUsage = [
          { name: 'Model X1', value: 35 },
          { name: 'Model X2', value: 28 },
          { name: 'Model Pro', value: 22 },
          { name: 'Model Lite', value: 15 },
        ];

        setTimeseriesData(hours);
        setTopRidesData(topRides);
        setBikeUsageData(bikeUsage);
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) return <div className="text-slate-400">Loading analytics...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Rides Over Time */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <div className="font-bold text-white mb-4">Rides Over Time (24h)</div>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={timeseriesData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '8px',
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Revenue Over Time */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <div className="font-bold text-white mb-4">Revenue Over Time (24h)</div>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={timeseriesData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '8px',
              }}
            />
            <Bar dataKey="revenue" fill="#22c55e" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top Routes */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <div className="font-bold text-white mb-4">Top Routes by Rides</div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={topRidesData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={100} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '8px',
              }}
            />
            <Bar dataKey="value" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Bike Usage Distribution */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <div className="font-bold text-white mb-4">Fleet Usage Distribution</div>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={bikeUsageData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${value}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {bikeUsageData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '8px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
