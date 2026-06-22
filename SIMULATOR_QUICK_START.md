# 🚲 Simulator Dashboard - Quick Start

## What You Now Have

A **complete simulator management dashboard** to test your ride booking system without real bikes!

### Components:
1. **Simulator API** (`simulator-api.js`) - WebSocket server managing bikes/docks
2. **Dashboard UI** (`packages/simulator-dashboard/`) - React app to add/remove/control bikes
3. **Startup Script** (`start-simulator.sh`) - One command to launch everything

## 🎯 One Command Launch

```bash
# From project root
./start-simulator.sh
```

This automatically:
- ✅ Checks MQTT broker (starts if needed)
- ✅ Starts Simulator API (ws://localhost:8885)
- ✅ Starts Dashboard (http://localhost:3001)

## 📊 Dashboard Features

### Add Test Bikes
```
Enter: BK-TEST-001
→ Bike appears with:
  - Random Lagos location
  - 60-100% battery
  - Real-time GPS updates
  - Simulated movement
```

### Control Bikes
- **🔓 Unlock** → Bike starts moving, battery drains
- **🔒 Lock** → Bike stops, charges if in dock
- **🔔 Alarm** → Trigger for testing
- **❌ Disable** → Emergency stop
- **Remove** → Delete bike from fleet

### Monitor Status
- Current GPS location (latitude, longitude)
- Speed (0-25 km/h when moving)
- Battery percentage
- Lock status (LOCKED / UNLOCKED)
- Charging status

### Manage Docks
- Add docks with custom names
- View 12 charging slots per dock
- See which bikes are docked
- Track battery of docked bikes

## 🧪 Test Your Ride Booking

### Scenario 1: Basic Ride
1. Open dashboard → Add bike `BK-TEST-001`
2. Open rider app → Find bike in list
3. Click "Unlock This Bike"
4. Dashboard shows bike UNLOCKED
5. Start ride on app
6. See battery decrease on dashboard
7. End ride at dock
8. Dashboard shows LOCKED in dock

### Scenario 2: Multiple Bikes
1. Add 3 bikes (`BK-TEST-001`, `BK-TEST-002`, `BK-TEST-003`)
2. Add 2 docks for testing
3. Unlock different bikes
4. Check nearest dock routing
5. End rides at different docks

### Scenario 3: Error Handling
1. Add bike, disable it
2. Try to unlock (should fail)
3. Add bike with low battery
4. Check warning display
5. Verify payment deduction logic

## 📁 Project Structure

```
scooteridea/
├── simulator/
│   ├── simulator-api.js          ← NEW: WebSocket API
│   ├── package.json              ← UPDATED: +ws module
│   ├── bike_simulator.js          ← Existing MQTT publisher
│   └── dock_simulator.js          ← Existing MQTT publisher
│
├── packages/
│   └── simulator-dashboard/       ← NEW: React dashboard
│       ├── app/
│       │   ├── page.tsx           ← Main dashboard
│       │   ├── components/
│       │   │   ├── BikeCard.tsx   ← Bike UI
│       │   │   └── DockCard.tsx   ← Dock UI
│       │   └── lib/
│       │       └── mqtt-client.ts ← MQTT types
│       └── package.json
│
├── start-simulator.sh             ← NEW: Launch script
├── SIMULATOR_DASHBOARD_GUIDE.md   ← Detailed documentation
└── MVP_READY.md                   ← Your ride booking docs
```

## 🔌 Architecture

```
Browser (localhost:3001)
    ↓ WebSocket
Simulator API (port 8885)
    ├→ MQTT Broker (localhost:1883)
    │  ├→ BikeSimulator.js publishes telemetry
    │  └→ DockSimulator.js publishes status
    │
    └→ Dashboard state management
       (add/remove bikes, send commands)
```

## 🚀 Usage Examples

### Add a Bike Programmatically
The dashboard connects via WebSocket. To add bikes:

```javascript
// In dashboard:
ws.send(JSON.stringify({ 
  action: 'add-bike', 
  bikeId: 'BK-CUSTOM-123' 
}))
```

### Send Commands to Bikes
```javascript
ws.send(JSON.stringify({ 
  action: 'command', 
  bikeId: 'BK-00001', 
  command: 'UNLOCK' 
}))
```

### Get Current Status
```javascript
ws.send(JSON.stringify({ action: 'get-status' }))
// Receives: { bikes: {...}, docks: {...} }
```

## 📊 Real-Time Metrics You Can Track

- **Battery Drain**: ~0.1% per second while moving
- **Battery Charge**: ~0.5% per second while docked
- **Speed**: 10-25 km/h when moving (random)
- **Movement**: Real drift within 3km radius of Lagos
- **Updates**: Every 4 seconds (configurable)

## 🛠️ Manual Start (if not using script)

```bash
# Terminal 1: MQTT
mosquitto

# Terminal 2: Simulator API
cd simulator
npm run api

# Terminal 3: Dashboard
cd packages/simulator-dashboard
npm run dev

# Open http://localhost:3001
```

## 🎯 Next: Integrate with Ride Booking

Your dashboard is ready for testing! Now you can:

1. ✅ Add test bikes without hardware
2. ✅ Monitor real-time bike status
3. ✅ Control bikes (unlock, lock, disable)
4. ✅ Test dock management
5. ✅ Verify ride booking flow end-to-end
6. ✅ Validate payment deductions
7. ✅ Test error scenarios

**Open `/SIMULATOR_DASHBOARD_GUIDE.md` for detailed documentation.**

---

Ready to test? Run: `./start-simulator.sh` 🚀
