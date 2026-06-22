# Ride Booking Flow Implementation Guide

## Overview

This document describes the complete ride booking system that has been implemented for the VoltRide e-bike sharing platform. The system handles the entire ride lifecycle from bike selection to payment and history tracking.

## Architecture

### Technology Stack
- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Authentication**: NextAuth.js with HTTPOnly cookies + BFF proxy
- **State Management**: React Context + useReducer
- **API Communication**: Axios through BFF proxy at `/api/proxy`
- **Real-time Features**: Client-side timers, browser Geolocation API

### System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     RIDE BOOKING FLOW                           │
└─────────────────────────────────────────────────────────────────┘

1. BIKE SELECTION
   └─ User browses bikes at `/bike`
   └─ Selects bike → navigates to `/bike/[id]`
   └─ Views bike details (battery, nearest docks, fare estimate)

2. RESERVATION
   └─ Click "Unlock This Bike" button
   └─ Calls ridesService.reserve(bikeId, startDockId)
   └─ Backend returns Ride object
   └─ RideContext stores active ride
   └─ Navigate to `/unlock/[bikeId]`

3. UNLOCK & START
   └─ Shows 3-step unlock modal
   └─ Step 1: Confirm ride details and cost
   └─ Step 2: Choose unlock method (app, QR, NFC)
   └─ Click "Unlock via App" 
   └─ Calls ridesService.startRide(rideId)
   └─ Backend starts ride tracking
   └─ Navigate to `/ride/active`

4. ACTIVE RIDE TRACKING
   └─ Shows full-screen map with bike location
   └─ Real-time timer (HH:MM:SS)
   └─ Cost calculation: minutes × rate × surge
   └─ Nearest dock suggestions
   └─ Pause/Report issue buttons

5. END RIDE
   └─ Click "End Ride" button
   └─ Gets user geolocation via Geolocation API
   └─ Calls ridesService.endRide(rideId, dockId, lat, lng)
   └─ Backend calculates final cost
   └─ Deducts from wallet
   └─ Navigate to `/ride/receipt/[rideId]`

6. RECEIPT & CONFIRMATION
   └─ Shows ride summary with cost breakdown
   └─ Duration, distance, surge pricing details
   └─ Total fare deducted from wallet
   └─ Options: Back to map, Rate ride, Report issue

7. RIDE HISTORY
   └─ User can view `/ride/history`
   └─ Lists all completed rides with pagination
   └─ Shows bike ID, duration, distance, cost, status
   └─ Can view receipt or dispute ride
```

## Core Components

### 1. RideContext (`context/RideContext.tsx`)
**Purpose**: Global state management for active rides

**State Properties**:
- `activeRide: Ride | null` - Currently active ride object
- `isLoading: boolean` - API call in progress
- `error: string | null` - Error messages
- `elapsedSeconds: number` - Time elapsed in ride
- `cost: number` - Calculated fare cost
- `nearestDock: {id, name, distance} | null` - Closest dock info

**Actions**:
- `setActiveRide(ride)` - Start tracking a new ride
- `clearActiveRide()` - Clear active ride after completion
- `setLoading(bool)` - Toggle loading state
- `setError(msg)` - Set error messages
- `updateTimer(seconds)` - Update elapsed time
- `updateCost(amount)` - Update fare cost
- `updateNearestDock(dock)` - Update nearest dock

### 2. RideTimer Component (`components/rides/RideTimer.tsx`)
**Purpose**: Display real-time ride tracking

**Features**:
- Updates every second while ride is active
- Shows HH:MM:SS format
- Calculates cost in real-time
- Factors in surge pricing
- Handles errors gracefully

**Props**:
```typescript
interface RideTimerProps {
  surgeMultiplier?: number;  // Pricing multiplier (default 1)
  baseRate?: number;         // Rate per minute in currency (default 50)
}
```

### 3. RideHistoryComponent (`components/bikes/RideHistory.tsx`)
**Purpose**: Display paginated ride history

**Features**:
- Fetches rides from backend with pagination
- Shows 10 rides per page
- Displays ride statistics (duration, distance, cost)
- Status badges (completed, cancelled)
- View receipt and dispute buttons
- Empty state messaging
- Error handling with retry

## Core Services

### RidesService (`lib/ridesService.ts`)
Wrapper around API endpoints with business logic

```typescript
// Reserve a bike for ride
reserve(bikeId, startDockId) → Ride

