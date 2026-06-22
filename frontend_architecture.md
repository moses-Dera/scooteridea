# 🖥️ Frontend Architecture — E-Bike Sharing Platform

> **Operator Dashboard:** Next.js 15 (App Router) — `frontend/web`  
> **Rider App:** Next.js (Web) — `frontend/rider-web` (port 3010)  
> **Shared:** TypeScript types + API client library (`packages/api-client`)  
> **Future:** React Native (Expo) for native mobile

---

## Part 1 — Web: Operator Dashboard

### Stack

| Concern | Choice | Why |
|---------|--------|-----|
| Framework | Next.js 15 (App Router) | SSR for auth pages, RSC for data-heavy views |
| Styling | Tailwind CSS + shadcn/ui | Rapid, consistent design system |
| Maps | Mapbox GL JS | Real-time fleet map, geofence editor |
| Charts | Recharts | Fleet analytics, revenue graphs |
| State | Zustand | Lightweight global store (map state, filters) |
| Server state | TanStack Query | API caching, background refetch |
| WebSocket | native WebSocket / socket.io-client | Live fleet updates |
| Auth | NextAuth.js (JWT strategy) | Session management |
| Forms | React Hook Form + Zod | Type-safe form validation |
| Tables | TanStack Table | Sortable/filterable fleet & ride tables |

---

### Folder Structure

```
frontend/web/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx              ← Sidebar + Topbar shell
│   │   ├── page.tsx                ← /  →  Overview
│   │   ├── fleet/
│   │   │   ├── page.tsx            ← Live fleet map
│   │   │   └── [bikeId]/page.tsx   ← Bike detail
│   │   ├── docks/
│   │   │   ├── page.tsx            ← Dock grid overview
│   │   │   └── [dockId]/page.tsx   ← Dock slot detail
│   │   ├── rides/
│   │   │   ├── page.tsx            ← Ride history table
│   │   │   └── [rideId]/page.tsx   ← Ride detail + route replay
│   │   ├── zones/page.tsx          ← Geofence editor
│   │   ├── pricing/page.tsx        ← Surge heatmap + config
│   │   ├── analytics/page.tsx      ← Revenue, utilisation, KPIs
│   │   ├── alerts/page.tsx         ← Ops alerts feed
│   │   └── settings/page.tsx
├── components/
│   ├── map/
│   │   ├── FleetMap.tsx            ← Main Mapbox canvas
│   │   ├── BikeMarker.tsx
│   │   ├── DockMarker.tsx
│   │   ├── SurgeHeatmap.tsx
│   │   └── GeofenceEditor.tsx
│   ├── fleet/
│   │   ├── BikeCard.tsx
│   │   ├── BikeStatusBadge.tsx
│   │   └── FleetTable.tsx
│   ├── docks/
│   │   ├── DockCard.tsx
│   │   ├── SlotGrid.tsx
│   │   └── RebalancingAlert.tsx
│   ├── rides/
│   │   ├── RideTable.tsx
│   │   └── RouteReplay.tsx
│   ├── analytics/
│   │   ├── RevenueChart.tsx
│   │   ├── UtilisationChart.tsx
│   │   └── KPICard.tsx
│   └── shared/
│       ├── Sidebar.tsx
│       ├── Topbar.tsx
│       ├── AlertBanner.tsx
│       └── CommandDialog.tsx       ← Remote bike commands
├── lib/
│   ├── api.ts                      ← Axios instance + interceptors
│   ├── ws.ts                       ← WebSocket singleton
│   ├── mapbox.ts                   ← Map helpers
│   └── utils.ts
├── store/
│   ├── fleetStore.ts               ← Live bike positions (Zustand)
│   ├── dockStore.ts
│   └── alertStore.ts
├── hooks/
│   ├── useFleetSocket.ts
│   ├── useBikeQuery.ts
│   └── useSurge.ts
└── types/
    └── index.ts                    ← Shared with backend via copy
```

---

### Key Pages

#### Live Fleet Map (`/fleet`)
```typescript
// FleetMap.tsx — core logic
export function FleetMap() {
  const bikes  = useFleetStore(s => s.bikes);
  const docks  = useFleetStore(s => s.docks);

  // WebSocket — live updates
  useFleetSocket();   // populates fleetStore on 'bike_location_update'

  return (
    <Map mapboxAccessToken={TOKEN} initialViewState={{ longitude: 3.37, latitude: 6.52, zoom: 13 }}>
      {bikes.map(b => <BikeMarker key={b.id} bike={b} />)}
      {docks.map(d => <DockMarker key={d.id} dock={d} />)}
      <SurgeHeatmap />
    </Map>
  );
}
```

