'use client';

import { useState, useEffect } from 'react';
import { Battery, BatteryMedium, BatteryLow, BatteryWarning } from 'lucide-react';
import Link from 'next/link';
import { FaLocationDot } from 'react-icons/fa6';

interface AvailableBike {
  id: string;
  lat: number;
  lng: number;
  battery_pct: number;
  distance_km: number;
}

export function BikeFinder() {
  const [bikes, setBikes] = useState<AvailableBike[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1. Get real user location once
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (err) => {
          console.warn('Geolocation denied or failed.');
          setErrorMsg('Location access denied or failed.');
          setLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    } else {
      setErrorMsg('Geolocation not supported.');
      setLoading(false);
    }
  }, []);

  // 2. Fetch bikes based on real location
  useEffect(() => {
    if (!userCoords) return;

    const fetchBikes = async () => {
      try {
        const { lat, lng } = userCoords;
        const res = await fetch(`/api/proxy/fleet/nearby?lat=${lat}&lng=${lng}&radius=10`);

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            const bikesWithDistance = json.data.map((bike: any) => {
              const dx = bike.lat - lat;
              const dy = bike.lng - lng;
              const distKm = Math.sqrt(dx * dx + dy * dy) * 111;

              return {
                id: bike.bikeId,
                lat: bike.lat,
                lng: bike.lng,
                battery_pct: bike.battery_pct,
                distance_km: Math.max(0.1, distKm).toFixed(1),
              };
            });
            setBikes(bikesWithDistance);
          }
        }
      } catch (err) {
        console.error('Failed to fetch nearby bikes:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBikes();
    const interval = setInterval(fetchBikes, 10000);

    return () => clearInterval(interval);
  }, [userCoords]);

  const getBatteryIcon = (pct: number) => {
    if (pct >= 75) return <Battery className="w-5 h-5 text-green-400" />;
    if (pct >= 50) return <BatteryMedium className="w-5 h-5 text-green-400" />;
    if (pct >= 25) return <BatteryLow className="w-5 h-5 text-yellow-400" />;
    return <BatteryWarning className="w-5 h-5 text-red-400" />;
  };

  const filteredBikes = bikes.filter((bike) =>
    bike.id.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (errorMsg) return <div className="text-center text-red-400 p-4">{errorMsg}</div>;
  if (loading) return <div className="text-center text-slate-400">Finding bikes near you...</div>;

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search bike ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Bikes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBikes.map((bike) => (
          <Link key={bike.id} href={`/?bike=${bike.id}`}>
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg p-4 hover:border-blue-500 transition-all cursor-pointer hover:shadow-lg hover:shadow-blue-500/20">
              {/* Header */}
              <div className="flex justify-between items-start mb-3">
                <div className="font-bold text-white text-lg">{bike.id}</div>
                <div className="flex items-center gap-1">
                  {getBatteryIcon(bike.battery_pct)}
                  <span className="text-sm text-slate-300">{bike.battery_pct}%</span>
                </div>
              </div>

              {/* Location & Distance */}
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-4">
                <FaLocationDot size={14} />
                <span>{bike.distance_km} km away</span>
              </div>

              {/* Button */}
              <div className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-center font-bold transition-colors">
                Unlock Now
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filteredBikes.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <p>No bikes available nearby. Try a different area.</p>
        </div>
      )}

      {/* Stats */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mt-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-slate-400 text-sm">Bikes Available</p>
            <p className="text-2xl font-bold text-green-400">{bikes.length}</p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Avg Battery</p>
            <p className="text-2xl font-bold text-blue-400">
              {bikes.length > 0
                ? Math.round(bikes.reduce((a, b) => a + b.battery_pct, 0) / bikes.length)
                : 0}
              %
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Nearest</p>
            <p className="text-2xl font-bold text-purple-400">
              {bikes.length > 0
                ? Math.min(...bikes.map((b) => parseFloat(b.distance_km as any))).toFixed(1)
                : 0}{' '}
              km
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
