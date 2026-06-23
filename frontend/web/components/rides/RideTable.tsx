"use client";

import { useEffect, useState } from 'react';
import { FaClockRotateLeft, FaMapLocation, FaCoins } from 'react-icons/fa6';

interface Ride {
  id: string;
  rider_id: string;
  bike_id: string;
  start_time: string;
  end_time: string | null;
  start_dock_id: string;
  end_dock_id: string | null;
  distance_km: number;
  duration_minutes: number;
  fare_amount: number;
  status: 'in_progress' | 'completed' | 'disputed';
}

export function RideTableComponent() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRide, setExpandedRide] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const pageSize = 10;

  useEffect(() => {
    const fetchRides = async () => {
      try {
        const token = localStorage.getItem('token') || 'demo-token';
        const res = await fetch(`http://localhost:3003/rides?page=${page}&limit=${pageSize}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!res.ok) throw new Error(`Failed to fetch rides: ${res.statusText}`);

        const data = await res.json();
        setRides(Array.isArray(data) ? data : data.data || []);

        if (data.total) {
          setTotalPages(Math.ceil(data.total / pageSize));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch rides');
      } finally {
        setLoading(false);
      }
    };

    fetchRides();
  }, [page]);

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading && rides.length === 0) return <div className="text-slate-400">Loading rides...</div>;
  if (error) return <div className="text-red-400">Error: {error}</div>;
  if (!rides.length) return <div className="text-slate-400">No rides found</div>;

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-slate-300 font-bold">Rider</th>
                <th className="px-4 py-3 text-left text-slate-300 font-bold">Bike</th>
                <th className="px-4 py-3 text-left text-slate-300 font-bold">Duration</th>
                <th className="px-4 py-3 text-left text-slate-300 font-bold">Distance</th>
                <th className="px-4 py-3 text-right text-slate-300 font-bold">Fare</th>
                <th className="px-4 py-3 text-center text-slate-300 font-bold">Status</th>
                <th className="px-4 py-3 text-center text-slate-300 font-bold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {rides.map((ride) => {
                const statusColor = {
                  'in_progress': 'bg-blue-900 text-blue-200',
                  'completed': 'bg-green-900 text-green-200',
                  'disputed': 'bg-red-900 text-red-200',
                }[ride.status];

                return (
                  <tbody key={ride.id}>
                    <tr className="hover:bg-slate-700 transition-colors cursor-pointer" onClick={() => setExpandedRide(expandedRide === ride.id ? null : ride.id)}>
                      <td className="px-4 py-3 text-white font-medium">{ride.rider_id}</td>
                      <td className="px-4 py-3 text-white">{ride.bike_id}</td>
                      <td className="px-4 py-3 text-slate-300">{ride.duration_minutes}m</td>
                      <td className="px-4 py-3 text-slate-300">{ride.distance_km.toFixed(1)} km</td>
                      <td className="px-4 py-3 text-right text-white font-bold">₦{ride.fare_amount.toFixed(0)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColor}`}>
                          {ride.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button className="text-blue-400 hover:text-blue-300 text-sm font-bold">
                          {expandedRide === ride.id ? '−' : '+'}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded row */}
                    {expandedRide === ride.id && (
                      <tr className="bg-slate-900">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                              <div className="font-bold text-white mb-3">Trip Details</div>

                              <div className="flex items-center gap-3">
                                <FaClockRotateLeft size={16} />
                                <div>
                                  <p className="text-xs text-slate-400">Duration</p>
                                  <p className="text-white font-bold">{ride.duration_minutes} minutes</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <FaMapLocation size={16} />
                                <div>
                                  <p className="text-xs text-slate-400">Distance</p>
                                  <p className="text-white font-bold">{ride.distance_km.toFixed(2)} km</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <FaCoins size={16} />
                                <div>
                                  <p className="text-xs text-slate-400">Fare</p>
                                  <p className="text-white font-bold">₦{ride.fare_amount.toFixed(0)}</p>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <div className="font-bold text-white mb-3">Timeline</div>

                              <div>
                                <p className="text-xs text-slate-400">Start</p>
                                <p className="text-white">
                                  {formatDate(ride.start_time)} {formatTime(ride.start_time)}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs text-slate-400">End</p>
                                <p className="text-white">
                                  {ride.end_time
                                    ? `${formatDate(ride.end_time)} ${formatTime(ride.end_time)}`
                                    : '(In Progress)'}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs text-slate-400">Dock Route</p>
                                <p className="text-white">
                                  {ride.start_dock_id} → {ride.end_dock_id || '(Not ended)'}
                                </p>
                              </div>
                            </div>
                          </div>

                          {ride.status === 'disputed' && (
                            <div className="mt-4 p-3 bg-red-900 rounded-lg">
                              <p className="text-red-200 text-sm">
                                ⚠️ This ride has been disputed. Review flagged for further investigation.
                              </p>
                              <button className="mt-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded font-bold">
                                View Dispute Details
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-400">
          Page {page} of {totalPages} • Showing {rides.length} rides
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-white rounded text-sm font-bold transition-colors"
          >
            ← Previous
          </button>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-white rounded text-sm font-bold transition-colors"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
