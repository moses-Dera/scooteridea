'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, MapPin, Clock } from 'lucide-react';
import { rideApi } from '@/lib/api';

export default function RideHistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await rideApi.getHistory(1, 20);
        // Backend wraps history inside res.data.items for PaginatedResponse
        setHistory((res.data?.items as any[]) || []);
      } catch (err) {
        console.error('Failed to load ride history:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white">
      {/* Header */}
      <div className="sticky top-0 z-40 pt-20 px-6 pb-6 border-b border-white/5 bg-[#0A0D14]/80 backdrop-blur-xl">
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={() => router.push('/menu')}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div className="text-2xl font-bold">Ride History</div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-4">
        {loading ? (
          <div className="text-center py-8 text-slate-400 animate-pulse font-medium">
            Loading history...
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-slate-500 font-medium">No past trips found.</div>
        ) : (
          history.map((trip: any) => (
            <div
              key={trip.id}
              className="glass-panel p-5 rounded-2xl border border-white/5 hover:border-primary/30 transition-colors group cursor-pointer relative overflow-hidden"
            >
              {/* Top row */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-xs font-bold text-slate-500 mb-1">
                    {trip.id.substring(0, 8).toUpperCase()}
                  </div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                    <Calendar className="w-4 h-4 text-primary" />{' '}
                    {trip.startedAt ? new Date(trip.startedAt).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
                <div className="text-lg font-black text-white">
                  ₦ {((trip.fareCents || 0) / 100).toFixed(2)}
                </div>
              </div>

              {/* Route timeline */}
              <div className="relative pl-6 space-y-4 border-l-2 border-white/10 ml-2 mb-4">
                <div className="relative">
                  <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-[#0A0D14] border-2 border-primary"></div>
                  <div className="text-sm font-semibold text-white">Start Dock</div>
                </div>
                <div className="relative">
                  <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-[#0A0D14] border-2 border-white/20 group-hover:border-primary/50 transition-colors"></div>
                  <div className="text-sm font-semibold text-slate-400">End Dock</div>
                </div>
              </div>

              {/* Bottom stats */}
              <div className="flex items-center gap-6 pt-4 border-t border-white/5 text-sm text-slate-400 font-medium">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {trip.endedAt && trip.startedAt
                    ? Math.max(
                        1,
                        Math.round(
                          (new Date(trip.endedAt).getTime() - new Date(trip.startedAt).getTime()) /
                            60000,
                        ),
                      )
                    : 0}{' '}
                  min
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {trip.distanceKm ? trip.distanceKm.toFixed(1) : '0.0'} km
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
