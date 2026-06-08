// ─────────────────────────────────────────────
//  Shared TypeScript Types — E-Bike Platform
// ─────────────────────────────────────────────

// ── Enums ────────────────────────────────────

export type UserRole = 'RIDER' | 'OPERATOR' | 'ADMIN';

export type BikeStatus =
  | 'available'
  | 'in_use'
  | 'charging'
  | 'maintenance'
  | 'offline';

export type RideStatus =
  | 'RESERVED'
  | 'ACTIVE'
  | 'COMPLETING'
  | 'COMPLETED'
  | 'CANCELLED';

export type PaymentStatus = 'pending' | 'success' | 'failed' | 'refunded';

export type PaymentProvider = 'stripe' | 'paystack';

export type ZoneType = 'operational' | 'slow' | 'no_ride' | 'dock';

export type BikeCommand =
  | 'LOCK'
  | 'UNLOCK'
  | 'ALARM'
  | 'DISABLE'
  | 'SPEED_LIMIT';

export type UnlockMethod = 'remote' | 'qr' | 'nfc' | 'otp';

// ── Geo ──────────────────────────────────────

export interface LatLng {
  lat: number;
  lng: number;
}

// ── Auth ─────────────────────────────────────

export interface JwtPayload {
  sub: string;   // user id
  role: UserRole;
  jti: string;
  iat: number;
  exp: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

// ── Users ────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  walletCents: number;
  createdAt: Date;
}

// ── Bikes ────────────────────────────────────

export interface Bike {
  id: string;
  status: BikeStatus;
  batteryPct: number;
  location: LatLng;
  dockId?: string;
  lastSeen: Date;
}

export interface BikeTelemetryPayload {
  lat: number;
  lng: number;
  battery_pct: number;
  speed_kmh: number;
  lock_status: 'LOCKED' | 'UNLOCKED';
  docked_at: string | null;
}

export interface BikeCommandPayload {
  command: BikeCommand;
  rideId?: string;
  reason?: string;
  value?: number;   // for SPEED_LIMIT
  ts: number;
}

// ── Docks ────────────────────────────────────

export interface DockSlot {
  slot: number;
  bikeId: string | null;
  charging: boolean;
}

export interface Dock {
  id: string;
  name: string;
  location: LatLng;
  totalSlots: number;
  availableSlots: number;
  slots?: DockSlot[];
}

export interface DockTelemetryPayload {
  slots: DockSlot[];
  available_slots: number;
  total_slots: number;
}

// ── Rides ────────────────────────────────────

export interface Ride {
  id: string;
  userId: string;
  bikeId: string;
  startDockId?: string;
  endDockId?: string;
  status: RideStatus;
  startLocation?: LatLng;
  endLocation?: LatLng;
  startedAt?: Date;
  endedAt?: Date;
  fareCents?: number;
  distanceKm?: number;
  surgeMult: number;
  createdAt: Date;
}

export interface RidePage {
  items: Ride[];
  total: number;
  page: number;
  pageSize: number;
}

export interface StartRideDto {
  rideId: string;
}

export interface EndRideDto {
  dockId: string;
}

// ── Matching ─────────────────────────────────

export interface MatchRequest {
  lat: number;
  lng: number;
  radiusKm?: number;
}

export interface MatchResult {
  bikeId: string;
  distanceKm: number;
  batteryPct: number;
  score: number;
  rideId: string;   // pre-reserved ride record
}

// ── Pricing ──────────────────────────────────

export interface Surge {
  geohash: string;
  multiplier: number;
  updatedAt: Date;
}

export interface FareEstimate {
  baseFare: number;
  perMinute: number;
  perKm: number;
  surgeMult: number;
  estimatedFareCents: number;
  estimatedDurationMin: number;
  estimatedDistanceKm: number;
}

// ── Payments ─────────────────────────────────

export interface Payment {
  id: string;
  userId: string;
  rideId?: string;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  provider: PaymentProvider;
  providerRef?: string;
  createdAt: Date;
}

export interface WalletTopUpDto {
  amountCents: number;
  provider: PaymentProvider;
}

// ── Geofences ────────────────────────────────

export interface Geofence {
  id: string;
  name: string;
  type: ZoneType;
  boundary: GeoJSON.Polygon;
  speedCap?: number;   // km/h, only for 'slow' zones
}

// ── Kafka Events ─────────────────────────────

export interface KafkaFleetTelemetryEvent {
  bikeId: string;
  lat: number;
  lng: number;
  batteryPct: number;
  status: BikeStatus;
  ts: number;
}

export interface KafkaDockStatusEvent {
  dockId: string;
  availableSlots: number;
  totalSlots: number;
  ts: number;
}

export interface KafkaRideStartedEvent {
  rideId: string;
  bikeId: string;
  userId: string;
  ts: number;
}

export interface KafkaRideEndedEvent {
  rideId: string;
  fareCents: number;
  userId: string;
  ts: number;
}

export interface KafkaPaymentChargeEvent {
  userId: string;
  amount: number;
  rideId: string;
  ts: number;
}

export interface KafkaPaymentResultEvent {
  rideId: string;
  status: PaymentStatus;
  ts: number;
}

export interface KafkaOpsAlertEvent {
  type:
    | 'DOCK_FULL'
    | 'DOCK_EMPTY'
    | 'ZONE_VIOLATION'
    | 'LOW_BATTERY'
    | 'BIKE_OFFLINE';
  bikeId?: string;
  dockId?: string;
  lat?: number;
  lng?: number;
  ts: number;
}

export interface KafkaFleetCommandEvent {
  bikeId: string;
  command: BikeCommand;
  value?: number;
  ts: number;
}

// ── WebSocket Messages ────────────────────────

export interface WsSubscribeMessage {
  subscribe: string[];   // e.g. ['bike:BK-001', 'fleet:all', 'dock:DOCK-007']
}

export interface WsBikeLocationUpdate {
  event: 'bike_location_update';
  bikeId: string;
  lat: number;
  lng: number;
  battery: number;
  status: BikeStatus;
}

export interface WsDockStatusUpdate {
  event: 'dock_status_update';
  dockId: string;
  availableSlots: number;
}

export interface WsSurgeUpdate {
  event: 'surge_update';
  geohash: string;
  multiplier: number;
}

export interface WsRideEndedEvent {
  event:     'ride_ended';
  rideId:    string;
  userId:    string;
  fareCents: number;
}

export type WsServerEvent =
  | WsBikeLocationUpdate
  | WsDockStatusUpdate
  | WsSurgeUpdate
  | WsRideEndedEvent;

// ── API Responses ────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
