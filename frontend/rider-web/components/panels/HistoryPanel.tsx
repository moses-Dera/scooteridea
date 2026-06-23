'use client';

import { useRideHistory } from '@/hooks';

interface HistoryPanelProps {
  onClose: () => void;
}

export default function HistoryPanel({ onClose }: HistoryPanelProps) {
  const { rides, loading, error } = useRideHistory();

  return (
    <div className="px-6 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pt-2">
        <div className="text-2xl font-bold text-white">Ride History</div>
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
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00FFA3] mx-auto mb-4"></div>
          <p className="text-slate-400">Loading history...</p>
        </div>
      ) : rides.length === 0 ? (
        <div className="text-center py-12 bg-white/5 border border-white/10 rounded-3xl">
          <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4 text-2xl">🚲</div>
          <p className="text-white font-bold mb-1">No rides yet</p>
          <p className="text-slate-400 text-sm">Your ride history will appear here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {rides.map((ride: any) => (
            <div key={ride.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-white">Bike {ride.bikeId.substring(0, 8)}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{new Date(ride.createdAt).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-white">₦ {ride.cost || '0.00'}</p>
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full mt-1 inline-block ${
                    ride.status === 'completed' ? 'bg-[#00FFA3]/20 text-[#00FFA3]' : 'bg-orange-500/20 text-orange-400'
                  }`}>
                    {ride.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
