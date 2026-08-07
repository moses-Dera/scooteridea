'use client';

import { useEffect, useState } from 'react';
import { ridesService } from '@/lib/ridesService';
import { Ride, PaginatedResponse } from '@/lib/types';
import { Bike, Star } from 'lucide-react';
import Link from 'next/link';

export function RideHistoryComponent() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    const fetchRides = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await ridesService.getHistory(page, 10);
        setRides(response.data);
        setHasMore(response.pagination.hasMore);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load ride history';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRides();
  }, [page]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-slate-400">Loading your rides...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-danger/10 border border-danger/20 rounded-2xl p-6 text-center">
        <p className="text-danger font-medium mb-4">{error}</p>
        <button
          onClick={() => setPage(1)}
          className="px-6 py-2 bg-danger/20 hover:bg-danger/30 transition-colors rounded-lg text-danger font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (rides.length === 0) {
    return (
      <div className="bg-surfaceLight border border-white/10 rounded-2xl p-12 text-center">
        <Bike className="w-12 h-12 mx-auto mb-4 text-white" />
        <div className="text-xl font-bold text-white mb-2">No Rides Yet</div>
        <p className="text-slate-400 mb-6">Start your first ride to see history here</p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-colors"
        >
          Find a Bike
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Rides Grid */}
      <div className="grid gap-4 mb-8">
        {rides.map((ride) => (
          <RideCard key={ride.id} ride={ride} />
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="px-6 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
        >
          ← Previous
        </button>

        <span className="text-slate-400">Page {page}</span>

        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={!hasMore}
          className="px-6 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

interface RideCardProps {
  ride: Ride;
}

function RideCard({ ride }: RideCardProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const duration = ride.duration / 60;
  const distance = ride.distance || 0;

  return (
    <div className="bg-surfaceLight border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
            <Bike className="w-6 h-6 text-primary" />
          </div>
          <div>
            <div className="font-bold text-white">{ride.bikeId}</div>
            <p className="text-sm text-slate-400">{formatDate(ride.startedAt)}</p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xl font-bold text-primary">₦ {ride.fare.toFixed(2)}</div>
          <div
            className={`text-xs font-medium px-2 py-1 rounded-md ${
              ride.status === 'completed'
                ? 'bg-primary/20 text-primary'
                : 'bg-warning/20 text-warning'
            }`}
          >
            {ride.status}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 pb-4 border-b border-white/10 mb-4">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Duration</p>
          <p className="font-bold text-white">{duration.toFixed(1)} min</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Distance</p>
          <p className="font-bold text-white">{distance.toFixed(1)} km</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Surge</p>
          <p className="font-bold text-white">{ride.surgeMultiplier}x</p>
        </div>
      </div>

      {ride.rating && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">Rating:</span>
          <div className="flex text-yellow-500">
            {Array.from({ length: ride.rating }).map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-current" />
            ))}
          </div>
        </div>
      )}

      {ride.dispute && (
        <div className="mt-3 p-3 bg-warning/10 border border-warning/20 rounded-lg">
          <p className="text-sm text-warning font-medium">Dispute: {ride.dispute.reason}</p>
        </div>
      )}

      <div className="flex gap-2 mt-4">
        <Link
          href={`/ride/receipt/${ride.id}`}
          className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 transition-colors rounded-lg text-white text-sm font-medium text-center"
        >
          View Receipt
        </Link>
        {!ride.dispute && ride.status === 'completed' && (
          <button className="flex-1 px-4 py-2 border border-warning/20 hover:border-warning/40 transition-colors rounded-lg text-warning text-sm font-medium">
            Dispute
          </button>
        )}
      </div>
    </div>
  );
}
