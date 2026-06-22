// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
  };
}

// ============================================================================
// Auth Types
// ============================================================================

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  createdAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

// ============================================================================
// Dock Types
// ============================================================================

export interface Dock {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  totalSlots: number;
  availableSlots: number;
  chargingBikes: number;
  operational: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DockStatus {
  id: string;
  availableSlots: number;
  chargingBikes: number;
  occupiedSlots: number;
  maintenanceSlots: number;
  lastUpdate: string;
}

// ============================================================================
// Bike Types
// ============================================================================

export interface Bike {
  id: string;
  bikeNumber: string;
  dockId?: string;
  latitude?: number;
  longitude?: number;
  batteryLevel: number;
  status: 'available' | 'in_use' | 'maintenance' | 'charging';
  lastUpdated: string;
}

export interface BikeDetail extends Bike {
  model: string;
  serial: string;
  color: string;
  weight: number;
  maintenanceHistory: MaintenanceRecord[];
}

export interface MaintenanceRecord {
  id: string;
  bikeId: string;
  issue: string;
  resolved: boolean;
  date: string;
  notes?: string;
}

// ============================================================================
// Ride Types
// ============================================================================

export interface Ride {
  id: string;
  userId: string;
  bikeId: string;
  startDockId: string;
  endDockId?: string;
  startTime: string;
  endTime?: string;
  startLatitude: number;
  startLongitude: number;
  endLatitude?: number;
  endLongitude?: number;
  distance: number; // in km
  duration: number; // in seconds
  fare: number; // in local currency
  surgeMultiplier: number;
  status: 'active' | 'completed' | 'cancelled';
  routeGeometry?: string; // GeoJSON
  rating?: number;
  feedback?: string;
  dispute?: RideDispute;
}

export interface RideDispute {
  id: string;
  rideId: string;
  reason: string;
  status: 'pending' | 'resolved' | 'rejected';
  resolution?: string;
  createdAt: string;
}

export interface RideEstimate {
  distance: number;
  estimatedDuration: number;
  basefare: number;
  surgeMultiplier: number;
  estimatedFare: number;
}

export interface RideHistory {
  rides: Ride[];
  stats: {
    totalRides: number;
    totalDistance: number;
    totalDuration: number;
    averageRating: number;
    totalSpent: number;
  };
}

// ============================================================================
// User Types
// ============================================================================

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  verified: boolean;
  status: 'active' | 'suspended' | 'banned';
  balance: number;
  wallet: {
    current: number;
    totalSpent: number;
    totalEarned?: number;
  };
  settings: {
    notifications: boolean;
    marketing: boolean;
    language: string;
    theme: 'light' | 'dark';
  };
  createdAt: string;
  updatedAt: string;
}

export interface UserStats {
  totalRides: number;
  totalDistance: number;
  totalDuration: number;
  averageRating: number;
  co2Saved: number;
}

// ============================================================================
// Payment Types
// ============================================================================

export interface PaymentMethod {
  id: string;
  type: 'card' | 'wallet' | 'bank_transfer';
  isDefault: boolean;
  lastFour?: string;
  expiryDate?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: 'debit' | 'credit';
  description: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
}

export interface TopUpRequest {
  amount: number;
  paymentMethodId: string;
}

// ============================================================================
// Pricing Types
// ============================================================================

export interface PricingInfo {
  baseRate: number;
  perMinuteRate: number;
  surgeMultiplier: number;
  zone: string;
}

// ============================================================================
// WebSocket Types
// ============================================================================

export interface WebSocketMessage<T = any> {
  type: string;
  payload: T;
  timestamp: number;
}

export interface LiveDockUpdate {
  dockId: string;
  availableSlots: number;
  chargingBikes: number;
}

export interface LiveBikeUpdate {
  bikeId: string;
  latitude: number;
  longitude: number;
  batteryLevel: number;
  status: string;
}

export interface LiveRideUpdate {
  rideId: string;
  latitude: number;
  longitude: number;
  elapsed: number;
  cost: number;
  nearestDock: {
    id: string;
    name: string;
    distance: number;
  };
}

// ============================================================================
// Error Types
// ============================================================================

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ============================================================================
// Query Parameters
// ============================================================================

export interface DockQuery {
  latitude?: number;
  longitude?: number;
  limit?: number;
  offset?: number;
}

export interface RideHistoryQuery {
  page?: number;
  limit?: number;
  status?: 'completed' | 'cancelled' | 'active';
  fromDate?: string;
  toDate?: string;
}

export interface BikeQuery {
  latitude?: number;
  longitude?: number;
  limit?: number;
  status?: 'available' | 'in_use' | 'maintenance';
}
