'use client';

import { useRideHistory } from '@/hooks';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { Bike, Calendar, MapPin, Clock } from 'lucide-react';

interface HistoryPanelProps {
  onClose: () => void;
}

export default function HistoryPanel({ onClose }: HistoryPanelProps) {
  const { status } = useSession();
  const { rides, loading, error, hasMore, nextPage } = useRideHistory();

  useEffect(() => {
    if (status === 'unauthenticated') {
      window.dispatchEvent(new CustomEvent('auth-required', { detail: { feature: 'your Ride History' } }));
    }
  }, [status]);

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="px-6 py-12 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="px-6 pb-6 text-white space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pt-2">
        <div className="text-2xl font-bold">Ride History</div>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {error && (
        <div className="w-full p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-slate-400 animate-pulse font-medium">Loading history...</div>
      ) : rides.length === 0 ? (
        <div className="text-center py-8 text-slate-500 font-medium">No past trips found.</div>
      ) : (
        <div className="flex flex-col gap-4">
          {rides.map((trip: any) => (
            <div key={trip.id} className="glass-panel p-5 rounded-2xl border border-white/5 hover:border-primary/30 transition-colors group cursor-pointer relative overflow-hidden">
              {/* Top row */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-xs font-bold text-slate-500 mb-1">{trip.id?.substring(0, 8).toUpperCase() || 'TRIP'}</div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                    <Calendar className="w-4 h-4 text-primary" /> {new Date(trip.startTime || trip.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-lg font-black text-white">₦ {(trip.costCents ? trip.costCents / 100 : trip.cost || 0).toFixed(2)}</div>
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
                  {trip.endTime ? Math.max(1, Math.round((new Date(trip.endTime).getTime() - new Date(trip.startTime || trip.createdAt).getTime()) / 60000)) : 0} min
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> 
                  {trip.distanceKm ? trip.distanceKm.toFixed(1) : '0.0'} km
                </div>
              </div>
            </div>
          ))}
          
          {hasMore && (
             <button onClick={nextPage} className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold transition-colors">Load More</button>
          )}
        </div>
      )}
    </div>
  );
}