```typescript
// useFleetSocket.ts
export function useFleetSocket() {
  const updateBike = useFleetStore(s => s.updateBike);
  const updateDock = useFleetStore(s => s.updateDock);

  useEffect(() => {
    const ws = new WebSocket(`wss://${API_HOST}/live?token=${getToken()}`);
    ws.onopen = () => ws.send(JSON.stringify({ subscribe: ['fleet:all', 'dock:all'] }));
    ws.onmessage = ({ data }) => {
      const msg = JSON.parse(data);
      if (msg.event === 'bike_location_update') updateBike(msg);
      if (msg.event === 'dock_status_update')   updateDock(msg);
    };
    return () => ws.close();
  }, []);
}
```

#### Dock Grid (`/docks`)
- Card per dock: name, capacity bar (green/amber/red), slot grid, charging count
- Click → `/docks/[id]`: full slot matrix, per-slot bike + battery

#### Ride Detail (`/rides/[rideId]`)
- Trip metadata: duration, distance, fare, surge multiplier
- Route replay: Mapbox `flyTo` animating GPS history points
- Dispute actions: refund, flag, operator note

#### Geofence Editor (`/zones`)
- Draw polygons on map (Mapbox `draw` plugin)
- Set zone type: Operational / Slow / No-Ride / Dock
- Set speed cap for Slow zones
- Save → `POST /api/zones`

#### Command Dialog (global)
```typescript
// Triggered from BikeCard or BikeDetail
<CommandDialog bikeId="BK-00123">
  <CommandButton cmd="LOCK"        label="Lock Bike"      variant="warning" />
  <CommandButton cmd="UNLOCK"      label="Unlock Bike"    variant="primary" />
  <CommandButton cmd="ALARM"       label="Trigger Alarm"  variant="danger"  />
  <CommandButton cmd="DISABLE"     label="Disable Motor"  variant="danger"  />
  <CommandButton cmd="SPEED_LIMIT" label="Cap Speed"      variant="warning" input="kmh" />
</CommandDialog>
```

---

### Zustand Fleet Store

```typescript
interface FleetStore {
  bikes: Record<string, BikeState>;
  docks: Record<string, DockState>;
  updateBike: (update: BikeLocationUpdate) => void;
  updateDock: (update: DockStatusUpdate) => void;
}

export const useFleetStore = create<FleetStore>((set) => ({
  bikes: {},
  docks: {},
  updateBike: (u) => set(s => ({
    bikes: { ...s.bikes, [u.bikeId]: { ...s.bikes[u.bikeId], ...u } }
  })),
  updateDock: (u) => set(s => ({
    docks: { ...s.docks, [u.dockId]: { ...s.docks[u.dockId], ...u } }
  })),
}));
```

---

### API Client

```typescript
// lib/api.ts
const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL });

