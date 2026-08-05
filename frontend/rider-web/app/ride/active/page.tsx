'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import RiderMap from '@/components/Map/RiderMap';
import { RideTimer } from '@/components/rides/RideTimer';
import { useRide } from '@/context/RideContext';
import { useLiveFleet } from '@/hooks/useLiveFleet';
import { useNearbyDocks } from '@/hooks/useNearbyDocks';
import { ridesService } from '@/lib/ridesService';
import {
  CheckCircle,
  AlertTriangle,
  Link2,
  Smartphone,
  Bike,
  X,
  MapPin,
} from 'lucide-react';
import { DestinationSearch } from '@/components/Map/DestinationSearch';
import { useGeofences } from '@/hooks/useGeofences';

type EndRideStep = 'idle' | 'ending' | 'done';

export default function ActiveRide() {
  const router = useRouter();
  const { state, setError } = useRide();
  const { bikes } = useLiveFleet(undefined, undefined, 2, state.activeRide?.bikeId);
  const [isEndingRide, setIsEndingRide] = useState(false);
  const [tetherEnabled, setTetherEnabled] = useState(false);
  const [endStep, setEndStep] = useState<EndRideStep>('idle');
  const watchIdRef = useRef<number | null>(null);

  // Find the live bike to use its coordinates for dock searching
  const liveBike = state.activeRide?.bikeId
    ? bikes.find((b) => b.id === state.activeRide?.bikeId)
    : null;
  const { docks } = useNearbyDocks(liveBike?.lat, liveBike?.lng);
  const nearestDock = docks.length > 0 ? docks[0] : null;

  const { zones } = useGeofences();
  const [restrictedTimer, setRestrictedTimer] = useState<number | null>(null);

  // Monitor bike zone changes for restricted zones
  useEffect(() => {
    if (!liveBike?.zoneIds) {
      setRestrictedTimer(null);
      return;
    }

    const inRestrictedZone = liveBike.zoneIds.some((zId) => {
      const zone = zones.find((z) => z.id === zId);
      return zone?.type === 'no_ride';
    });

    if (inRestrictedZone && restrictedTimer === null) {
      // Just entered a restricted zone, start 60s countdown
      setRestrictedTimer(60);
    } else if (!inRestrictedZone) {
      setRestrictedTimer(null);
    }
  }, [liveBike?.zoneIds, zones]);

  // Tick the countdown
  useEffect(() => {
    if (restrictedTimer === null || restrictedTimer <= 0) return;
    const interval = setInterval(() => {
      setRestrictedTimer((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [restrictedTimer]);

  // Developer Feature: Tether Bike to Phone's GPS
  useEffect(() => {
    if (tetherEnabled && state.activeRide) {
      if (navigator.geolocation) {
        watchIdRef.current = navigator.geolocation.watchPosition(
          async (position) => {
            try {
              await fetch('/api/proxy/fleet/simulator/telemetry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  bikeId: state.activeRide?.bikeId,
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                  battery_pct: 85,
                  speed_kmh: position.coords.speed ? (position.coords.speed * 3.6).toFixed(1) : 0,
                  lock_status: 'UNLOCKED',
                }),
              });
            } catch (err) {
              console.error('Failed to sync telemetry', err);
            }
          },
          (err) => console.error('Tether GPS error', err),
          { enableHighAccuracy: true, maximumAge: 0 },
        );
      }
    } else {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    }

    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [tetherEnabled, state.activeRide?.bikeId]);

  // Redirect if no active ride
  useEffect(() => {
    if (!state.activeRide) {
      router.push('/');
    }
  }, [state.activeRide, router]);

  const initiateEndRide = async () => {
    if (!state.activeRide || !navigator.geolocation) {
      setError('Unable to end ride: location not available');
      return;
    }

    setEndStep('ending');
    setIsEndingRide(true);

    const endTheRide = async (lat?: number, lng?: number) => {
      try {
        const endDockId = nearestDock?.id || 'dock-002';
        await ridesService.endRide(
          state.activeRide!.id,
          endDockId,
          lat ?? 0,
          lng ?? 0,
        );

        setEndStep('done');
        toast.success('Ride ended successfully!');

        setTimeout(() => {
          router.push(`/ride/receipt/${state.activeRide!.id}`);
        }, 1000);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to end ride';
        setError(message);
        toast.error(message);
        setIsEndingRide(false);
        setEndStep('idle');
      }
    };

    try {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          endTheRide(position.coords.latitude, position.coords.longitude);
        },
        (err) => {
          console.warn('Geolocation error during end ride, proceeding without precise location:', err.message);
          toast.error(`Could not get precise location. Proceeding...`);
          endTheRide();
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get location';
      setError(message);
      toast.error(message);
      setIsEndingRide(false);
      setEndStep('idle');
    }
  };

  return (
    <div className="w-full h-full relative overflow-hidden">
      {/* 🗺️ Full Screen Map Area */}
      <div className="absolute inset-0 bg-surface">
        <RiderMap />
      </div>

      {/* ⏱️ Top-Left: Active Ride Timer & Cost */}
      <div className="absolute top-24 xl:top-8 left-6 glass-panel rounded-2xl p-4 flex flex-col gap-1 z-20 min-w-[200px]">
        <RideTimer surgeMultiplier={state.activeRide?.surgeMultiplier || 1} />
      </div>

      {/* 🔍 Top-Center: Destination Search */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 w-[90%] md:w-auto flex flex-col gap-4">
        <DestinationSearch />

        {/* ⚠️ Restricted Zone Warning */}
        {restrictedTimer !== null && (
          <div className="w-full max-w-[400px] mx-auto bg-red-500/90 backdrop-blur-md border-2 border-red-400 rounded-2xl p-4 shadow-2xl flex flex-col items-center text-center animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-2 text-white mb-2">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
              <h3 className="font-extrabold text-lg uppercase tracking-wider">Restricted Zone</h3>
            </div>
            <p className="text-white/90 text-sm font-semibold mb-3">
              You have entered a no-ride zone. Scooter speed is limited. Please exit the zone or the
              ride will end.
            </p>
            <div className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center text-white font-black text-2xl animate-pulse">
              {restrictedTimer}s
            </div>
          </div>
        )}
      </div>

      {/* 🧭 Top-Right: Nearest Dock Navigation */}
      <div className="flex flex-col items-end gap-2 absolute top-24 xl:top-8 right-6 z-20">
        {nearestDock && (
          <div className="bg-[#0A0D14]/90 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-white">
              {(nearestDock.distanceKm * 1000).toFixed(0)}m to Dock
            </span>
          </div>
        )}
      </div>

      {/* 🛑 Bottom Bar: End Ride Controls */}
      <div
        className={`absolute bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-md glass-panel rounded-3xl p-2 flex items-center justify-between z-20 shadow-2xl transition-transform duration-500 ${endStep !== 'idle' ? 'translate-y-32' : 'translate-y-0'}`}
      >
        {/* Bike Status Mini */}
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="w-10 h-10 rounded-full bg-surfaceLight border border-white/5 flex items-center justify-center text-primary">
            <Bike className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm">{state.activeRide?.bikeId || 'N/A'}</span>
            <span className="text-xs text-primary font-medium">
              {state.activeRide?.bikeId
                ? `${bikes.find((b) => b.id === state.activeRide?.bikeId)?.batteryPct || '--'}% Battery`
                : '--% Battery'}
            </span>
          </div>
        </div>

        {/* Primary Action Button */}
        <button
          onClick={initiateEndRide}
          disabled={isEndingRide}
          className="h-14 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-bold rounded-2xl flex items-center justify-center text-lg transition-colors shadow-lg shadow-red-500/20 disabled:opacity-50"
        >
          {isEndingRide ? (
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            'End Ride'
          )}
        </button>
      </div>

      {/* End Ride Modal */}
      {endStep !== 'idle' && (
        <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-surfaceLight border-t sm:border border-white/10 shadow-2xl sm:rounded-3xl rounded-t-3xl p-6 md:p-8 relative overflow-hidden animate-in slide-in-from-bottom duration-500">
            {endStep === 'ending' && (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-16 h-16 rounded-full border-4 border-white/10 border-t-primary animate-spin mb-6"></div>
                <div className="text-xl font-bold text-white mb-2">Ending Ride...</div>
                <p className="text-slate-400 text-center">Securely ending your session.</p>
              </div>
            )}

            {endStep === 'done' && (
              <div className="flex flex-col items-center justify-center py-8 animate-in zoom-in-95">
                <div className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary shadow-glow-primary flex items-center justify-center mb-6">
                  <CheckCircle className="w-10 h-10 text-primary" />
                </div>
                <div className="text-2xl font-bold text-white mb-2">Ride Completed!</div>
                <p className="text-slate-400 text-center">Generating your receipt...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Extra Controls */}
      <div
        className={`absolute top-1/2 -translate-y-1/2 right-6 flex flex-col gap-3 z-20 transition-transform duration-500 ${endStep !== 'idle' ? 'translate-x-24' : 'translate-x-0'}`}
      >
        {/* Developer Tether Mode */}
        <button
          onClick={() => setTetherEnabled(!tetherEnabled)}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg ${tetherEnabled ? 'bg-[#1ED760] text-black shadow-[0_0_15px_rgba(30, 215, 96,0.5)] scale-110' : 'glass-panel text-white hover:bg-white/10'}`}
          title="Tether Bike to Phone (Dev)"
        >
          {tetherEnabled ? (
            <Link2 className="w-5 h-5" />
          ) : (
            <Smartphone className="w-5 h-5 text-slate-300" />
          )}
        </button>
      </div>
    </div>
  );
}
