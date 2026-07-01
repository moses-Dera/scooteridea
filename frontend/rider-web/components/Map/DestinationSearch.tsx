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
  const [isSearching, setIsSearching] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const pathname = usePathname();

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/places/autocomplete?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        
        if (data.predictions) {
          const formattedResults = data.predictions.map((p: any) => ({
            id: p.place_id,
            place_name: p.description
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
        const { lat, lng } = data.result.geometry.location;
        // Show destination preview instead of instantly navigating
        router.push(`?destination=true&lat=${lat}&lng=${lng}&name=${encodeURIComponent(result.place_name.split(',')[0])}`);
        setIsExpanded(false);
        setQuery('');
      } else {
        console.error("No geometry found for place");
      }
    } catch (e) {
      console.error("Failed to get location details", e);
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

      {results.length > 0 && (
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
                <div className="text-white text-sm font-semibold truncate">{result.place_name.split(',')[0]}</div>
                <div className="text-slate-400 text-xs truncate mt-0.5">{result.place_name.split(',').slice(1).join(',')}</div>
              </div>
            </button>
          ))}
        </div>
      )}
      
      {isSearching && query && (
        <div className="text-center text-slate-400 text-sm py-4 animate-pulse">Searching...</div>
      )}
    </div>
  );
}
