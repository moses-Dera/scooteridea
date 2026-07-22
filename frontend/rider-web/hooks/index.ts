'use client';

import { useState, useEffect } from 'react';
import { dockApi, bikeApi, rideApi, userApi } from '@/lib/api';
import type { Dock, Bike, Ride, UserProfile } from '@/lib/types';

// ============================================================================
// useDocks Hook
// ============================================================================

interface UseDocks {
  docks: Dock[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useDocks(latitude?: number, longitude?: number): UseDocks {
  const [docks, setDocks] = useState<Dock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocks = async () => {
    try {
      setLoading(true);
      setError(null);

      let response;
      if (latitude && longitude) {
        response = await dockApi.nearest(latitude, longitude, 20);
      } else {
        response = await dockApi.list();
      }

      setDocks((response.data as Dock[]) || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch docks';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocks();
  }, [latitude, longitude]);

  return { docks, loading, error, refetch: fetchDocks };
}

// ============================================================================
// useBikes Hook
// ============================================================================

interface UseBikes {
  bikes: Bike[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useBikes(latitude?: number, longitude?: number): UseBikes {
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBikes = async () => {
    try {
      setLoading(true);
      setError(null);

      let response;
      if (latitude && longitude) {
        response = await bikeApi.nearest(latitude, longitude, 20);
      } else {
        response = await bikeApi.list();
      }

      setBikes((response.data as Bike[]) || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch bikes';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBikes();
  }, [latitude, longitude]);

  return { bikes, loading, error, refetch: fetchBikes };
}

// ============================================================================
// useRideHistory Hook
// ============================================================================

interface UseRideHistory {
  rides: Ride[];
  loading: boolean;
  error: string | null;
  page: number;
  hasMore: boolean;
  nextPage: () => Promise<void>;
  prevPage: () => Promise<void>;
}

export function useRideHistory(): UseRideHistory {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchRides = async (pageNum: number) => {
    try {
      setLoading(true);
      setError(null);

      const response = await rideApi.getHistory(pageNum, 20);

      const responseData = response.data as any;
      setRides(Array.isArray(responseData) ? responseData : responseData?.items || []);
      setHasMore(response.pagination?.hasMore ?? false);
      setPage(pageNum);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch ride history';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRides(1);
  }, []);

  const nextPage = async () => {
    if (hasMore) {
      await fetchRides(page + 1);
    }
  };

  const prevPage = async () => {
    if (page > 1) {
      await fetchRides(page - 1);
    }
  };

  return { rides, loading, error, page, hasMore, nextPage, prevPage };
}

// ============================================================================
// useProfile Hook
// ============================================================================

interface UseProfile {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useProfile(): UseProfile {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const response: any = await userApi.getProfile();
      setProfile((response.data?.data as UserProfile) || null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch profile';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  return { profile, loading, error, refetch: fetchProfile };
}

// ============================================================================
// useWallet Hook
// ============================================================================

interface UseWallet {
  balance: number;
  loading: boolean;
  error: string | null;
  topUp: (amount: number, paymentMethodId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useWallet(): UseWallet {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWallet = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await userApi.getWallet();
      setBalance((response.data as any)?.balance || 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch wallet';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const topUp = async (amount: number, paymentMethodId: string) => {
    try {
      setError(null);
      await userApi.topUp(amount, paymentMethodId);
      await fetchWallet();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Top-up failed';
      setError(message);
      throw err;
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  return { balance, loading, error, topUp, refetch: fetchWallet };
}