api.interceptors.request.use(config => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(null, async (err) => {
  if (err.response?.status === 401) {
    await refreshTokens();
    return api(err.config);   // retry original request
  }
  return Promise.reject(err);
});

export const fleetApi = {
  getBikes:       ()         => api.get<Bike[]>('/fleet/bikes'),
  getBike:        (id)       => api.get<Bike>(`/fleet/bikes/${id}`),
  sendCommand:    (id, cmd)  => api.post(`/fleet/bikes/${id}/command`, cmd),
  getDocks:       ()         => api.get<Dock[]>('/docks'),
};

export const rideApi = {
  list:     (params) => api.get<RidePage>('/rides', { params }),
  getById:  (id)     => api.get<Ride>(`/rides/${id}`),
  dispute:  (id, d)  => api.post(`/rides/${id}/dispute`, d),
};
```

---

## Part 2 — Rider App (Web Version)

> **Location:** `frontend/rider-web` | **Port:** 3010  
> **Current Implementation:** Next.js web app  
> **Future Plan:** Migrate to React Native (Expo) for native mobile

The rider app is currently implemented as a **web-based Next.js application** for rapid prototyping. It runs on port 3010 and uses the same stack as the operator dashboard.

**Transition to React Native:**
Once the web version is stable, we will migrate to React Native + Expo for iOS/Android native apps using the stack below.

### Stack (React Native - Planned)

| Concern | Choice |
|---------|--------|
| Framework | React Native + Expo (SDK 51) |
| Navigation | Expo Router (file-based) |
| Maps | Mapbox RN (`@rnmapbox/maps`) |
| State | Zustand |
| Server state | TanStack Query |
| Auth storage | Expo SecureStore |
| Push notifications | Expo Notifications + FCM |
| Payments | Stripe React Native SDK |
| Animations | React Native Reanimated 3 |
| Icons | Expo Vector Icons |

---

### Folder Structure

```
frontend/mobile/
├── app/
│   ├── (auth)/
│   │   ├── welcome.tsx
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── verify.tsx              ← OTP phone verification
│   ├── (tabs)/
│   │   ├── _layout.tsx             ← Bottom tab bar
│   │   ├── index.tsx               ← Map Home
│   │   ├── rides.tsx               ← Ride history
│   │   ├── wallet.tsx              ← Balance + top-up
│   │   └── profile.tsx
│   ├── bike/[id].tsx               ← Bike detail sheet
│   ├── unlock/[bikeId].tsx         ← Unlock flow
│   ├── ride/active.tsx             ← Active ride screen
│   ├── ride/end.tsx                ← End ride / dock finder
│   └── ride/[id].tsx               ← Past ride detail + receipt
├── components/
│   ├── map/
│   │   ├── RiderMap.tsx
│   │   ├── BikePin.tsx
│   │   ├── DockPin.tsx
│   │   └── NearestDockBanner.tsx
│   ├── ride/
│   │   ├── RideMeter.tsx           ← Timer + cost counter
│   │   ├── DockFinder.tsx          ← Nearest dock card
│   │   └── UnlockSheet.tsx
│   ├── wallet/
│   │   ├── BalanceCard.tsx
│   │   └── TopUpSheet.tsx
│   └── shared/
│       ├── BottomSheet.tsx
│       ├── PrimaryButton.tsx
│       └── Toast.tsx
├── lib/
│   ├── api.ts
│   ├── ws.ts
│   ├── location.ts                 ← Expo Location helpers
│   └── secure.ts                   ← SecureStore wrapper
├── store/
│   ├── mapStore.ts                 ← Nearby bikes + docks
│   ├── rideStore.ts                ← Active ride state
│   └── authStore.ts
└── hooks/
    ├── useNearbyBikes.ts
    ├── useLiveRide.ts
    └── useUnlock.ts
```

---

### Key Screens

#### Map Home (`app/(tabs)/index.tsx`)
```typescript
export default function MapHome() {
  const { location } = useUserLocation();
  const { bikes, docks } = useNearbyBikes(location);
  const activeRide = useRideStore(s => s.activeRide);

  if (activeRide) return <Redirect href="/ride/active" />;

  return (
    <View style={styles.container}>
      <RiderMap userLocation={location} bikes={bikes} docks={docks}
        onBikePress={(bikeId) => router.push(`/bike/${bikeId}`)} />
      <SurgeIndicator location={location} />
      <SearchBar onSubmit={(dest) => router.push({ pathname: '/match', params: { dest } })} />
    </View>
  );
}
```

#### Bike Detail Sheet (`app/bike/[id].tsx`)
```typescript
// Bottom sheet — slides up when user taps bike pin
export default function BikeDetail() {
  const { id } = useLocalSearchParams();
  const { data: bike } = useBikeQuery(id);
  const surge = useSurge(bike?.location);

  return (
    <BottomSheet snapPoints={['40%', '80%']}>
      <BatteryBar pct={bike?.battery_pct} />
      <Text>~{bike?.nearest_dock_m}m to nearest dock</Text>
      <FareEstimate perMin={COST_PER_MIN} surge={surge.multiplier} />
      {surge.multiplier > 1 && <SurgeWarning mult={surge.multiplier} />}
      <PrimaryButton onPress={() => router.push(`/unlock/${id}`)}>
        Unlock Bike
      </PrimaryButton>
    </BottomSheet>
  );
}
```

#### Unlock Flow (`app/unlock/[bikeId].tsx`)
```typescript
// Three-step: confirm → method select → executing
type UnlockStep = 'confirm' | 'method' | 'executing' | 'done';

export default function UnlockScreen() {
  const [step, setStep] = useState<UnlockStep>('confirm');
  const { mutate: startUnlock, isPending } = useUnlock();

  const methods = [
    { id: 'remote',  label: 'Unlock via App',  icon: 'smartphone' },
    { id: 'qr',      label: 'Scan QR Code',     icon: 'qr-code'    },
    { id: 'nfc',     label: 'Tap (NFC)',         icon: 'wifi'       },
    { id: 'otp',     label: 'Enter PIN',         icon: 'hash'       },
  ];

  return (
    <View>
      {step === 'confirm'    && <ConfirmStep onNext={() => setStep('method')} />}
      {step === 'method'     && <MethodPicker methods={methods} onSelect={m => startUnlock({ method: m })} />}
      {step === 'executing'  && <Spinner label="Unlocking..." />}
      {step === 'done'       && <SuccessAnimation onDone={() => router.replace('/ride/active')} />}
    </View>
  );
}
```

#### Active Ride (`app/ride/active.tsx`)
```typescript
export default function ActiveRide() {
  const ride = useRideStore(s => s.activeRide);
  const { elapsed, cost } = useRideMeter(ride?.startedAt);
  const nearestDock = useNearestDock(ride?.bikeId);

  return (
    <View style={styles.screen}>
      {/* Fullscreen map with live bike position */}
      <RiderMap trackingBikeId={ride?.bikeId} showDocks />

      {/* Bottom HUD */}
      <RideHUD>
        <RideMeter elapsed={elapsed} cost={cost} />
        <NearestDockBanner dock={nearestDock} />
        <DangerButton onPress={() => router.push('/ride/end')}>
          End Ride
        </DangerButton>
      </RideHUD>
    </View>
  );
}
```

#### End Ride / Dock Finder (`app/ride/end.tsx`)
```typescript
export default function EndRide() {
  const { location } = useUserLocation();
  const docks = useNearestDocks(location, 5);
  const { mutate: endRide, isPending } = useEndRide();

  // Rides can only end within 50m of a dock with a free slot
  const eligibleDock = docks.find(d => d.distance_m <= 50 && d.available_slots > 0);

  return (
    <View>
      <Text style={styles.heading}>Return bike to a dock</Text>
      {docks.map(dock => (
        <DockCard key={dock.id} dock={dock}
          highlight={dock.id === eligibleDock?.id}
          onNavigate={() => openMapsNavigation(dock.location)} />
      ))}
      <PrimaryButton
        disabled={!eligibleDock || isPending}
        onPress={() => endRide({ dockId: eligibleDock.id })}>
        {eligibleDock ? 'Confirm Return' : 'Get closer to a dock'}
      </PrimaryButton>
    </View>
  );
}
```

---

### Live Ride Hook

```typescript
// hooks/useLiveRide.ts
export function useLiveRide(rideId: string) {
  const updateBikePos = useRideStore(s => s.updateBikePosition);

  useEffect(() => {
    const ws = new WebSocket(`wss://${API_HOST}/live?token=${getToken()}`);
    ws.onopen = () => ws.send(JSON.stringify({
      subscribe: [`ride:${rideId}`, `bike:${getBikeId()}`]
    }));
    ws.onmessage = ({ data }) => {
      const msg = JSON.parse(data);
      if (msg.event === 'bike_location_update') updateBikePos(msg);
      if (msg.event === 'ride_ended')           router.replace(`/ride/${rideId}`);
    };
    return () => ws.close();
  }, [rideId]);
}
```

---

### Push Notification Handlers

```typescript
// Handled in app/_layout.tsx
Notifications.addNotificationResponseReceivedListener(response => {
  const { type, payload } = response.notification.request.content.data;

  switch (type) {
    case 'LOW_BATTERY':      router.push(`/ride/end`);                    break;
    case 'DOCK_NEARBY':      showToast(`Dock nearby: ${payload.dockName}`); break;
    case 'RIDE_RECEIPT':     router.push(`/ride/${payload.rideId}`);      break;
    case 'ZONE_VIOLATION':   showAlert('You\'ve entered a restricted zone'); break;
    case 'PAYMENT_FAILED':   router.push('/wallet');                      break;
  }
});
```

---

## Part 3 — Shared API Client

```typescript
// shared between web + mobile (npm workspace package)
// packages/api-client/src/index.ts

export const authClient = {
  login:    (body: LoginDto)    => post<TokenPair>('/auth/login', body),
  register: (body: RegisterDto) => post<User>('/auth/register', body),
  refresh:  ()                  => post<TokenPair>('/auth/refresh'),
  me:       ()                  => get<User>('/auth/me'),
};

export const rideClient = {
  match:    (loc: LatLng)     => post<Match>('/match/request', loc),
  start:    (rideId: string)  => post<Ride>(`/rides/${rideId}/start`),
  end:      (rideId, dockId)  => post<Ride>(`/rides/${rideId}/end`, { dockId }),
  history:  (page = 1)        => get<RidePage>(`/rides/history?page=${page}`),
};

export const dockClient = {
  nearest: (loc: LatLng, n = 5) =>
    get<Dock[]>(`/docks/nearest?lat=${loc.lat}&lng=${loc.lng}&limit=${n}`),
};

export const pricingClient = {
  surge:    (loc: LatLng)           => get<Surge>(`/pricing/surge?lat=${loc.lat}&lng=${loc.lng}`),
  estimate: (bikeId, dest: LatLng)  => get<Estimate>(`/pricing/estimate?bikeId=${bikeId}&destLat=${dest.lat}&destLng=${dest.lng}`),
};
```

---

## Part 4 — Full Monorepo Layout

```
scooteridea/
├── simulator/              ← IoT simulator (existing)
├── backend/                ← All microservices
├── frontend/
│   ├── web/                ← Next.js 15 operator dashboard
│   └── mobile/             ← Expo React Native rider app
├── packages/
│   ├── api-client/         ← Shared typed API client
│   └── types/              ← Shared TypeScript interfaces
├── package.json            ← npm workspaces root
└── turbo.json              ← Turborepo build pipeline
```

**`package.json` (root):**
```json
{
  "name": "ebike-platform",
  "private": true,
  "workspaces": ["frontend/*", "backend/services/*", "packages/*"],
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.4.0"
  }
}
```

---

## Part 5 — Screen Inventory

### Web (Operator Dashboard)
| Route | Screen | Key Components |
|-------|--------|----------------|
| `/` | Overview | KPI cards, alert feed, mini map |
| `/fleet` | Live Fleet Map | Mapbox, bike/dock markers, surge overlay |
| `/fleet/[id]` | Bike Detail | Status, history, command dialog |
| `/docks` | Dock Grid | Capacity cards (green/amber/red) |
| `/docks/[id]` | Dock Detail | Slot matrix, charging status |
| `/rides` | Ride Table | Filterable, sortable, export CSV |
| `/rides/[id]` | Ride Detail | Route replay, receipt, dispute |
| `/zones` | Geofence Editor | Draw polygons, zone type picker |
| `/pricing` | Surge Config | Heatmap, multiplier bands editor |
| `/analytics` | Analytics | Revenue, utilisation, fleet KPIs |
| `/alerts` | Ops Alerts | Real-time alert feed, ack actions |

### Mobile (Rider App)
| Route | Screen | Key Components |
|-------|--------|----------------|
| `/welcome` | Onboarding | Slides, CTA |
| `/login` | Login | Email/phone + social |
| `/register` | Register | Multi-step form |
| `/(tabs)/` | Map Home | Live map, search, surge badge |
| `/bike/[id]` | Bike Sheet | Battery, ETA, fare estimate, unlock |
| `/unlock/[id]` | Unlock Flow | Method picker, OTP/QR/NFC |
| `/ride/active` | Active Ride | Full-screen map, HUD, dock arrow |
| `/ride/end` | End Ride | Dock finder, slot availability |
| `/ride/[id]` | Receipt | Route, fare breakdown, rating |
| `/(tabs)/rides` | Ride History | Paginated list + search |
| `/(tabs)/wallet` | Wallet | Balance, top-up, payment methods |
| `/(tabs)/profile` | Profile | Settings, safety, help |

### Web (Rider App)
| Route | Screen | Key Components |
|-------|--------|----------------|
| `/` | Map Home | Full-screen map, floating bike cards, surge badge, search |
| `/bike/:id` | Bike Detail | Right-panel drawer, battery, fare estimate, nearest docks, unlock CTA |
| `/unlock/:bikeId` | Unlock Flow | 3-step modal — Confirm → Method picker → Done |
| `/ride/active` | Active Ride | Full-screen map HUD, live timer, running cost, dock navigator |
| `/ride/end` | End Ride | Dock finder, slot availability, confirm return |
| `/ride/:id` | Ride Receipt | Route summary, fare breakdown, star rating |
| `/rides` | Ride History | Paginated list + search |
| `/wallet` | Wallet | Balance card, top-up, transactions, payment methods |
| `/profile` | Profile | Settings, safety, help |
| `/login` | Login | Email/phone + social auth |
| `/register` | Register | Multi-step onboarding form |

---

## Part 6 — Web: Rider App

> A **responsive web version** of the rider-facing experience, adapted from the React Native mobile app to a Next.js 15 web app. Usable on desktop browsers and degrades gracefully to a mobile-web layout.

### Design System

| Token | Value |
|-------|-------|
| Background | `#0A0F1E` (deep navy black) |
| Surface | `#111827` / `#1A2235` |
| Accent Green | `#00FF87` (electric green) |
| Accent Cyan | `#00D4FF` |
| Warning | `#F59E0B` (amber — surge zones) |
| Danger | `#EF4444` (red — end ride) |
| Text Primary | `#FFFFFF` |
| Text Secondary | `#94A3B8` |
| Glassmorphism | `rgba(255,255,255,0.05)` + `backdrop-filter: blur(20px)` |
| Border | `rgba(255,255,255,0.1)` |
| Font | **Inter** (Google Fonts) |

