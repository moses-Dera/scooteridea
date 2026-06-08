# 🚲 E-Bike Hardware Simulator

Simulates IoT telemetry from e-bikes and docking stations for development and testing.

## What It Does

- **Bike Simulator**: Spawns virtual bikes that publish GPS telemetry every 3-5 seconds
- **Dock Simulator**: Spawns docking stations that report slot availability and charging status
- **MQTT Integration**: Publishes to topics matching the Fleet Service architecture
- **Command Handling**: Bikes respond to UNLOCK, LOCK, ALARM, DISABLE commands

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your MQTT broker details

# Run everything (bikes + docks)
npm start

# Or run separately
npm run bikes   # Bikes only
npm run docks   # Docks only
```

## MQTT Topics

### Published by Bikes
- `bikes/{bike_id}/telemetry` - GPS, battery, lock status (every 3-5s)

### Published by Docks
- `docks/{dock_id}/status` - Slot availability, charging status (every 10s)

### Commands for Bikes (subscribe)
- `bikes/{bike_id}/commands` - UNLOCK, LOCK, ALARM, DISABLE, SPEED_LIMIT, LOCATE

## Example Telemetry

### Bike
```json
{
  "bike_id": "BK-00123",
  "lat": 6.5244,
  "lng": 3.3792,
  "speed_kmh": 15,
  "battery_pct": 87,
  "lock_status": "UNLOCKED",
  "docked_at": null,
  "charging": false,
  "timestamp": "2026-06-04T14:00:00Z"
}
```

### Dock
```json
{
  "dock_id": "DOCK-007",
  "name": "Lagos Island Terminal",
  "lat": 6.4541,
  "lng": 3.4232,
  "total_slots": 12,
  "available_slots": 4,
  "slots": [
    { "slot": 1, "bike_id": "BK-00123", "charging": true, "battery_pct": 87 },
    { "slot": 2, "bike_id": null, "charging": false, "battery_pct": null }
  ],
  "timestamp": "2026-06-04T14:00:00Z"
}
```

## Testing Commands

Send commands to bikes via MQTT:

```bash
# Unlock bike
mosquitto_pub -h localhost -t bikes/BK-00001/commands -m "UNLOCK"

# Lock bike
mosquitto_pub -h localhost -t bikes/BK-00001/commands -m "LOCK"

# Trigger alarm
mosquitto_pub -h localhost -t bikes/BK-00001/commands -m "ALARM"
```

## Configuration

Edit `.env` to customize:

- `NUM_BIKES`: Number of bikes to simulate (default: 10)
- `NUM_DOCKS`: Number of docking stations (default: 4)
- `TELEMETRY_INTERVAL_MS`: How often bikes send GPS (default: 4000ms)
- `DOCK_INTERVAL_MS`: How often docks report status (default: 10000ms)
- `CITY_LAT/CITY_LNG`: Center of simulation area
- `CITY_RADIUS_KM`: Radius bikes roam within (default: 3km)

## Next Steps

Once the simulator is running:

1. Set up MQTT broker (Mosquitto or EMQX)
2. Build Fleet Service to consume telemetry
3. Store locations in Redis GEO
4. Build operator dashboard to visualize live fleet
