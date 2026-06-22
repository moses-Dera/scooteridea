# 🚲 Simulator Management Dashboard - Implementation Summary

## 📊 Overview

A complete **simulator management dashboard** has been created to enable testing your e-bike ride booking system without real hardware. This allows you to:

- ✅ Create and manage virtual bikes dynamically
- ✅ Create and manage docking stations
- ✅ Control bikes (unlock, lock, disable, trigger alarms)
- ✅ Monitor real-time metrics (battery, GPS, speed)
- ✅ Test the complete ride booking flow end-to-end
- ✅ Validate payment processing
- ✅ Test error scenarios

## 🎯 What Was Built

### 1. Simulator API (`simulator/simulator-api.js`)
- **Type**: Node.js WebSocket server
- **Port**: 8885 (ws://localhost:8885)
- **Purpose**: Manages virtual bikes and docks, bridges dashboard to MQTT
- **Features**:
  - Real-time bike/dock state management
  - WebSocket API for dashboard communication
  - MQTT publisher for telemetry
  - Command handler for bike control
  - Dynamic bike/dock add/remove

### 2. Dashboard UI (`packages/simulator-dashboard/`)
- **Type**: Next.js 14 + React 19 + TypeScript + Tailwind CSS
- **Port**: 3001 (http://localhost:3001)
- **Purpose**: Web interface to manage and monitor the simulator
- **Components**:
  - Main dashboard page with WebSocket client
  - BikeCard component (status + controls)
  - DockCard component (slots + status)
  - Real-time status updates every 4 seconds
  - Input forms for adding bikes/docks
  - Remove buttons for cleanup

### 3. Startup Script (`start-simulator.sh`)
- **Purpose**: One-command launch of all services
- **Does**:
  - Checks if MQTT broker is running (starts if needed)
  - Starts Simulator API (port 8885)
  - Starts Dashboard (port 3001)
  - Shows process IDs and port numbers
  - Allows easy cleanup

### 4. Documentation (3 comprehensive guides)
- **SIMULATOR_QUICK_START.md** - One-page launch guide
- **SIMULATOR_DASHBOARD_GUIDE.md** - Detailed API & features
- **RIDE_BOOKING_TESTING_GUIDE.md** - Step-by-step testing workflow

## 🔧 Technical Architecture

```
┌─────────────────────────────────────────────────┐
│   Browser (http://localhost:3001)               │
│   Simulator Dashboard (React + TypeScript)      │
│   - Add/remove bikes                            │
│   - Add/remove docks                            │
│   - Control bikes                               │
│   - View real-time status                       │
└────────────────────┬────────────────────────────┘
                     │
                     │ WebSocket (ws://localhost:8885)
                     │ JSON messages
                     │
┌────────────────────▼────────────────────────────┐
│   Simulator API (Node.js)                       │
│   - WebSocket server (simulator-api.js)         │
│   - State management for bikes/docks            │
│   - MQTT client (publishes telemetry)           │
│   - Command handler                             │
└────────────────────┬────────────────────────────┘
                     │
                     │ MQTT Topic: bikes/{id}/telemetry
                     │ MQTT Topic: bikes/{id}/commands
                     │ MQTT Topic: docks/{id}/status
                     │
┌────────────────────▼────────────────────────────┐
│   MQTT Broker (mqtt://localhost:1883)           │
│   Mosquitto                                     │
│   - Receives telemetry from simulator           │
│   - Routes commands to bikes                    │
│   - Distributes status to subscribers           │
└─────────────────────────────────────────────────┘
```

## 📋 WebSocket API Reference

The dashboard communicates with the Simulator API via WebSocket (port 8885).

### Messages Sent (Dashboard → Simulator)

```javascript
// Get current status
{ "action": "get-status" }

// Add a new bike
{
  "action": "add-bike",
  "bikeId": "BK-TEST-001"
}

// Remove a bike
{
  "action": "remove-bike",
  "bikeId": "BK-TEST-001"
}

// Add a dock
{
  "action": "add-dock",
  "dockId": "DOCK-008",
  "name": "Central Station",
  "lat": 6.4541,    // optional
  "lng": 3.3792     // optional
}

// Remove a dock
{
  "action": "remove-dock",
  "dockId": "DOCK-008"
}

// Send command to bike
{
  "action": "command",
  "bikeId": "BK-00001",
  "command": "UNLOCK"  // UNLOCK | LOCK | ALARM | DISABLE
}
```

### Messages Received (Simulator → Dashboard)

```javascript
// Status update (sent every 4 seconds)
{
  "bikes": {
    "BK-00001": {
      "bike_id": "BK-00001",
      "lat": 6.4541,
      "lng": 3.3792,
      "speed_kmh": 15,
      "battery_pct": 87.5,
      "lock_status": "UNLOCKED",
      "docked_at": null,
      "charging": false,
      "timestamp": "2026-06-21T14:00:00Z"
    },
    // ... more bikes
  },
  "docks": {
    "DOCK-001": {
      "dock_id": "DOCK-001",
      "name": "Lagos Island Terminal",
      "lat": 6.4541,
      "lng": 3.4232,
      "total_slots": 12,
      "available_slots": 4,
      "slots": [
        {
          "slot": 1,
          "bike_id": "BK-00001",
          "charging": true,
          "battery_pct": 87
        },
        // ... more slots
      ],
      "timestamp": "2026-06-21T14:00:00Z"
    },
    // ... more docks
  }
}
```

## 🚀 Quick Start

### One Command Launch
```bash
cd /home/moze/codes/scooteridea
./start-simulator.sh
```

Output:
```
========================================
🚲  E-Bike Simulator Dashboard Startup
========================================

Checking MQTT broker...
✓ MQTT broker already running

Starting Simulator API...
✓ Simulator API running (PID: 12345)

Starting Dashboard...
✓ Dashboard running (PID: 12346)

========================================
🎉 Everything Started Successfully!
========================================

📊 Dashboard: http://localhost:3001
🔌 Simulator API: ws://localhost:8885
📡 MQTT Broker: mqtt://localhost:1883
🚀 Backend API: http://localhost:3000
🎮 Rider App: http://localhost:3000

Ready to test ride booking! 🎊
```

### Manual Launch (3 terminals)

**Terminal 1: MQTT Broker**
```bash
mosquitto
# or
brew services start mosquitto  # macOS
sudo systemctl start mosquitto # Linux
```

**Terminal 2: Simulator API**
```bash
cd /home/moze/codes/scooteridea/simulator
npm run api
```

**Terminal 3: Dashboard**
```bash
cd /home/moze/codes/scooteridea/packages/simulator-dashboard
npm run dev
```

Then open: http://localhost:3001

## 📊 Features

### Dashboard UI
- ✅ **Add Bikes**: Enter bike ID (e.g., BK-TEST-001), auto-populated with location, battery, lock status
- ✅ **Remove Bikes**: One-click removal
- ✅ **Control Bikes**: Unlock, Lock, Trigger Alarm, Disable
- ✅ **Real-time Updates**: Battery %, GPS coordinates, speed, lock status
- ✅ **Add Docks**: Specify dock ID and name
- ✅ **Remove Docks**: One-click removal
- ✅ **Dock Monitoring**: 12 slots per dock, charging status, battery levels
- ✅ **Status Indicator**: Connected/Disconnected display

### Simulator Engine
- ✅ **GPS Movement**: Real drift within 3km radius of Lagos city center
- ✅ **Battery Management**:
  - Drain: ~0.1% per second while riding
  - Charge: ~0.5% per second while docked
  - Range: 0-100%
- ✅ **Speed Simulation**: 10-25 km/h random speed when riding
- ✅ **Lock Management**: LOCKED/UNLOCKED states
- ✅ **Telemetry**: Updates every 4 seconds (configurable)
- ✅ **Command Handling**: Responds to UNLOCK, LOCK, ALARM, DISABLE via MQTT

## 📁 File Structure

```
scooteridea/
├── simulator/
│   ├── simulator-api.js              [NEW] WebSocket API server
│   ├── bike_simulator.js              Existing (MQTT publisher)
│   ├── dock_simulator.js              Existing (MQTT publisher)
│   ├── package.json                  [UPDATED] Added: ws
│   ├── .env                          (config)
│   └── utils/
│       └── geo.js                    (existing)
│
├── packages/
│   └── simulator-dashboard/           [NEW] Next.js dashboard
│       ├── app/
│       │   ├── page.tsx              Main dashboard page
│       │   ├── layout.tsx             Layout wrapper
│       │   ├── globals.css            Tailwind CSS
│       │   ├── components/
│       │   │   ├── BikeCard.tsx       Bike display & controls
│       │   │   └── DockCard.tsx       Dock display
│       │   └── lib/
│       │       └── mqtt-client.ts     MQTT client types
│       ├── public/                   (Next.js assets)
│       ├── package.json              (Next.js config)
│       ├── tsconfig.json             (TypeScript)
│       ├── next.config.ts            (Next.js)
│       ├── postcss.config.mjs         (Tailwind)
│       └── tailwind.config.ts         (Tailwind)
│
├── start-simulator.sh                 [NEW] Launch script (executable)
│
├── SIMULATOR_QUICK_START.md           [NEW] One-page guide
├── SIMULATOR_DASHBOARD_GUIDE.md       [NEW] Detailed docs
├── RIDE_BOOKING_TESTING_GUIDE.md      [NEW] Testing workflow
│
└── README.md                          (existing)
```

## 🧪 Testing Scenarios

### Scenario 1: Basic Ride
1. Add bike via dashboard
2. View in rider app
3. Unlock from app
4. Monitor battery drain in dashboard
5. End ride
6. Verify payment deduction

### Scenario 2: Multiple Bikes
1. Add 3 bikes
2. Unlock different bikes from dashboard
3. Monitor concurrent operations
4. End rides at different docks

### Scenario 3: Error Handling
1. Disable a bike
2. Try to unlock (should fail)
3. Add bike with low battery
4. Check insufficient balance handling

### Scenario 4: Dock Management
1. Add multiple docks
2. Fill dock slots
3. Try to dock at full dock (should fail)
4. Monitor charging status

## 📚 Documentation

| Document | Purpose | Audience |
|----------|---------|----------|
| SIMULATOR_QUICK_START.md | One-page launch guide | Everyone |
| SIMULATOR_DASHBOARD_GUIDE.md | Detailed features & API | Developers |
| RIDE_BOOKING_TESTING_GUIDE.md | Step-by-step testing | QA / Testers |

## ⚙️ Configuration

Edit `simulator/.env`:

```env
# Simulator Configuration
NUM_BIKES=10                    # Initial number of bikes
NUM_DOCKS=4                     # Initial number of docks
TELEMETRY_INTERVAL_MS=4000      # Bike telemetry interval (ms)
DOCK_INTERVAL_MS=10000          # Dock status interval (ms)

# Location Configuration
CITY_LAT=6.4541                 # Lagos center latitude
CITY_LNG=3.3792                 # Lagos center longitude
CITY_RADIUS_KM=3                # Radius bikes roam within (km)

# Network Configuration
MQTT_BROKER=mqtt://localhost:1883
WS_PORT=8885                    # Dashboard API WebSocket port
```

## 🔌 Integration Points

### With Rider App
- Backend fetches bikes from MQTT telemetry
- App displays available bikes
- Unlock request → simulator updates bike status
- Ride timer uses app-side timer

### With Backend API
- Simulator publishes to MQTT
- Backend consumes bike telemetry
- Commands route through backend to MQTT
- Payment processing in backend

### With MQTT Broker
- Simulator API publishes: `bikes/{id}/telemetry`, `docks/{id}/status`
- Simulator API subscribes: `bikes/{id}/commands`
- Backend can subscribe to any topic

## 📊 Metrics to Validate

| Metric | Expected | Source |
|--------|----------|--------|
| Battery Drain | ~0.1%/sec while riding | Dashboard update |
| Battery Charge | ~0.5%/sec while docked | Dashboard update |
| Speed Range | 10-25 km/h | Dashboard speed field |
| GPS Drift | Within 3km of center | Dashboard coordinates |
| Cost/Min | ₦50 (if configured) | App timer |
| Update Frequency | Every 4s | Dashboard refresh |
| Payment Deduction | Exact cost amount | Wallet balance |

## 🛠️ Troubleshooting

| Issue | Solution |
|-------|----------|
| Dashboard shows "Disconnected" | Check simulator API running: `npm run api` |
| Bikes not appearing in app | Verify backend is consuming MQTT |
| Commands not working | Ensure MQTT broker is running |
| Battery not updating | Check WebSocket connection status |
| Port already in use | Kill process: `kill -9 $(lsof -t -i:8885)` |

## ✨ Key Features

- **Zero Hardware Required**: All bikes/docks are virtual
- **Real-time Updates**: WebSocket for instant dashboard refresh
- **Production-ready**: Uses proper error handling and state management
- **Configurable**: Easy to adjust bike counts, update intervals, locations
- **Extensible**: Can add more metrics (accidents, maintenance, etc.)
- **Testing-friendly**: Can trigger specific scenarios on demand

## 🎓 What You Can Now Do

1. ✅ **Test without real bikes** - Virtual fleet works immediately
2. ✅ **Test payment flow** - Verify wallet deductions
3. ✅ **Test error scenarios** - Disable bikes, set low balance, fill docks
4. ✅ **Test concurrency** - Multiple bikes simultaneously
5. ✅ **Test durability** - Long rides, battery drain, charging
6. ✅ **Monitor metrics** - Real-time battery, GPS, speed, cost
7. ✅ **Validate UX** - Confirm app behaves correctly
8. ✅ **Stress test** - Add 100+ bikes and monitor

## 📈 Next Steps

1. **Launch the simulator** using `./start-simulator.sh`
2. **Follow RIDE_BOOKING_TESTING_GUIDE.md** for complete workflow
3. **Run all test scenarios** listed in testing guide
4. **Verify payment processing** works correctly
5. **Check error handling** for all scenarios
6. **Validate metrics** (battery, cost, GPS, timer)
7. **Test with multiple users** if possible
8. **Document any issues** found

## 🎉 Summary

You now have a **complete, production-ready simulator dashboard** that enables:
- ✅ Comprehensive testing without real hardware
- ✅ Real-time monitoring of bike fleet status
- ✅ End-to-end validation of ride booking flow
- ✅ Payment processing verification
- ✅ Error scenario testing
- ✅ Performance and durability testing

All ready to launch with: `./start-simulator.sh`

---

**Questions?** Check the detailed docs:
- Quick start: `SIMULATOR_QUICK_START.md`
- Full documentation: `SIMULATOR_DASHBOARD_GUIDE.md`
- Testing guide: `RIDE_BOOKING_TESTING_GUIDE.md`
