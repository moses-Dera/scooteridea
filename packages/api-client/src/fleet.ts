import apiClient from './client';

export interface GeoLocation {
  lat: number;
  lng: number;
}

export interface Bike {
  id: string;
  batteryLevel: number;
  status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE';
  location: GeoLocation;
  surgeMultiplier: number;
}

export const fleetApi = {
  /**
   * Fetches all available bikes near a specific location
   */
  getNearbyBikes: async (lat: number, lng: number, radiusKm: number = 2): Promise<Bike[]> => {
    const { data } = await apiClient.get<Bike[]>('/api/fleet/nearby', {
      params: { lat, lng, radius: radiusKm },
    });
    return data;
  },

  /**
   * Fetches the complete fleet snapshot (operator dashboard)
   */
  getAllBikes: async (): Promise<Bike[]> => {
    const { data } = await apiClient.get<{ success: boolean; data: Bike[] }>('/api/fleet/bikes');
    return data.data;
  },

  /**
   * Unlocks a specific bike to start a ride
   */
  unlockBike: async (bikeId: string): Promise<{ rideId: string; status: string }> => {
    const { data } = await apiClient.post('/api/ride/unlock', { bikeId });
    return data;
  },
};