---

### Stack

| Concern | Choice | Why |
|---------|--------|-----|
| Framework | Next.js 15 (App Router) | SSR for auth pages, RSC for data-heavy views |
| Maps | Mapbox GL JS | Dark-style map, custom bike/dock markers |
| Styling | Tailwind CSS + custom CSS vars | Design token control, glassmorphism utilities |
| Animations | Framer Motion | Side-panel slide-in, modal transitions, ride HUD |
| State | Zustand | Map state, active ride, auth |
| Server state | TanStack Query | API caching, background refetch |
| WebSocket | native WebSocket / socket.io-client | Live ride timer, bike position, dock updates |
| Auth | NextAuth.js (JWT) | Session management, OTP phone login |
| Payments | Paystack / Stripe Web SDK | Wallet top-up, ride payment |
| Forms | React Hook Form + Zod | Type-safe unlock PIN, registration forms |

---

### Folder Structure

```
frontend/rider-web/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── layout.tsx
│   ├── (rider)/
│   │   ├── layout.tsx              ← Navbar shell
│   │   ├── page.tsx                ← /  →  Map Home
│   │   ├── bike/[id]/page.tsx      ← Bike Detail (right drawer)
│   │   ├── unlock/[bikeId]/page.tsx ← Unlock Flow modal
│   │   ├── ride/
│   │   │   ├── active/page.tsx     ← Active Ride HUD
│   │   │   ├── end/page.tsx        ← End Ride / Dock finder
│   │   │   └── [id]/page.tsx       ← Ride Receipt
│   │   ├── rides/page.tsx          ← Ride History
│   │   ├── wallet/page.tsx         ← Wallet
│   │   └── profile/page.tsx        ← Profile & Settings
├── components/
│   ├── map/
│   │   ├── RiderMap.tsx            ← Main Mapbox canvas
│   │   ├── BikePin.tsx             ← Green pin, battery tooltip
│   │   ├── DockPin.tsx             ← Blue pin, slots tooltip
│   │   └── RouteLayer.tsx          ← Cyan route line (active ride)
│   ├── bike/
│   │   ├── BikeDrawer.tsx          ← Slide-in right panel
│   │   ├── BatteryBar.tsx
│   │   ├── FareEstimate.tsx
│   │   └── NearestDockCards.tsx
│   ├── unlock/
│   │   ├── UnlockModal.tsx         ← 3-step modal wrapper
│   │   ├── StepConfirm.tsx
│   │   ├── StepMethodPicker.tsx    ← App / QR / NFC / PIN
│   │   └── StepDone.tsx            ← Success animation
│   ├── ride/
│   │   ├── RideHUD.tsx             ← Floating panels over map
│   │   ├── RideTimer.tsx           ← Live elapsed + cost counter
│   │   ├── DockNavigator.tsx       ← Nearest dock card (top-right)
│   │   └── EndRideBar.tsx          ← Bottom bar with End Ride button
│   ├── wallet/
│   │   ├── BalanceCard.tsx
│   │   ├── TopUpSheet.tsx
│   │   └── TransactionList.tsx
│   └── shared/
│       ├── Navbar.tsx
│       ├── SurgeBadge.tsx          ← Amber pill "1.2x surge"
│       ├── GlassCard.tsx           ← Reusable glassmorphism card
│       └── PrimaryButton.tsx
├── lib/
│   ├── api.ts                      ← Axios instance + interceptors
│   ├── ws.ts                       ← WebSocket singleton
│   ├── mapbox.ts                   ← Map style + helpers
│   └── utils.ts
├── store/
│   ├── mapStore.ts                 ← Nearby bikes + docks
│   ├── rideStore.ts                ← Active ride state + timer
│   └── authStore.ts
└── hooks/
    ├── useNearbyBikes.ts
    ├── useLiveRide.ts              ← WebSocket ride updates
    ├── useUnlock.ts
    └── useRideMeter.ts             ← Elapsed time + running cost
```