// Start a reserved ride (unlock bike)
startRide(rideId) → void

// End active ride at dock
endRide(rideId, endDockId, latitude, longitude) → Ride

// Fetch ride history with pagination
getHistory(page, limit) → PaginatedResponse<Ride>

// Get specific ride by ID
getById(id) → Ride

// Submit dispute for completed ride
disputeRide(id, reason) → Ride

// Calculate cost for duration
calculateCost(seconds, ratePerMin, surgeMultiplier) → number

// Format elapsed time as HH:MM:SS
formatElapsedTime(seconds) → string

// Calculate distance between coordinates (Haversine)
calculateDistance(lat1, lon1, lat2, lon2) → number
```

## API Endpoints (via BFF Proxy)

All endpoints go through `/api/proxy/`:

```
POST   /rides                     → Reserve bike
POST   /rides/{id}/start         → Start ride
POST   /rides/{id}/end           → End ride
GET    /rides/{id}               → Get ride details
GET    /rides/history            → Get paginated history
POST   /rides/{id}/dispute       → Submit dispute
```

## User Interface Pages

### `/bike/[id]` - Bike Detail
- Bike information (battery, model)
- Fare estimate (base rate + surge)
- Nearest return docks
- "Unlock This Bike" button
- Loading states on reservation

### `/unlock/[bikeId]` - Unlock Modal
- 3-step flow (confirm → method → done)
- Confirm ride cost and balance
- Choose unlock method (app, QR, NFC)
- Success animation
- Back button for cancellation

### `/ride/active` - Active Ride Map
- Full-screen map display
- Real-time timer and cost
- Nearest dock navigation
- End ride button with geolocation
- Pause and report issue buttons

### `/ride/receipt/[rideId]` - Receipt
- Ride summary (bike, duration, distance)
- Cost breakdown (base fare, surge, total)
- Payment confirmation (deducted from wallet)
- Rate ride button
- Back to map button
- Dispute option

### `/ride/history` - History
- Paginated list of rides
- Ride cards showing key stats
- View receipt links
- Dispute buttons for completed rides
- Empty state with CTA

## Cost Calculation

```typescript
Cost Formula:
  baseCost = duration_in_seconds / 60 * ratePerMinute
  finalCost = baseCost * surgeMultiplier
  
Example:
  10 minute ride at ₦50/min with 1.2x surge
  = (10 * 50) * 1.2
  = 500 * 1.2
  = ₦600
