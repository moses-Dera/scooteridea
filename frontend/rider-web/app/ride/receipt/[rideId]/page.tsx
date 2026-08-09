'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRide } from '@/context/RideContext';
import { CheckCircle, AlertTriangle, Clock, MapPin, Zap } from 'lucide-react';

// The backend returns raw DB field names — map them here
interface BackendRide {
  id: string;
  bikeId: string;
  status: string;
  fareCents?: number | null;
  distanceKm?: number | null;
  surgeMult?: number | null;
  startedAt?: string | null;
  endedAt?: string | null;
  bike?: { label?: string; id: string };
}

export default function RideReceipt({ params }: { params: { rideId: string } }) {
  const { clearActiveRide } = useRide();
  const [ride, setRide] = useState<BackendRide | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRide = async () => {
      try {
        const res = await fetch(`/api/proxy/rides/${params.rideId}`);
        const json = await res.json();
        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.error || json.message || 'Could not load receipt');
        }
        setRide(json.data);
        clearActiveRide();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load receipt');
      } finally {
        setIsLoading(false);
      }
    };
    fetchRide();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.rideId]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading receipt...</p>
        </div>
      </div>
    );
  }

  if (error || !ride) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-6">
        <div className="max-w-md w-full bg-surfaceLight border border-white/10 rounded-3xl p-8 text-center">
          <div className="flex justify-center mb-4 text-warning">
            <AlertTriangle className="w-16 h-16" />
          </div>
          <div className="text-2xl font-bold mb-2 text-white">Something went wrong</div>
          <p className="text-slate-400 mb-6">{error || 'Could not load your receipt'}</p>
          <Link
            href="/"
            className="w-full h-12 bg-primary text-black font-bold rounded-xl flex items-center justify-center hover:bg-primary/90 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // ── Compute display values from raw backend fields ─────────────────────────
  const fareNaira = (ride.fareCents ?? 0) / 100;
  const distanceKm = Number(ride.distanceKm ?? 0);
  const surgeMult = Number(ride.surgeMult ?? 1);

  // Duration from timestamps
  let durationSeconds = 0;
  if (ride.startedAt && ride.endedAt) {
    durationSeconds = Math.floor(
      (new Date(ride.endedAt).getTime() - new Date(ride.startedAt).getTime()) / 1000,
    );
  }
  const durationMins = Math.max(0, durationSeconds / 60);

  const pad = (n: number) => String(Math.floor(n)).padStart(2, '0');
  const durationLabel = `${pad(durationMins / 60)}:${pad(durationMins % 60)}:${pad((durationSeconds % 60))}`;

  const bikeLabel = ride.bike?.label || ride.bikeId;

  return (
    <div className="w-full h-full overflow-y-auto bg-gradient-to-br from-slate-900 to-slate-800 p-6 pt-28 pointer-events-auto">
      <div className="max-w-md mx-auto pb-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary shadow-glow-primary mx-auto mb-6 relative">
            <CheckCircle className="w-12 h-12 text-primary" />
            <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-20" />
          </div>
          <div className="text-3xl font-bold text-white mb-2">Ride Complete!</div>
          <p className="text-slate-400">Thanks for riding with us</p>
        </div>

        {/* Receipt Card */}
        <div className="bg-surfaceLight border border-white/10 rounded-3xl p-6 mb-6">
          {/* Ride Info */}
          <div className="mb-6 pb-6 border-b border-white/10 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 flex items-center gap-2"><Zap className="w-4 h-4" /> Bike</span>
              <span className="font-bold text-white">{bikeLabel}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 flex items-center gap-2"><Clock className="w-4 h-4" /> Duration</span>
              <span className="font-bold text-white">{durationLabel}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 flex items-center gap-2"><MapPin className="w-4 h-4" /> Distance</span>
              <span className="font-bold text-white">{distanceKm.toFixed(2)} km</span>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="mb-6 pb-6 border-b border-white/10">
            <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">
              Cost Breakdown
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-400">Ride fare</span>
              <span className="text-white">₦ {fareNaira.toFixed(2)}</span>
            </div>
            {surgeMult > 1 && (
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-400">Surge ({surgeMult}x)</span>
                <span className="text-warning">Applied</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-3 border-t border-white/10">
              <span className="font-bold text-white">Total Charged</span>
              <span className="text-xl font-bold text-primary">₦ {fareNaira.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400">Paid from</span>
            <span className="font-bold text-white">Wallet Balance</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <Link
            href="/"
            className="w-full h-12 bg-primary text-black font-bold rounded-xl flex items-center justify-center hover:bg-primary/90 transition-colors"
          >
            Back to Map
          </Link>
          <Link
            href="/ride/history"
            className="w-full h-12 border border-white/10 text-white font-bold rounded-xl flex items-center justify-center hover:border-white/20 transition-colors"
          >
            View Ride History
          </Link>
        </div>

        {/* Dispute Option */}
        <Link
          href={`/ride/history`}
          className="w-full mt-4 text-sm text-slate-400 hover:text-white transition-colors text-center block"
        >
          Having an issue? Report it
        </Link>
      </div>
    </div>
  );
}
