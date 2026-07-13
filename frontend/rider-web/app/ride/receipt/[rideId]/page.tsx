'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ridesService } from '@/lib/ridesService';
import { useRide } from '@/context/RideContext';
import { Ride } from '@/lib/types';
import { Camera, CheckCircle, AlertTriangle } from 'lucide-react';

export default function RideReceipt({ params }: { params: { rideId: string } }) {
  const router = useRouter();
  const { clearActiveRide } = useRide();
  const [ride, setRide] = useState<Ride | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRide = async () => {
      try {
        const rideData = await ridesService.getById(params.rideId);
        setRide(rideData);
        clearActiveRide();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load receipt';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRide();
  }, [params.rideId, clearActiveRide]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Processing receipt...</p>
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
          <div className="text-2xl font-bold mb-2 text-white">Error</div>
          <p className="text-slate-400 mb-6">{error || 'Could not load receipt'}</p>
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

  const duration = ride.duration / 60; // Convert to minutes
  const distance = ride.distance || 0;

  return (
    <div className="w-full h-full overflow-y-auto bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-md mx-auto pb-8">
        {/* Success Header */}
        <div className="text-center mb-8 mt-8">
          <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary shadow-glow-primary mx-auto mb-6 relative">
            <CheckCircle className="w-12 h-12 text-primary" />
            <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-20"></div>
          </div>
          <div className="text-3xl font-bold text-white mb-2">Ride Complete!</div>
          <p className="text-slate-400">Thanks for riding with us</p>
        </div>

        {/* Receipt Card */}
        <div className="bg-surfaceLight border border-white/10 rounded-3xl p-6 mb-6">
          {/* Ride Info */}
          <div className="mb-6 pb-6 border-b border-white/10">
            <div className="flex justify-between items-center mb-4">
              <span className="text-slate-400">Bike</span>
              <span className="font-bold text-white">{ride.bikeId}</span>
            </div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-slate-400">Duration</span>
              <span className="font-bold text-white">{duration.toFixed(1)} mins</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Distance</span>
              <span className="font-bold text-white">{distance.toFixed(1)} km</span>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="mb-6 pb-6 border-b border-white/10">
            <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">
              Cost Breakdown
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-400">Base fare ({duration.toFixed(1)} min × ₦50)</span>
              <span className="text-white">₦ {(duration * 50).toFixed(2)}</span>
            </div>
            {ride.surgeMultiplier > 1 && (
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-400">Surge ({ride.surgeMultiplier}x)</span>
                <span className="text-warning">
                  + ₦ {(duration * 50 * (ride.surgeMultiplier - 1)).toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center pt-3 border-t border-white/10">
              <span className="font-bold text-white">Total</span>
              <span className="text-xl font-bold text-primary">₦ {ride.fare.toFixed(2)}</span>
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
          <button
            onClick={() => {
              // Rate ride functionality
            }}
            className="w-full h-12 border border-white/10 text-white font-bold rounded-xl hover:border-white/20 transition-colors"
          >
            Rate This Ride
          </button>
        </div>

        {/* Dispute Option */}
        <button className="w-full mt-4 text-sm text-slate-400 hover:text-white transition-colors">
          Having an issue? Report it
        </button>
      </div>
    </div>
  );
}
