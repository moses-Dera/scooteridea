require('dotenv').config();
const mqtt = require('mqtt');
const chalk = require('chalk');
const { randomPointInRadius } = require('./utils/geo');

const MQTT_BROKER = process.env.MQTT_BROKER || 'mqtt://localhost:1883';
const NUM_DOCKS = parseInt(process.env.NUM_DOCKS) || 4;
const DOCK_INTERVAL = parseInt(process.env.DOCK_INTERVAL_MS) || 10000;
const CITY_LAT = parseFloat(process.env.CITY_LAT) || 6.4541;
const CITY_LNG = parseFloat(process.env.CITY_LNG) || 3.3792;
const CITY_RADIUS = parseFloat(process.env.CITY_RADIUS_KM) || 3;

const DOCK_NAMES = [
  'Lagos Island Terminal',
  'Ikeja Hub Station',
  'Victoria Island Plaza',
  'Lekki Phase 1 Stand',
  'Yaba Tech Park',
  'Marina Business District',
  'Surulere Junction',
  'Festac Gateway',
];

class DockSimulator {
  constructor(dockId, name, lat, lng, totalSlots = 12) {
    this.dockId = dockId;
    this.name = name;
    this.lat = lat;
    this.lng = lng;
    this.totalSlots = totalSlots;
    this.slots = [];

    // Initialize slots
    for (let i = 1; i <= totalSlots; i++) {
      const hasBike = Math.random() > 0.5;
      this.slots.push({
        slot: i,
        bike_id: hasBike ? `BK-${String(Math.floor(Math.random() * 100)).padStart(5, '0')}` : null,
        charging: hasBike,
        battery_pct: hasBike ? Math.floor(Math.random() * 40) + 60 : null,
      });
    }
  }

  get availableSlots() {
    return this.slots.filter((s) => s.bike_id === null).length;
  }

  generateStatus() {
    return {
      dock_id: this.dockId,
      name: this.name,
      lat: parseFloat(this.lat.toFixed(6)),
      lng: parseFloat(this.lng.toFixed(6)),
      total_slots: this.totalSlots,
      available_slots: this.availableSlots,
      slots: this.slots,
      timestamp: new Date().toISOString(),
    };
  }

  simulateActivity() {
    // Randomly dock/undock bikes
    if (Math.random() > 0.8) {
      const emptySlots = this.slots.filter((s) => s.bike_id === null);
      const occupiedSlots = this.slots.filter((s) => s.bike_id !== null);

      if (Math.random() > 0.5 && emptySlots.length > 0) {
        // Dock a bike
        const slot = emptySlots[Math.floor(Math.random() * emptySlots.length)];
        slot.bike_id = `BK-${String(Math.floor(Math.random() * 100)).padStart(5, '0')}`;
        slot.charging = true;
        slot.battery_pct = Math.floor(Math.random() * 50) + 30;
        console.log(
          chalk.green(`  ✓ Bike ${slot.bike_id} docked at ${this.name} slot ${slot.slot}`),
        );
      } else if (occupiedSlots.length > 0) {
        // Undock a bike
        const slot = occupiedSlots[Math.floor(Math.random() * occupiedSlots.length)];
        console.log(
          chalk.yellow(`  ✓ Bike ${slot.bike_id} undocked from ${this.name} slot ${slot.slot}`),
        );
        slot.bike_id = null;
        slot.charging = false;
        slot.battery_pct = null;
      }
    }

    // Update battery levels for charging bikes
    this.slots.forEach((slot) => {
      if (slot.charging && slot.battery_pct < 100) {
        slot.battery_pct = Math.min(100, Math.round(slot.battery_pct + Math.random() * 2));
      }
    });
  }
}

function startDockStations() {
  console.log(chalk.magenta.bold('\n🏗️  Docking Station Simulator Starting...\n'));

  const client = mqtt.connect(MQTT_BROKER, {
    username: process.env.MQTT_USERNAME || undefined,
    password: process.env.MQTT_PASSWORD || undefined,
    reconnectPeriod: 3000,
    connectTimeout: 10000,
  });

  const docks = [];

  client.on('connect', () => {
    console.log(chalk.green('✓ Connected to MQTT broker'));
    console.log(chalk.magenta(`📍 City center: ${CITY_LAT}, ${CITY_LNG}`));
    console.log(chalk.magenta(`🏗️  Spawning ${NUM_DOCKS} docking stations...\n`));

    // Create docks
    for (let i = 1; i <= NUM_DOCKS; i++) {
      const dockId = `DOCK-${String(i).padStart(3, '0')}`;
      const name = DOCK_NAMES[i - 1] || `Station ${i}`;
      const pos = randomPointInRadius(CITY_LAT, CITY_LNG, CITY_RADIUS);
      const totalSlots = [8, 10, 12, 15][Math.floor(Math.random() * 4)];
      const dock = new DockSimulator(dockId, name, pos.lat, pos.lng, totalSlots);
      docks.push(dock);

      console.log(chalk.gray(`  ✓ ${dockId} - ${name}`));
      console.log(chalk.gray(`    Location: (${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)})`));
      console.log(chalk.gray(`    Slots: ${dock.availableSlots}/${totalSlots} available\n`));
    }

    console.log(chalk.green(`✓ ${NUM_DOCKS} docking stations ready\n`));

    // Start status broadcast loop
    setInterval(() => {
      docks.forEach((dock) => {
        dock.simulateActivity();
        const status = dock.generateStatus();
        client.publish(`docks/${dock.dockId}/status`, JSON.stringify(status));
      });
      process.stdout.write(
        chalk.gray(
          `🏗️  Status sent from ${NUM_DOCKS} docks | ${new Date().toLocaleTimeString()}\r`,
        ),
      );
    }, DOCK_INTERVAL);
  });

  client.on('reconnect', () => {
    console.log(chalk.yellow('🔄 Docks reconnecting to MQTT broker...'));
  });

  client.on('offline', () => {
    console.log(chalk.red('📴 Docks lost connection to MQTT broker'));
  });

  client.on('error', (err) => {
    console.error(chalk.red('❌ MQTT Error:'), err.message);
  });
}

// Run if executed directly
if (require.main === module) {
  startDockStations();
}

module.exports = { startDockStations };
