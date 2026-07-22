'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Search, MapPin, X } from 'lucide-react';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.dummy_token';

interface SearchResult {
  id: string; // place_id
  place_name: string; // description
}

export function DestinationSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const pathname = usePathname();

  // Get rough location for search biasing (resolves instantly if map already has permission)
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.warn('Could not get location for search bias', err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    }
  }, []);

  // Load recent searches from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('scooterfy_recent_searches');
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load recent searches', e);
    }
  }, []);

  const saveRecentSearch = (result: SearchResult) => {
    try {
      setRecentSearches((prev) => {
        // Remove duplicate if exists, then prepend
        const filtered = prev.filter((r) => r.id !== result.id);
        const newRecent = [result, ...filtered].slice(0, 5); // Keep last 5
        localStorage.setItem('scooterfy_recent_searches', JSON.stringify(newRecent));
        return newRecent;
      });
    } catch (e) {
      console.error('Failed to save recent search', e);
    }
  };

  const removeRecentSearch = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // prevent clicking the item
    setRecentSearches((prev) => {
      const newRecent = prev.filter((r) => r.id !== id);
      localStorage.setItem('scooterfy_recent_searches', JSON.stringify(newRecent));
      return newRecent;
    });
  };

  const clearAllHistory = () => {
    setRecentSearches([]);
    localStorage.removeItem('scooterfy_recent_searches');
  };

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        let url = `/api/places/autocomplete?q=${encodeURIComponent(query)}`;
        if (userLocation) {
          url += `&lat=${userLocation.lat}&lng=${userLocation.lng}`;
        }
        const res = await fetch(url);
        const data = await res.json();

        if (data.predictions) {
          const formattedResults = data.predictions.map((p: any) => ({
            id: p.place_id,
            place_name: p.description,
          }));
          setResults(formattedResults);
        } else {
          setResults([]);
        }
      } catch (err) {
        console.error('Geocoding error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = async (result: SearchResult) => {
    setIsSearching(true);
    try {
      // Fetch the exact coordinates for the selected place
      const res = await fetch(`/api/places/details?place_id=${result.id}`);
      const data = await res.json();

      if (data.result?.geometry?.location) {
        saveRecentSearch(result); // Save to history when successfully clicked

        const { lat, lng } = data.result.geometry.location;
        // Show destination preview instead of instantly navigating
        router.push(
          `?destination=true&lat=${lat}&lng=${lng}&name=${encodeURIComponent(result.place_name.split(',')[0])}`,
        );
        setIsExpanded(false);
        setQuery('');
      } else {
        console.error('No geometry found for place');
      }
    } catch (e) {
      console.error('Failed to get location details', e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClear = () => {
    router.push(pathname || '/'); // Clear navigation params
    setIsExpanded(false);
    setQuery('');
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="glass-panel flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-300 hover:text-white transition-all shadow-xl hover:shadow-primary/10 border border-white/5 w-full md:w-80"
      >
        <Search className="w-5 h-5 text-primary" />
        <span className="font-semibold text-sm">Where to?</span>
      </button>
    );
  }

  return (
    <div className="glass-panel rounded-2xl p-4 shadow-2xl flex flex-col gap-3 w-full md:w-96 border border-white/10 relative z-50">
      <div className="flex items-center gap-3 bg-[#0A0D14] rounded-xl px-4 py-3 border border-white/5">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search destination..."
          className="bg-transparent border-none outline-none text-white w-full placeholder:text-slate-500 font-medium"
        />
        <button onClick={handleClear} className="text-slate-400 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Search Results */}
      {query && results.length > 0 && (
        <div className="flex flex-col gap-1 mt-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
          {results.map((result) => (
            <button
              key={result.id}
              onClick={() => handleSelect(result)}
              className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-left group"
            >
              <div className="w-8 h-8 rounded-full bg-[#111622] flex items-center justify-center shrink-0 border border-white/5 group-hover:border-primary/30 transition-colors">
                <MapPin className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-semibold truncate">
                  {result.place_name.split(',')[0]}
                </div>
                <div className="text-slate-400 text-xs truncate mt-0.5">
                  {result.place_name.split(',').slice(1).join(',')}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Recent Searches (Show when no query) */}
      {!query && recentSearches.length > 0 && (
        <div className="flex flex-col gap-1 mt-2">
          <div className="flex items-center justify-between px-2 mb-1">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">
              Recent Searches
            </span>
            <button
              onClick={clearAllHistory}
              className="text-slate-500 hover:text-red-400 text-xs font-medium transition-colors"
            >
              Clear All
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-1">
            {recentSearches.map((result) => (
              <div
                key={result.id}
                onClick={() => handleSelect(result)}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group cursor-pointer"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#111622] flex items-center justify-center shrink-0 border border-white/5 group-hover:border-slate-500/50 transition-colors">
                    <svg
                      className="w-4 h-4 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-slate-200 text-sm font-medium truncate">
                      {result.place_name.split(',')[0]}
                    </div>
                    <div className="text-slate-500 text-xs truncate mt-0.5">
                      {result.place_name.split(',').slice(1).join(',')}
                    </div>
                  </div>
                </div>
                <button
                  onClick={(e) => removeRecentSearch(e, result.id)}
                  className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {isSearching && query && (
        <div className="text-center text-slate-400 text-sm py-4 animate-pulse">Searching...</div>
      )}
    </div>
  );
}
