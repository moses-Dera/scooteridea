'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Route, Wallet, Zap, Map as MapIcon, Bike, LifeBuoy } from 'lucide-react';

export function ActiveRideComponent() {
  const [rideTime, setRideTime] = useState(0);
  const [distance, setDistance] = useState(0);
  const [estimatedFare, setEstimatedFare] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [ending, setEnding] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Simulate ride metrics
    const timer = setInterval(() => {
      setRideTime((t) => t + 1);
      setDistance((d) => d + Math.random() * 0.015); // ~0.9 km per minute
      setSpeed((Math.random() * 25 + 10).toFixed(1) as any); // 10-35 km/h
      setEstimatedFare((d) => d + Math.random() * 3); // ~3 per km
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleEndRide = async () => {
    setEnding(true);
    // Simulate API call to end ride
    setTimeout(() => {
      router.push('/ride/history');
    }, 1000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Main Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-blue-900 to-blue-800 border border-blue-700 rounded-lg p-6 text-center">
          <Clock className="w-8 h-8 mx-auto mb-2 text-blue-300" />
          <p className="text-slate-300 text-sm">Time</p>
          <p className="text-3xl font-bold text-white">{formatTime(rideTime)}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-900 to-purple-800 border border-purple-700 rounded-lg p-6 text-center">
          <Route className="w-8 h-8 mx-auto mb-2 text-purple-300" />
          <p className="text-slate-300 text-sm">Distance</p>
          <p className="text-3xl font-bold text-white">{distance.toFixed(2)}</p>
          <p className="text-xs text-slate-300">km</p>
        </div>

        <div className="bg-gradient-to-br from-green-900 to-green-800 border border-green-700 rounded-lg p-6 text-center">
          <Wallet className="w-8 h-8 mx-auto mb-2 text-green-300" />
          <p className="text-slate-300 text-sm">Est. Fare</p>
          <p className="text-3xl font-bold text-white">₦{estimatedFare.toFixed(0)}</p>
        </div>

        <div className="bg-gradient-to-br from-amber-900 to-amber-800 border border-amber-700 rounded-lg p-6 text-center">
          <Zap className="w-8 h-8 mx-auto mb-2 text-amber-300" />
          <p className="text-slate-300 text-sm">Speed</p>
          <p className="text-3xl font-bold text-white">{speed}</p>
          <p className="text-xs text-slate-300">km/h</p>
        </div>
      </div>

      {/* Live Map Placeholder */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 h-64 flex items-center justify-center">
        <div className="text-center">
          <p className="flex items-center justify-center gap-2 text-slate-400 text-sm mb-2">
            <MapIcon className="w-4 h-4" /> Live Map
          </p>
          <p className="text-slate-500 text-xs">Your ride is being tracked in real-time</p>
        </div>
      </div>

      {/* Trip Details */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-3">
        <div className="font-bold text-white">Trip Details</div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-slate-400">Avg Speed</p>
            <p className="text-white font-bold">
              {distance > 0 ? ((distance / (rideTime / 60)) * 60).toFixed(1) : 0} km/h
            </p>
          </div>
          <div>
            <p className="text-slate-400">Pace</p>
            <p className="text-white font-bold">
              {rideTime > 0 ? (rideTime / (distance || 0.001)).toFixed(0) : 0} s/m
            </p>
          </div>
          <div>
            <p className="text-slate-400">Bike ID</p>
            <p className="text-white font-bold">BIKE-001</p>
          </div>
          <div>
            <p className="text-slate-400">Status</p>
            <p className="text-green-400 font-bold">In Progress</p>
          </div>
        </div>
      </div>

      {/* Safety Message */}
      <div className="bg-blue-900 border border-blue-700 rounded-lg p-4">
        <span className="flex items-center gap-2">
          <Bike className="w-4 h-4 inline" /> Stay safe! Keep right, signal turns, and watch for
          pedestrians.
        </span>
      </div>

      {/* End Ride Button */}
      <button
        onClick={handleEndRide}
        disabled={ending}
        className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
      >
        ✕{ending ? 'Ending ride...' : 'End Ride'}
      </button>

      {/* Emergency Contact */}
      <button className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-bold flex items-center justify-center gap-2">
        <LifeBuoy className="w-4 h-4" /> Emergency / Support
      </button>
    </div>
  );
}
