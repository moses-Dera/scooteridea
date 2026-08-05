'use client';

import React, { createContext, useReducer, ReactNode, useCallback, useContext, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Ride } from '@/lib/types';

// ============================================================================
// Types
// ============================================================================

export interface RideState {
  activeRide: Ride | null;
  isLoading: boolean;
  error: string | null;
  elapsedSeconds: number;
  cost: number;
  nearestDock: { id: string; name: string; distance: number } | null;
}

export type RideAction =
  | { type: 'SET_ACTIVE_RIDE'; payload: Ride }
  | { type: 'CLEAR_ACTIVE_RIDE' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'UPDATE_TIMER'; payload: number }
  | { type: 'UPDATE_COST'; payload: number }
  | { type: 'UPDATE_NEAREST_DOCK'; payload: { id: string; name: string; distance: number } | null }
  | { type: 'RESET' };

// ============================================================================
// Initial State
// ============================================================================

const initialState: RideState = {
  activeRide: null,
  isLoading: false,
  error: null,
  elapsedSeconds: 0,
  cost: 0,
  nearestDock: null,
};

// ============================================================================
// Reducer
// ============================================================================

function rideReducer(state: RideState, action: RideAction): RideState {
  switch (action.type) {
    case 'SET_ACTIVE_RIDE': {
      let initialElapsed = 0;
      let initialCost = 0;
      if (action.payload?.startedAt) {
        initialElapsed = Math.floor((Date.now() - new Date(action.payload.startedAt).getTime()) / 1000);
        // Base rate = 50, per minute = 50. Calculate initial cost matching backend.
        const minutes = initialElapsed / 60;
        initialCost = Math.max(50, (50 + minutes * 50) * (action.payload.surgeMultiplier || 1));
      }
      return {
        ...state,
        activeRide: action.payload,
        elapsedSeconds: Math.max(0, initialElapsed),
        cost: initialCost,
        error: null,
      };
    }

    case 'CLEAR_ACTIVE_RIDE':
      return {
        ...state,
        activeRide: null,
        elapsedSeconds: 0,
        cost: 0,
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    case 'UPDATE_TIMER':
      return {
        ...state,
        elapsedSeconds: action.payload,
      };

    case 'UPDATE_COST':
      return {
        ...state,
        cost: action.payload,
      };

    case 'UPDATE_NEAREST_DOCK':
      return {
        ...state,
        nearestDock: action.payload,
      };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

// ============================================================================
// Context
// ============================================================================

export interface RideContextType {
  state: RideState;
  dispatch: React.Dispatch<RideAction>;
  setActiveRide: (ride: Ride) => void;
  clearActiveRide: () => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  updateTimer: (seconds: number) => void;
  updateCost: (cost: number) => void;
  updateNearestDock: (dock: { id: string; name: string; distance: number } | null) => void;
  reset: () => void;
}

export const RideContext = createContext<RideContextType | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

interface RideProviderProps {
  children: ReactNode;
}

export function RideProvider({ children }: RideProviderProps) {
  const [state, dispatch] = useReducer(rideReducer, initialState);
  const { status } = useSession();

  const setActiveRide = useCallback((ride: Ride) => {
    dispatch({ type: 'SET_ACTIVE_RIDE', payload: ride });
  }, []);

  const clearActiveRide = useCallback(() => {
    dispatch({ type: 'CLEAR_ACTIVE_RIDE' });
  }, []);

  const setLoading = useCallback((isLoading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: isLoading });
  }, []);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  const updateTimer = useCallback((seconds: number) => {
    dispatch({ type: 'UPDATE_TIMER', payload: seconds });
  }, []);

  const updateCost = useCallback((cost: number) => {
    dispatch({ type: 'UPDATE_COST', payload: cost });
  }, []);

  const updateNearestDock = useCallback(
    (dock: { id: string; name: string; distance: number } | null) => {
      dispatch({ type: 'UPDATE_NEAREST_DOCK', payload: dock });
    },
    [],
  );

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const value: RideContextType = {
    state,
    dispatch,
    setActiveRide,
    clearActiveRide,
    setLoading,
    setError,
    updateTimer,
    updateCost,
    updateNearestDock,
    reset,
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/proxy/rides/active')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data) {
            setActiveRide(data.data);
          }
        })
        .catch((err) => console.error('Failed to fetch active ride:', err));
    }
  }, [status, setActiveRide]);

  return <RideContext.Provider value={value}>{children}</RideContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

export function useRide(): RideContextType {
  const context = useContext(RideContext);
  if (!context) {
    throw new Error('useRide must be used within RideProvider');
  }
  return context;
}