---

### Key Screens

#### Map Home (`/`)

- Full-screen **Mapbox dark-style map** as the page background
- **Navbar** (top): VoltRide logo · Wallet balance · Notifications bell · Avatar
- **Bottom floating panel** (glassmorphism):
  - `🔍 Where are you going?` search bar
  - Toggle pills: **Nearby Bikes** (active) / **Docking Stations**
  - Horizontal scrollable row of **BikeCards**: ID, battery %, distance, `Ride →` button
  - Amber **SurgeBadge** `1.2x surge` when demand is elevated
- Click a bike pin → `BikeDrawer` slides in from right

```typescript
// components/map/RiderMap.tsx
export function RiderMap() {
  const bikes = useMapStore(s => s.bikes);
  const docks = useMapStore(s => s.docks);

  return (
    <Map mapboxAccessToken={TOKEN} initialViewState={{ longitude: 3.37, latitude: 6.52, zoom: 14 }}
         style={{ width: '100%', height: '100vh' }}
         mapStyle="mapbox://styles/mapbox/dark-v11">
      <UserLocationDot />
      {bikes.map(b => <BikePin key={b.id} bike={b} />)}
      {docks.map(d => <DockPin key={d.id} dock={d} />)}
    </Map>
  );
}
```

---

#### Bike Detail Drawer (`/bike/:id`)

