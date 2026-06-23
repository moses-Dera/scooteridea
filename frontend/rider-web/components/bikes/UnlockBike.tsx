"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface BikeDetail {
  id: string;
  battery_pct: number;
  status: string;
  lat: number;
  lng: number;
}

export function UnlockBikeComponent({ bikeId }: { bikeId: string }) {
  const [bike, setBike] = useState<BikeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rideStarted, setRideStarted] = useState(false);
  const [rideTime, setRideTime] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const fetchBike = async () => {
      try {
        const token = localStorage.getItem('token') || 'demo-token';
        const res = await fetch(`/api/proxy/fleet/bikes/${bikeId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (res.ok) {
          setBike(await res.json());
        } else {
          setError('Bike not found');
        }
      } catch (err) {
        setError('Failed to load bike details');
      } finally {
        setLoading(false);
      }
    };

    fetchBike();
  }, [bikeId]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (rideStarted) {
      timer = setInterval(() => setRideTime((t) => t + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [rideStarted]);

  const handleUnlock = async () => {
    setUnlocking(true);
    setError(null);
    try {
      const token = localStorage.getItem('token') || 'demo-token';
      const res = await fetch(`/api/proxy/fleet/bikes/${bikeId}/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'UNLOCK' }),
      });

      if (res.ok) {
        setRideStarted(true);
        // Redirect to active ride after 2 seconds
        setTimeout(() => {
          router.push('/ride/active');
        }, 2000);
      } else {
        setError('Failed to unlock bike');
      }
    } catch (err) {
      setError('Unlock failed. Try again.');
    } finally {
      setUnlocking(false);
    }
  };

  if (loading) {
    return <div className="text-center text-slate-400">Loading bike details...</div>;
  }

  if (!bike) {
    return (
      <div className="text-center text-red-400">
        <p>Bike not found</p>
        <button onClick={() => router.push('/')} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">
          Back to Map
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Bike Info Card */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-4">{bike.id}</h2>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-700 rounded-lg p-4 text-center">
            <p className="text-slate-400 text-sm">Battery</p>
            <p className="text-2xl font-bold text-green-400">{bike.battery_pct}%</p>
          </div>
          <div className="bg-slate-700 rounded-lg p-4 text-center">
            <p className="text-slate-400 text-sm">Status</p>
            <p className="text-lg font-bold text-blue-400 capitalize">{bike.status}</p>
          </div>
          <div className="bg-slate-700 rounded-lg p-4 text-center">
            <p className="text-slate-400 text-sm">Location</p>
            <p className="text-xs text-slate-300">{bike.lat.toFixed(2)}, {bike.lng.toFixed(2)}</p>
          </div>
          <div className="bg-slate-700 rounded-lg p-4 text-center">
            <p className="text-slate-400 text-sm">Condition</p>
            <p className="text-lg font-bold text-purple-400">Good</p>
          </div>
        </div>

        {error && <div className="mb-4 p-3 bg-red-900 text-red-200 rounded text-sm">{error}</div>}

        {!rideStarted ? (
          <button
            onClick={handleUnlock}
            disabled={unlocking || bike.status !== 'available'}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-lg font-bold transition-colors"
          >
            {unlocking ? 'Unlocking...' : 'Unlock & Start Ride'}
          </button>
        ) : (
          <div className="text-center">
            <p className="text-green-400 font-bold mb-2">✓ Bike Unlocked!</p>
            <div className="bg-slate-700 rounded-lg p-4 mb-4">
              <p className="text-slate-400 text-sm">Ride Time</p>
              <p className="text-3xl font-bold text-white">
                {Math.floor(rideTime / 60)}:{String(rideTime % 60).padStart(2, '0')}
              </p>
            </div>
            <button
              onClick={() => router.push('/ride/active')}
              className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold"
            >
              View Active Ride →
            </button>
          </div>
        )}
      </div>

      {/* Quick Tips */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <h3 className="font-bold text-white mb-3">Quick Tips</h3>
        <ul className="text-sm text-slate-400 space-y-2">
          <li>✓ Check bike condition before riding</li>
          <li>✓ Wear your helmet</li>
          <li>✓ Follow traffic rules</li>
          <li>✓ Return bike to a dock when done</li>
        </ul>
      </div>

      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
      >
        ← Back
      </button>
    </div>
  );
}
