# Simulator Management Dashboard

A real-time web dashboard to **add, remove, and control virtual bikes and docks** without real hardware.

## 🎯 What It Does

- **Add/Remove Bikes** dynamically with custom IDs
- **Add/Remove Docks** for testing dock interactions
- **Control Bikes**: Unlock, Lock, Trigger Alarms, Disable
- **Real-time Status**: View battery, location, lock status, speed
- **Dock Monitoring**: Track slot availability and bike locations

Perfect for testing your **ride booking system** without real bikes!

## 🚀 Quick Start

### 1. Start MQTT Broker

```bash
# Install Mosquitto (if not already installed)
# macOS:
brew install mosquitto

# Ubuntu/Debian:
sudo apt-get install mosquitto mosquitto-clients

# Start broker
mosquitto
```

### 2. Start Simulator API

```bash
cd /home/moze/codes/scooteridea/simulator
npm run api
```

Output:
```
============================================================
   E-BIKE SIMULATOR WITH DASHBOARD API
============================================================

Simulates IoT telemetry from bikes and docking stations
Publishing to MQTT broker for Fleet Service

Configuration:
  MQTT Broker: mqtt://localhost:1883
  Bikes: 10
  Docks: 4
  Bike telemetry: every 4000ms
  Dashboard API: ws://localhost:8885

📊 Open dashboard at http://localhost:3001
Press Ctrl+C to stop

============================================================
```

### 3. Start Dashboard

```bash
cd /home/moze/codes/scooteridea/packages/simulator-dashboard
npm run dev
```

Open [http://localhost:3001](http://localhost:3001)

## 📋 Features

### Add Bikes
Enter a bike ID (e.g., `BK-00011`) to spawn a new virtual bike with:
- Random starting location in Lagos
- 60-100% battery
- LOCKED status
- Real-time GPS telemetry every 4 seconds

### Remove Bikes
Click "Remove" on any bike card to delete it from the fleet.

### Control Bikes
For each bike, you can:
- **🔓 Unlock**: Unlocks bike, starts movement simulation
- **🔒 Lock**: Locks bike, stops movement
- **🔔 Alarm**: Triggers alarm (useful for testing)
- **❌ Disable**: Disables bike (emergency)

### View Real-Time Status
Each bike card shows:
- Bike ID
- Lock Status (LOCKED / UNLOCKED)
- GPS Coordinates
- Speed (km/h)
- Battery Level (%)
- Docking Status

### Manage Docks
Add docking stations with:
- Dock ID (e.g., `DOCK-008`)
- Station Name
- 12 charging slots
- Real-time slot availability

View dock status:
- Available slots
- Which bikes are docked
- Charging status per bike
- Battery % of docked bikes

## 🔌 Architecture

```
┌─────────────────────────────────────────────────┐
│      Simulator Dashboard (http://localhost:3001)│
│  (Next.js React app with WebSocket client)      │
└────────────────────┬────────────────────────────┘
                     │
                     │ WebSocket (ws://localhost:8885)
                     │
┌────────────────────▼────────────────────────────┐
│    Simulator API (simulator-api.js)             │
│    (Node.js WebSocket server)                   │
│    - Manages bike/dock state                    │
│    - Publishes to MQTT                          │
│    - Receives dashboard commands                │
└────────────────────┬────────────────────────────┘
                     │
                     │ MQTT
                     │
┌────────────────────▼────────────────────────────┐
│    MQTT Broker (Mosquitto)                      │
│    mqtt://localhost:1883                        │
└─────────────────────────────────────────────────┘
```

## 🎮 Usage Examples

### Testing Ride Booking

1. **Add a Test Bike**
   - Click "Add New Bike"
   - Enter `BK-TEST-001`
   - Bike appears in dashboard

2. **Unlock from App**
   - Go to your rider app (`http://localhost:3000`)
   - Find the bike in bike list
   - Click "Unlock This Bike"
   - Watch dashboard update in real-time

3. **Monitor Ride**
   - Bike status changes to UNLOCKED
   - Battery decreases as bike "moves"
   - Speed updates every 4 seconds
   - Location drifts within Lagos area

4. **End Ride**
   - Navigate bike to dock in app
   - Dashboard shows bike should dock
   - Lock the bike from dashboard or app

### Testing Error Scenarios

- **Unlock Failure**: Disable bike → try to unlock
- **Battery Warning**: Check battery % in dashboard
- **Dock Full**: Add bikes to dock slots until full (12 max)

## 📊 Configuration

Edit `.env` in simulator directory:

```env
# Simulator Config
NUM_BIKES=10              # Number of initial bikes
NUM_DOCKS=4               # Number of initial docks
TELEMETRY_INTERVAL_MS=4000  # How often bikes broadcast location
DOCK_INTERVAL_MS=10000    # How often docks report status
CITY_LAT=6.4541           # Lagos center latitude
CITY_LNG=3.3792           # Lagos center longitude
CITY_RADIUS_KM=3          # Area bikes roam within

# MQTT Config
MQTT_BROKER=mqtt://localhost:1883

# Dashboard API
WS_PORT=8885
```

## 📡 WebSocket API

The dashboard communicates with `simulator-api.js` via WebSocket. Messages:

```javascript
// Get current status
{ "action": "get-status" }

// Add a bike
{ "action": "add-bike", "bikeId": "BK-TEST-001" }

// Remove a bike
{ "action": "remove-bike", "bikeId": "BK-TEST-001" }

// Add a dock
{ "action": "add-dock", "dockId": "DOCK-008", "name": "Custom Station" }

// Remove a dock
{ "action": "remove-dock", "dockId": "DOCK-008" }

// Send command to bike
{ "action": "command", "bikeId": "BK-00001", "command": "UNLOCK" }
```

Commands: `UNLOCK`, `LOCK`, `ALARM`, `DISABLE`

## 🛠️ Troubleshooting

### Dashboard shows "Disconnected"
- Check simulator API is running: `npm run api` in `/simulator`
- Verify WebSocket on port 8885: `lsof -i :8885`
- Check browser console for errors (F12)

### Bikes not updating
- MQTT broker must be running: `mosquitto`
- Check MQTT_BROKER in `.env`
- Verify connection in simulator output

### Can't add bikes
- Dashboard must be connected first
- Bike ID must be unique
- Check for errors in browser console

### Port already in use
```bash
# Kill process on port 8885
lsof -i :8885  # Find PID
kill -9 <PID>

# Kill process on port 3001
lsof -i :3001
kill -9 <PID>
```

## 📚 Next Steps

After adding test bikes:

1. **Test Ride Booking Flow**
   - Reserve bike from app
   - Unlock via dashboard or app
   - Simulate ride (check dashboard updates)
   - End ride at dock

2. **Test Error Handling**
   - Disable bike → try to unlock (should fail)
   - Check insufficient balance handling
   - Test network timeout recovery

3. **Test Docks**
   - Add multiple docks
   - Test dock selection in end ride flow
   - Verify slot availability updates

4. **Monitor Real Metrics**
   - Track battery drain during "ride"
   - Verify cost calculation (time-based)
   - Check payment deduction from wallet

## 🎓 Files

- `simulator-api.js` - WebSocket server managing bike/dock state
- `simulator/` - MQTT telemetry simulator
- `packages/simulator-dashboard/` - Next.js dashboard UI

---

**Questions?** Check logs in terminal where you ran `npm run api` and `npm run dev`