Right-side panel (40% width, slides in with Framer Motion) over the map.

```typescript
// components/bike/BikeDrawer.tsx
export function BikeDrawer({ bikeId }: { bikeId: string }) {
  const { data: bike } = useBikeQuery(bikeId);
  const surge = useSurge(bike?.location);

  return (
    <motion.aside
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      className="fixed right-0 top-0 h-full w-[420px] glass-panel overflow-y-auto z-50">
      <DrawerHeader bike={bike} />
      <BatteryBar pct={bike?.battery_pct} />
      <StatsRow bike={bike} />
      <FareEstimate perMin={50} surge={surge.multiplier} />
      {surge.multiplier > 1 && <SurgeBadge mult={surge.multiplier} />}
      <NearestDockCards bikeId={bikeId} />
      <PrimaryButton onClick={() => router.push(`/unlock/${bikeId}`)}>
        Unlock This Bike
      </PrimaryButton>
      <p className="text-center text-sm text-slate-400 mt-2">Scan QR • NFC • Enter PIN</p>
    </motion.aside>
  );
}
```

---

#### Unlock Flow Modal (`/unlock/:bikeId`)

3-step wizard rendered as a centered modal over a blurred map background.

```typescript
type UnlockStep = 'confirm' | 'method' | 'executing' | 'done';

const METHODS = [
  { id: 'remote', label: 'Unlock via App', icon: Smartphone },
  { id: 'qr',     label: 'Scan QR Code',  icon: QrCode     },
  { id: 'nfc',    label: 'Tap NFC',        icon: Wifi       },
  { id: 'otp',    label: 'Enter PIN',      icon: Hash       },
];

export default function UnlockPage() {
  const [step, setStep] = useState<UnlockStep>('confirm');
  const { mutate: startUnlock } = useUnlock();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50">
      <GlassCard className="w-[480px] p-8">
        <StepIndicator current={step} steps={['confirm', 'method', 'done']} />
        <AnimatePresence mode="wait">
          {step === 'confirm'   && <StepConfirm   onNext={() => setStep('method')} />}
          {step === 'method'    && <StepMethodPicker methods={METHODS}
                                     onSelect={m => startUnlock({ method: m.id })} />}
          {step === 'executing' && <LoadingSpinner label="Unlocking..." />}
          {step === 'done'      && <StepDone onComplete={() => router.replace('/ride/active')} />}
        </AnimatePresence>
      </GlassCard>
    </div>
  );
}
```

