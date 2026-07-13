import { rideApi } from './api';
import { Ride, PaginatedResponse, ApiResponse } from './types';

// ============================================================================
// Ride Service - Wrapper around rideApi with business logic
// ============================================================================

export const ridesService = {
  /**
   * Reserve a bike for a ride
   * @param bikeId - The bike to reserve
   * @param startDockId - The dock where bike is located
   * @returns The reserved ride object
   */
  async reserve(bikeId: string, startDockId?: string): Promise<Ride> {
    const response = (await rideApi.reserve(bikeId, startDockId)) as ApiResponse<Ride>;
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to reserve bike');
    }
    return response.data;
  },

  /**
   * Start a reserved ride
   * @param rideId - The ride ID to start
   * @returns Confirmation message
   */
  async startRide(rideId: string): Promise<void> {
    const response = (await rideApi.start(rideId)) as ApiResponse<any>;
    if (!response.success) {
      throw new Error(response.error || 'Failed to start ride');
    }
  },

  /**
   * End an active ride at a dock
   * @param rideId - The ride ID to end
   * @param endDockId - The dock where bike is being returned
   * @param latitude - Current latitude
   * @param longitude - Current longitude
   * @returns The completed ride object
   */
  async endRide(
    rideId: string,
    endDockId: string,
    latitude: number,
    longitude: number,
  ): Promise<Ride> {
    const response = (await rideApi.end(
      rideId,
      endDockId,
      latitude,
      longitude,
    )) as ApiResponse<Ride>;
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to end ride');
    }
    return response.data;
  },

  /**
   * Get ride history with pagination
   * @param page - Page number (1-indexed)
   * @param limit - Records per page
   * @returns Paginated ride history
   */
  async getHistory(page = 1, limit = 20): Promise<PaginatedResponse<Ride>> {
    const response = (await rideApi.getHistory(page, limit)) as PaginatedResponse<Ride>;
    if (!response.success) {
      throw new Error('Failed to fetch ride history');
    }
    return response;
  },

  /**
   * Get a specific ride by ID
   * @param id - The ride ID
   * @returns The ride object
   */
  async getById(id: string): Promise<Ride> {
    const response = (await rideApi.getById(id)) as ApiResponse<Ride>;
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch ride');
    }
    return response.data;
  },

  /**
   * Dispute a completed ride
   * @param id - The ride ID
   * @param reason - Reason for dispute
   * @returns The updated ride with dispute
   */
  async disputeRide(id: string, reason: string): Promise<Ride> {
    const response = (await rideApi.dispute(id, reason)) as ApiResponse<Ride>;
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to submit dispute');
    }
    return response.data;
  },

  /**
   * Calculate cost for elapsed time
   * @param durationSeconds - Duration in seconds
   * @param ratePerMinute - Rate per minute
   * @param surgeMultiplier - Surge pricing multiplier
   * @returns Total cost
   */
  calculateCost(
    durationSeconds: number,
    ratePerMinute: number = 50,
    surgeMultiplier: number = 1,
  ): number {
    const minutes = durationSeconds / 60;
    return parseFloat((minutes * ratePerMinute * surgeMultiplier).toFixed(2));
  },

  /**
   * Format elapsed time as HH:MM:SS
   * @param seconds - Total seconds elapsed
   * @returns Formatted time string
   */
  formatElapsedTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const pad = (num: number) => String(num).padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
  },

  /**
   * Calculate distance between two coordinates using Haversine formula
   * @param lat1 - Start latitude
   * @param lon1 - Start longitude
   * @param lat2 - End latitude
   * @param lon2 - End longitude
   * @returns Distance in kilometers
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
    const distance = R * c;

    return parseFloat(distance.toFixed(2));
  },
};
