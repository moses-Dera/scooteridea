'use client';
import { useState, useEffect } from 'react';

import { useRouter } from 'next/navigation';
import { MapPin, Navigation, Info } from 'lucide-react';
import { useNearbyDocks } from '@/hooks/useNearbyDocks';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface DocksPanelProps {
  onClose: () => void;
}

export default function DocksPanel({ onClose }: DocksPanelProps) {
  const router = useRouter();
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.error('Error getting location', err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    }
  }, []);

  const { docks, loading } = useNearbyDocks(userLoc?.lat, userLoc?.lng);

  return (
    <div className="px-6 pb-6 text-white space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 pt-2">
        <div className="text-2xl font-bold">Docking Stations</div>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-start gap-3 mb-6">
        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <p className="text-sm text-primary/90 font-medium">
          You must park your scooter at a designated docking station to end your ride and avoid a
          penalty fee.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner text="Scanning area for docks..." />
        </div>
      ) : docks.length === 0 ? (
        <div className="text-center py-8 text-slate-500 font-medium">
          No docking stations found nearby.
        </div>
      ) : (
        <div className="space-y-4">
          {docks.map((dock) => (
            <div
              key={dock.id}
              className="glass-panel p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">{dock.name}</h3>
                    <p className="text-xs text-slate-400 font-semibold">
                      {dock.distanceKm} km away
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                <div>
                  <div className="text-xs text-slate-500 font-bold uppercase mb-1">
                    Available Slots
                  </div>
                  <div
                    className={`text-xl font-black ${dock.availableSlots > 2 ? 'text-primary' : 'text-warning'}`}
                  >
                    {dock.availableSlots}{' '}
                    <span className="text-sm font-semibold text-slate-400">spots left</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onClose();
                    router.push(`/?navigate=true&lat=${dock.lat}&lng=${dock.lng}`);
                  }}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 transition-colors rounded-xl font-bold text-sm flex items-center gap-2 group cursor-pointer"
                >
                  <Navigation className="w-4 h-4 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />{' '}
                  Navigate
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