---

#### Active Ride (`/ride/active`)

Full-screen map with three floating glassmorphism panels.

```typescript
export default function ActiveRidePage() {
  const ride = useRideStore(s => s.activeRide);
  const { elapsed, cost } = useRideMeter(ride?.startedAt);
  const nearestDock = useNearestDock(ride?.bikeId);
  const surge = useSurge(ride?.currentLocation);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Full-screen map */}
      <RiderMap trackingBikeId={ride?.bikeId} showRoute showDocks />

      {/* Top-left: Timer + Cost */}
      <GlassCard className="absolute top-6 left-6 p-6 min-w-[220px]">
        <span className="text-xs text-slate-400 uppercase tracking-widest">Active Ride</span>
        {surge.multiplier > 1 && <SurgeBadge mult={surge.multiplier} className="ml-2" />}
        <p className="text-5xl font-bold font-mono mt-1">{formatTime(elapsed)}</p>
        <p className="text-2xl font-bold text-green-400 mt-1">₦ {cost.toFixed(2)}</p>
      </GlassCard>

      {/* Top-right: Nearest Dock */}
      <GlassCard className="absolute top-6 right-6 p-6 min-w-[200px]">
        <DockNavigator dock={nearestDock} />
      </GlassCard>

      {/* Bottom: End Ride bar */}
      <EndRideBar ride={ride} className="absolute bottom-6 left-1/2 -translate-x-1/2" />
    </div>
  );
}
```

