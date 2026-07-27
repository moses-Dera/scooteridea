'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ridesService } from '@/lib/ridesService';
import { pricingApi, bikeApi } from '@/lib/api';
import { useRide } from '@/context/RideContext';
import { Smartphone, Scan, KeyRound, Unlock, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';

type UnlockStep = 'confirm' | 'done';

interface UnlockModalProps {
  bikeId: string;
  onClose: () => void;
}

export function UnlockModal({ bikeId, onClose }: UnlockModalProps) {
  const { status } = useSession();
  const [step, setStep] = useState<UnlockStep>('confirm');
  const router = useRouter();
  const { state, setActiveRide, setLoading } = useRide();
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [unlockPin, setUnlockPin] = useState<string>('');
  const [pricing, setPricing] = useState<{
    perMinute: number;
    baseFare: number;
    surgeMult: number;
  } | null>(null);

  const [bikeHubId, setBikeHubId] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      window.dispatchEvent(
        new CustomEvent('auth-required', { detail: { feature: 'Unlock Bike' } }),
      );
    }
  }, [status]);

  // Fetch dynamic pricing data based on the bike's exact GPS location
  useEffect(() => {
    const fetchPricing = async () => {
      try {
        let lat = 6.4541; // Default fallback (Lagos approx)
        let lng = 3.3792;

        // Fetch the bike's exact real-time coordinates from Swarm backend
        const bikeRes = await bikeApi.getById(bikeId);
        if (!bikeRes || !bikeRes.success || !bikeRes.data) {
          setError(`Bike ${bikeId} not found in the system.`);
          return;
        }

        const bike = bikeRes.data as any;
        if (bike.hubId) {
          setBikeHubId(bike.hubId);
        }
        if (bike.latitude && bike.longitude) {
          lat = bike.latitude;
          lng = bike.longitude;
        }

        const res = await pricingApi.estimate(lat, lng);
        if (res.success && res.data) {
          setPricing({
            perMinute: res.data.perMinute,
            baseFare: res.data.baseFare,
            surgeMult: res.data.surgeMult,
          });
        }
      } catch (err) {
        console.error('Failed to fetch pricing config', err);
      }
    };
    fetchPricing();
  }, [bikeId]);

  if (status === 'loading' || status === 'unauthenticated') {
    return null; // Return nothing while auth checks/redirects occur
  }

  const handleStartRide = async () => {
    try {
      setIsStarting(true);
      setLoading(true);
      setError(null);

      let rideId = state.activeRide?.id;

      // If no active ride exists, create one now!
      if (!rideId) {
        // Use dynamic hubId if the bike is currently docked, else pass undefined for free-floating
        const newRide = await ridesService.reserve(bikeId, bikeHubId || undefined);
        setActiveRide(newRide);
        rideId = newRide.id;
      }

      await ridesService.startRide(rideId!);
      setStep('done');

      // Navigate after a short delay to show the success screen
      setTimeout(() => {
        router.push('/ride/active');
      }, 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start ride';
      setError(message);
      setIsStarting(false);
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-300">
      {/* Centered Modal */}
      <div className="w-full max-w-md bg-surfaceLight border border-white/10 shadow-2xl shadow-primary/5 rounded-3xl p-6 md:p-8 relative overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors z-20"
        >
          <X className="w-5 h-5 text-slate-400" />
        </button>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-8 mt-2">
          <div
            className={`h-1.5 flex-1 rounded-full ${step === 'confirm' || step === 'done' ? 'bg-primary shadow-glow-primary' : 'bg-white/10'}`}
          ></div>
          <div
            className={`h-1.5 flex-1 rounded-full ${step === 'done' ? 'bg-primary shadow-glow-primary' : 'bg-white/10'}`}
          ></div>
        </div>

        {/* Step 1: Confirm */}
        {step === 'confirm' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-2xl font-bold text-white mb-2">Confirm Unlock</h2>
            {error ? (
              <div className="p-4 mb-6 bg-danger/10 border border-danger/30 rounded-xl flex items-start gap-3">
                <div className="p-1 bg-danger/20 rounded-full text-danger mt-0.5">
                  <X className="w-4 h-4" />
                </div>
                <div className="text-danger font-medium text-sm leading-relaxed">{error}</div>
              </div>
            ) : (
              <p className="text-slate-400 mb-6">
                You are about to unlock bike <strong className="text-white">{bikeId}</strong>.
                {pricing ? (
                  pricing.perMinute === 0 ? (
                    <span>
                      {' '}
                      Rides are currently <strong className="text-primary">Free</strong> during the
                      beta test.
                    </span>
                  ) : (
                    <span>
                      {' '}
                      A standard fare of{' '}
                      <strong className="text-white">₦{pricing.perMinute}/min</strong> applies.
                    </span>
                  )
                ) : (
                  <span> Checking pricing...</span>
                )}
              </p>
            )}

            <div className="bg-black/30 rounded-xl p-4 mb-8 border border-white/5">
              <div className="flex justify-between mb-2">
                <div className="text-slate-400 text-sm font-medium mb-1">Unlock Fee</div>
                <div className="flex items-center gap-2">
                  {pricing ? (
                    <span className="font-semibold text-white">
                      ₦ {pricing.baseFare.toFixed(2)}
                    </span>
                  ) : (
                    <span className="w-8 h-4 bg-white/10 animate-pulse rounded"></span>
                  )}
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Surge Pricing</span>
                {pricing ? (
                  <span
                    className={`font-semibold ${pricing.surgeMult > 1 ? 'text-warning' : 'text-primary'}`}
                  >
                    {pricing.surgeMult}x {pricing.surgeMult > 1 ? '(Active)' : '(None)'}
                  </span>
                ) : (
                  <span className="w-8 h-4 bg-white/10 animate-pulse rounded"></span>
                )}
              </div>
            </div>

            <button
              onClick={handleStartRide}
              disabled={isStarting || !!error}
              className="w-full h-14 bg-primary text-black font-bold text-lg rounded-xl shadow-glow-primary flex items-center justify-center transform hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isStarting ? 'Unlocking...' : 'Unlock Now'}
            </button>
          </div>
        )}

        {/* Step 4: Done (Auto-Unlock) */}
        {step === 'done' && (
          <div className="animate-in fade-in zoom-in-95 duration-500 flex flex-col items-center justify-center py-8">
            <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary shadow-glow-primary mb-6 relative">
              <Unlock className="w-10 h-10 text-primary" />
              <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-20"></div>
            </div>
            <div className="text-2xl font-bold mb-2 text-center">Bike Unlocked!</div>
            <p className="text-slate-400 text-center mb-8">Helmet on. Ride safely.</p>

            <button
              onClick={() => router.push('/ride/active')}
              className="w-full h-14 bg-primary text-black font-bold text-lg rounded-xl shadow-glow-primary flex items-center justify-center transform hover:scale-[1.02] transition-transform"
            >
              Start Riding
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
