import { create } from 'zustand';

interface RideState {
  activeRide: null | {
    id: string;
    bikeId: string;
    startTime: number;
    cost: number;
    surge: number;
  };
  startRide: (bikeId: string, surge: number) => void;
  endRide: () => void;
  updateCost: (cost: number) => void;
}

export const useRideStore = create<RideState>((set) => ({
  activeRide: null,

  startRide: (bikeId, surge) =>
    set({
      activeRide: {
        id: `ride-${Date.now()}`,
        bikeId,
        startTime: Date.now(),
        cost: 0,
        surge,
      },
    }),

  endRide: () => set({ activeRide: null }),

  updateCost: (cost) =>
    set((state) => ({
      activeRide: state.activeRide ? { ...state.activeRide, cost } : null,
    })),
}));