---

#### Wallet (`/wallet`)

```typescript
export default function WalletPage() {
  const { data: wallet } = useWallet();

  return (
    <main className="max-w-2xl mx-auto px-6 py-10 space-y-6">
      <h1 className="text-3xl font-bold">My Wallet</h1>
      <BalanceCard balance={wallet?.balance} onTopUp={() => setTopUpOpen(true)} />
      <div className="grid grid-cols-2 gap-3">
        <PrimaryButton onClick={() => setTopUpOpen(true)}>Top Up</PrimaryButton>
        <OutlineButton>Withdraw</OutlineButton>
      </div>
      <TransactionList transactions={wallet?.transactions} />
      <PaymentMethods methods={wallet?.paymentMethods} />
      <TopUpSheet open={topUpOpen} onClose={() => setTopUpOpen(false)} />
    </main>
  );
}
```

---

### Responsive Strategy

| Breakpoint | Layout Behaviour |
|------------|-----------------|
| Desktop `≥ 1280px` | Map fills screen · Bike drawer is right side panel (40%) · All panels floating |
| Tablet `768–1279px` | Map fills screen · Bike detail becomes **bottom sheet** (80% height) · Panels shrink |
| Mobile `< 768px` | Full mobile-web layout · Bottom sheets · Bike cards scroll vertically · Matches native app feel |

```css
/* GlassCard responsive example */
.glass-panel {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1rem;
}

@media (max-width: 768px) {
  .bike-drawer {
    /* Becomes bottom sheet on mobile */
    top: auto;
    bottom: 0;
    width: 100%;
    height: 80vh;
    border-radius: 1.5rem 1.5rem 0 0;
  }
}
```

---

### WebSocket — Live Ride Updates

```typescript
// hooks/useLiveRide.ts
export function useLiveRide(rideId: string) {
  const updateBikePos = useRideStore(s => s.updateBikePosition);
  const router = useRouter();

  useEffect(() => {
    const ws = new WebSocket(`wss://${API_HOST}/live?token=${getToken()}`);
    ws.onopen = () => ws.send(JSON.stringify({
      subscribe: [`ride:${rideId}`, `bike:${getBikeId()}`]
    }));
    ws.onmessage = ({ data }) => {
      const msg = JSON.parse(data);
      if (msg.event === 'bike_location_update') updateBikePos(msg);
      if (msg.event === 'ride_ended')           router.replace(`/ride/${rideId}`);
    };
    return () => ws.close();
  }, [rideId]);
}
```

---

### Updated Monorepo Layout

```
scooteridea/
├── simulator/              ← IoT simulator
├── backend/                ← All microservices
├── frontend/
│   ├── web/                ← Next.js 15 operator dashboard
│   ├── rider-web/          ← Next.js 15 rider web app  ← NEW
│   └── mobile/             ← Expo React Native rider app
├── packages/
│   ├── api-client/         ← Shared typed API client
│   └── types/              ← Shared TypeScript interfaces
├── package.json            ← npm workspaces root
└── turbo.json              ← Turborepo build pipeline
```

---

## Part 6 — Next Steps

- [ ] `npx create-next-app@latest frontend/rider-web` — scaffold project
- [ ] Install Mapbox GL JS, Framer Motion, Zustand, TanStack Query
- [ ] Build `GlassCard`, `PrimaryButton`, `SurgeBadge` shared components
- [ ] Implement `RiderMap` with bike + dock pins
- [ ] Build `BikeDrawer` slide-in panel
- [ ] Build `UnlockModal` 3-step flow
- [ ] Build `ActiveRidePage` HUD with WebSocket live timer
- [ ] Build `WalletPage` + Paystack integration
- [ ] Auth flows (login / register / phone OTP)
- [ ] Responsive polish (tablet + mobile breakpoints)
