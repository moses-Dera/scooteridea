require('dotenv').config();
const mqtt = require('mqtt');
const chalk = require('chalk');
const WebSocket = require('ws');
const http = require('http');
const { randomPointInRadius, movePoint } = require('./utils/geo');

const MQTT_BROKER = process.env.MQTT_BROKER || 'mqtt://localhost:1883';
const WS_PORT = parseInt(process.env.WS_PORT || 8885);
const TELEMETRY_INTERVAL = parseInt(process.env.TELEMETRY_INTERVAL_MS) || 4000;
const CITY_LAT = parseFloat(process.env.CITY_LAT) || 6.4541;
const CITY_LNG = parseFloat(process.env.CITY_LNG) || 3.3792;
const CITY_RADIUS = parseFloat(process.env.CITY_RADIUS_KM) || 3;

class SimulatorManager {
  constructor() {
    this.bikes = new Map();
    this.docks = new Map();
    this.mqttClient = null;
    this.subscribers = [];
    this.initializeBikes();
    this.initializeDocks();
  }

  initializeBikes() {
    const numBikes = parseInt(process.env.NUM_BIKES) || 10;
    for (let i = 1; i <= numBikes; i++) {
      const bikeId = `BK-${String(i).padStart(5, '0')}`;
      const point = randomPointInRadius(CITY_LAT, CITY_LNG, CITY_RADIUS);
      this.addBike(bikeId, point.lat, point.lng);
    }
  }

  initializeDocks() {
    const numDocks = parseInt(process.env.NUM_DOCKS) || 4;
    const docks = [
      { id: 'DOCK-001', name: 'Lagos Island Terminal', lat: 6.4541, lng: 3.4232 },
      { id: 'DOCK-002', name: 'Ikoyi Hub', lat: 6.4694, lng: 3.4133 },
      { id: 'DOCK-003', name: 'Victoria Island Center', lat: 6.4308, lng: 3.4267 },
      { id: 'DOCK-004', name: 'Lekki Station', lat: 6.5244, lng: 3.3792 },
    ];

    docks.slice(0, numDocks).forEach((dock) => {
      this.addDock(dock.id, dock.name, dock.lat, dock.lng);
    });
  }

  addBike(bikeId, lat, lng) {
    const bike = {
      bike_id: bikeId,
      lat,
      lng,
      speed_kmh: 0,
      battery_pct: Math.floor(Math.random() * 40) + 60,
      lock_status: 'LOCKED',
      docked_at: null,
      charging: false,
      isMoving: false,
      timestamp: new Date().toISOString(),
    };
    this.bikes.set(bikeId, bike);
    return bike;
  }

  removeBike(bikeId) {
    return this.bikes.delete(bikeId);
  }

  addDock(dockId, name, lat, lng) {
    const dock = {
      dock_id: dockId,
      name,
      lat,
      lng,
      total_slots: 12,
      available_slots: 8,
      slots: Array.from({ length: 12 }, (_, i) => ({
        slot: i + 1,
        bike_id: i < 4 ? `BK-${String(i + 1).padStart(5, '0')}` : null,
        charging: i < 4,
        battery_pct: i < 4 ? Math.floor(Math.random() * 40) + 60 : null,
      })),
      timestamp: new Date().toISOString(),
    };
    this.docks.set(dockId, dock);
    return dock;
  }

  removeDock(dockId) {
    return this.docks.delete(dockId);
  }

  updateBikePosition(bikeId, bike) {
    if (bike.isMoving && bike.lock_status === 'UNLOCKED') {
      const moved = movePoint(bike.lat, bike.lng, 0.05);
      bike.lat = moved.lat;
      bike.lng = moved.lng;
      bike.speed_kmh = Math.floor(Math.random() * 15) + 10;
      bike.battery_pct = Math.max(0, bike.battery_pct - 0.05);
    } else {
      bike.speed_kmh = 0;
      if (bike.charging && bike.battery_pct < 100) {
        bike.battery_pct = Math.min(100, bike.battery_pct + 0.3);
      }
    }
    bike.timestamp = new Date().toISOString();
  }

  handleCommand(bikeId, command) {
    const bike = this.bikes.get(bikeId);
    if (!bike) return;

    switch (command.toUpperCase()) {
      case 'UNLOCK':
        bike.lock_status = 'UNLOCKED';
        bike.isMoving = true;
        bike.docked_at = null;
        bike.charging = false;
        console.log(chalk.green(`🔓 ${bikeId} unlocked`));
        break;
      case 'LOCK':
        bike.lock_status = 'LOCKED';
        bike.isMoving = false;
        bike.speed_kmh = 0;
        console.log(chalk.yellow(`🔒 ${bikeId} locked`));
        break;
      case 'ALARM':
        console.log(chalk.red(`🚨 ${bikeId} alarm triggered!`));
        break;
      case 'DISABLE':
        bike.lock_status = 'LOCKED';
        bike.isMoving = false;
        bike.speed_kmh = 0;
        console.log(chalk.red(`⛔ ${bikeId} disabled`));
        break;
    }
  }

