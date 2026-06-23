'use client';

import { useRouter } from 'next/navigation';
import { useState, useMemo, useEffect } from 'react';
import { useDocks } from '@/hooks';

// Haversine formula to calculate distance between two coordinates
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function DocksPage() {
  const router = useRouter();
  const [sortBy, setSortBy] = useState('nearest');
  const [filterBy, setFilterBy] = useState('all');
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Get user location on mount
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setLocationError(null);
        },
        (error) => {
          setLocationError('Unable to get your location');
          console.error('Geolocation error:', error);
        }
      );
    } else {
      setLocationError('Geolocation not supported');
    }
  }, []);

  // Fetch real dock data from backend
  const { docks, loading, error } = useDocks();

  // Transform backend data to match UI format with distance calculation
  const transformedDocks = useMemo(() => {
    return (docks || []).map((dock) => {
      let distance = 0;
      if (userLocation && dock.latitude && dock.longitude) {
        distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          dock.latitude,
          dock.longitude
        );
      }
      return {
        id: dock.id,
        name: dock.name,
        address: dock.address,
        available: dock.availableSlots,
        total: dock.totalSlots,
        charging: dock.chargingBikes,
        distance,
      };
    });
  }, [docks, userLocation]);

  // Filter and sort
  const filteredDocks = useMemo(() => {
    return transformedDocks
      .filter((dock) => {
        if (filterBy === 'available') return dock.available > 0;
        if (filterBy === 'full') return dock.available === 0;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'nearest') return a.distance - b.distance;
        if (sortBy === 'available') return b.available - a.available;
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return 0;
      });
  }, [transformedDocks, filterBy, sortBy]);

  const getCapacityColor = (available: number, total: number) => {
    const percent = (available / total) * 100;
    if (percent >= 70) return '#00FFA3'; // Green
    if (percent >= 30) return '#F59E0B'; // Amber
    return '#EF4444'; // Red
  };

  const getStatusBadge = (available: number) => {
    if (available === 0) {
      return <span className="px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-semibold">Full</span>;
    }
    if (available <= 2) {
      return <span className="px-2 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-semibold">Low</span>;
    }
    return <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-semibold">Available</span>;
  };

  return (
    <div className="w-full h-screen bg-[#0A0D14]">
      {/* Header */}
      <div className="sticky top-0 z-40 pt-20 px-6 pb-6 border-b border-white/10 bg-[#0A0D14]/95 backdrop-blur">
        {/* Geolocation Error Message */}
        {locationError && (
          <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm flex items-start gap-2">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-medium">Location Access Needed</p>
              <p className="text-xs mt-1">Enable location to see distances. Sorting will use available slots instead.</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <div className="text-2xl font-bold text-white">Docking Stations</div>
            <p className="text-sm text-slate-400">{filteredDocks.length} stations available</p>
          </div>
        </div>

        {/* Filter and Sort Controls */}
        <div className="flex gap-3 flex-wrap">
          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm hover:bg-white/15 transition-colors cursor-pointer"
          >
            <option value="nearest">Sort by: Nearest</option>
            <option value="available">Sort by: Most Available</option>
            <option value="name">Sort by: Name</option>
          </select>

          {/* Filter Buttons */}
          <button
            onClick={() => setFilterBy('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterBy === 'all'
                ? 'bg-[#00FFA3]/20 text-[#00FFA3] border border-[#00FFA3]/50'
                : 'bg-white/10 text-slate-300 border border-white/20 hover:bg-white/15'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterBy('available')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterBy === 'available'
                ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                : 'bg-white/10 text-slate-300 border border-white/20 hover:bg-white/15'
            }`}
          >
            Available
          </button>
          <button
            onClick={() => setFilterBy('full')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterBy === 'full'
                ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                : 'bg-white/10 text-slate-300 border border-white/20 hover:bg-white/15'
            }`}
          >
            Full
          </button>
        </div>
      </div>

      {/* Docks List - Scrollable */}
      <div className="h-[calc(100vh-220px)] overflow-y-auto">
        <div className="px-6 py-6 space-y-4">
          {loading && (
            <div className="flex items-center justify-center h-40">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00FFA3] mx-auto mb-4"></div>
                <p className="text-slate-300">Loading stations...</p>
              </div>
            </div>
          )}
          
          {error && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
              Failed to load docking stations. Please try again.
            </div>
          )}
          
          {!loading && !error && filteredDocks.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-400">No stations match your filters.</p>
            </div>
          )}
          
          {filteredDocks.map((dock) => (
            <div
              key={dock.id}
              className="p-5 rounded-2xl bg-gradient-to-br from-white/5 to-transparent border border-white/10 hover:border-white/20 transition-all group cursor-pointer hover:bg-white/10"
            >
              {/* Header: Name and Status */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="text-lg font-semibold text-white group-hover:text-[#00FFA3] transition-colors">
                    {dock.name}
                  </div>
                  <p className="text-sm text-slate-400 mt-1">{dock.address}</p>
                </div>
                {getStatusBadge(dock.available)}
              </div>

              {/* Capacity Bar */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-400">Capacity</span>
                  <span className="text-sm font-semibold text-white">
                    {dock.available}/{dock.total} slots
                  </span>
                </div>
                <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden border border-white/20">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(dock.available / dock.total) * 100}%`,
                      backgroundColor: getCapacityColor(dock.available, dock.total),
                      boxShadow: `0 0 10px ${getCapacityColor(dock.available, dock.total)}`,
                    }}
                  />
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Available</p>
                  <p className="text-xl font-bold text-[#00FFA3] mt-1">{dock.available}</p>
                </div>
                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Charging</p>
                  <p className="text-xl font-bold text-[#F59E0B] mt-1">{dock.charging}</p>
                </div>
                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Distance</p>
                  <p className="text-xl font-bold text-[#00D4FF] mt-1">{dock.distance.toFixed(2)} km</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button className="flex-1 py-2 px-4 rounded-lg bg-[#00FFA3]/20 text-[#00FFA3] text-sm font-medium hover:bg-[#00FFA3]/30 transition-colors flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  Navigate
                </button>
                <button className="flex-1 py-2 px-4 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/15 transition-colors flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Details
                </button>
              </div>
            </div>
          ))}

          {filteredDocks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <svg className="w-16 h-16 text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-slate-400 text-center">
                No docking stations match your filters. <br />
                Try adjusting your search criteria.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