```

## Error Handling

### Common Scenarios

| Scenario | Error | Handling |
|----------|-------|----------|
| No active ride when starting timer | "No active reservation found" | Redirect to home |
| Geolocation denied | "Permission denied" | Show retry button |
| Insufficient balance | "Balance too low" | Show top-up prompt |
| Network timeout | "Request timeout" | Show retry button |
| Bike unavailable | "Bike already in use" | Show error, back to browser |
| Backend service error | "Service unavailable" | Show error, back button |

### Error Display
- Inline error messages in components
- Toast notifications for user feedback
- Retry buttons for failed operations
- Graceful fallbacks (no geolocation = no distance sorting)

## State Persistence

### Session Management
- Active ride stored in RideContext (memory)
- Survives page navigation within same session
- Lost on app refresh (intended behavior)
- Backend stores authoritative ride state

### Browser Cache
- Ride history cached client-side temporarily
- Re-fetched on pagination
- No persistent storage of sensitive data

## Performance Considerations

### Optimizations
- Timer interval: 1 second (balances accuracy and performance)
- Pagination: 10 rides per page
- Component memoization for expensive renders
- Lazy loading of maps and images
- CSS-in-JS compiled to static sheets

### Potential Bottlenecks
- Geolocation request (user permission required, ~1-3 seconds)
- Backend API latency
- Map rendering (full-screen canvas)

## Testing Checklist

### Happy Path
- [ ] Reserve bike successfully
- [ ] Unlock bike transitions to active ride
- [ ] Timer increments correctly every second
- [ ] Cost calculates correctly with surge
- [ ] End ride gets geolocation
- [ ] Receipt shows correct totals
- [ ] Ride appears in history
- [ ] Can view receipt from history

### Error Scenarios
- [ ] No balance → show error on reserve
- [ ] Bike taken → show error during unlock
- [ ] Geolocation denied → graceful degradation
- [ ] Network timeout → show retry
- [ ] Backend error → show error page
- [ ] Missing active ride → redirect home

### Edge Cases
- [ ] Very short ride (< 1 minute)
- [ ] Very long ride (> 24 hours)
- [ ] High surge pricing (5x+)
- [ ] Zero distance (bug?)
- [ ] Multiple reservations
- [ ] Rapid button clicks

## Future Enhancements

### Phase 2
- [ ] QR code scanning for unlock
- [ ] NFC tap unlock method
- [ ] Ride pausing (pause timer, hold cost)
- [ ] Helmet check integration
- [ ] In-ride support chat

### Phase 3
- [ ] Real-time bike tracking on map
- [ ] Route optimization
- [ ] Leaderboards and achievements
- [ ] Social sharing
- [ ] Ride matching (nearby riders)

### Phase 4
- [ ] Voice commands
- [ ] AR bike finder
- [ ] Predictive dock availability
- [ ] Dynamic pricing engine
- [ ] Loyalty rewards

## Deployment Notes

### Environment Variables
```
NEXTAUTH_URL=https://your-domain.com
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXTAUTH_SECRET=<random-32-char-string>
GOOGLE_CLIENT_ID=<from-google-cloud>
GOOGLE_CLIENT_SECRET=<from-google-cloud>
```

### Security Checklist
- [ ] HTTPOnly cookies enabled for session tokens
- [ ] HTTPS required for production
- [ ] CORS properly configured for API proxy
- [ ] Rate limiting on ride endpoints
- [ ] Input validation on all forms
- [ ] Payment processing PCI-compliant

### Monitoring
- [ ] Error rate tracking
- [ ] API latency monitoring
- [ ] User session analytics
- [ ] Ride completion rates
- [ ] Support ticket correlation

## Troubleshooting

### "No active reservation found"
**Cause**: Refresh browser, RideContext reset
**Fix**: Re-select bike and reserve again

### Geolocation permission denied
**Cause**: User clicked "Block" on permission prompt
**Fix**: Allow geolocation in browser settings, try again

### "Invalid token" on endRide
**Cause**: Session expired during ride
**Fix**: Re-login, can still view ride in history

### Cost doesn't match estimate
**Cause**: Surge pricing changed, backend calculated different rate
**Fix**: Check receipt shows server-calculated cost (source of truth)

## Code Examples

### Reserve a Bike
```typescript
const { setActiveRide, setLoading, setError } = useRide()

const handleReserve = async () => {
  try {
    setLoading(true)
    const ride = await ridesService.reserve(bikeId, 'dock-001')
    setActiveRide(ride)
    router.push(`/unlock/${bikeId}`)
  } catch (err) {
    setError(err.message)
  } finally {
    setLoading(false)
  }
}
```

### Start Ride
```typescript
const handleStartRide = async () => {
  if (!state.activeRide) return
  
  try {
    setLoading(true)
    await ridesService.startRide(state.activeRide.id)
    router.push('/ride/active')
  } catch (err) {
    setError(err.message)
  } finally {
    setLoading(false)
  }
}
```

### End Ride with Geolocation
```typescript
const handleEndRide = async () => {
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const ride = await ridesService.endRide(
        state.activeRide!.id,
        'dock-002',
        position.coords.latitude,
        position.coords.longitude
      )
      router.push(`/ride/receipt/${ride.id}`)
    }
  )
}
```

---

**Last Updated**: Session 387a4dfe
**Build Status**: ✅ Compiles successfully
**Test Coverage**: Manual testing guide available
**Documentation**: Complete