  getStatus() {
    const bikes = {};
    const docks = {};

    this.bikes.forEach((bike, id) => {
      bikes[id] = bike;
    });

    this.docks.forEach((dock, id) => {
      docks[id] = dock;
    });

    return { bikes, docks };
  }

  broadcast(data) {
    this.subscribers.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
      }
    });
  }
}

const manager = new SimulatorManager();

// Connect to MQTT
const mqttClient = mqtt.connect(MQTT_BROKER, {
  reconnectPeriod: 1000,
});

mqttClient.on('connect', () => {
  console.log(chalk.green('Connected to MQTT broker'));
  manager.bikes.forEach((_, bikeId) => {
    mqttClient.subscribe(`bikes/${bikeId}/commands`);
  });
});

mqttClient.on('message', (topic, message) => {
  const match = topic.match(/bikes\/(.+)\/commands/);
  if (match) {
    const bikeId = match[1];
    manager.handleCommand(bikeId, message.toString());
  }
});

// Update bike positions
setInterval(() => {
  manager.bikes.forEach((bike, bikeId) => {
    manager.updateBikePosition(bikeId, bike);
  });
  manager.broadcast(manager.getStatus());
}, TELEMETRY_INTERVAL);

// WebSocket server for dashboard
const server = http.createServer();
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log(chalk.cyan('Dashboard connected'));
  manager.subscribers.push(ws);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      switch (data.action) {
        case 'get-status':
          ws.send(JSON.stringify(manager.getStatus()));
          break;

        case 'add-bike':
          if (data.bikeId) {
            const point = randomPointInRadius(CITY_LAT, CITY_LNG, CITY_RADIUS);
            manager.addBike(data.bikeId, point.lat, point.lng);
            if (mqttClient.connected) {
              mqttClient.subscribe(`bikes/${data.bikeId}/commands`);
            }
            manager.broadcast(manager.getStatus());
            console.log(chalk.green(`Added bike: ${data.bikeId}`));
          }
          break;

        case 'remove-bike':
          if (data.bikeId) {
            manager.removeBike(data.bikeId);
            if (mqttClient.connected) {
              mqttClient.unsubscribe(`bikes/${data.bikeId}/commands`);
            }
            manager.broadcast(manager.getStatus());
            console.log(chalk.yellow(`Removed bike: ${data.bikeId}`));
          }
          break;

        case 'add-dock':
          if (data.dockId && data.name) {
            const lat = parseFloat(data.lat) || CITY_LAT;
            const lng = parseFloat(data.lng) || CITY_LNG;
            manager.addDock(data.dockId, data.name, lat, lng);
            manager.broadcast(manager.getStatus());
            console.log(chalk.green(`Added dock: ${data.dockId}`));
          }
          break;

        case 'remove-dock':
          if (data.dockId) {
            manager.removeDock(data.dockId);
            manager.broadcast(manager.getStatus());
            console.log(chalk.yellow(`Removed dock: ${data.dockId}`));
          }
          break;

        case 'command':
          if (data.bikeId && data.command) {
            manager.handleCommand(data.bikeId, data.command);
            if (mqttClient.connected) {
              mqttClient.publish(`bikes/${data.bikeId}/commands`, data.command);
            }
            manager.broadcast(manager.getStatus());
          }
          break;
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    console.log(chalk.yellow('Dashboard disconnected'));
    const index = manager.subscribers.indexOf(ws);
    if (index > -1) {
      manager.subscribers.splice(index, 1);
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

server.listen(WS_PORT, () => {
  console.log(chalk.cyan.bold('='.repeat(60)));
  console.log(chalk.cyan.bold('   E-BIKE SIMULATOR WITH DASHBOARD API'));
  console.log(chalk.cyan.bold('='.repeat(60)));
  console.log(chalk.gray('\nSimulates IoT telemetry from bikes and docking stations'));
  console.log(chalk.gray('Publishing to MQTT broker for Fleet Service\n'));

  console.log(chalk.white('Configuration:'));
  console.log(chalk.gray(`  MQTT Broker: ${MQTT_BROKER}`));
  console.log(chalk.gray(`  Bikes: ${manager.bikes.size}`));
  console.log(chalk.gray(`  Docks: ${manager.docks.size}`));
  console.log(chalk.gray(`  Bike telemetry: every ${TELEMETRY_INTERVAL}ms`));
  console.log(chalk.gray(`  Dashboard API: ws://localhost:${WS_PORT}\n`));

  console.log(chalk.yellow('📊 Open dashboard at http://localhost:3001'));
  console.log(chalk.yellow('Press Ctrl+C to stop\n'));
  console.log(chalk.cyan.bold('='.repeat(60)));
});
