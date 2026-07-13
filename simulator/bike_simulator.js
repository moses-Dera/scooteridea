require('dotenv').config();
const mqtt = require('mqtt');
const chalk = require('chalk');
const { randomPointInRadius, movePoint } = require('./utils/geo');

const MQTT_BROKER = process.env.MQTT_BROKER || 'mqtt://localhost:1883';
const NUM_BIKES = parseInt(process.env.NUM_BIKES) || 10;
const TELEMETRY_INTERVAL = parseInt(process.env.TELEMETRY_INTERVAL_MS) || 4000;
const CITY_LAT = parseFloat(process.env.CITY_LAT) || 6.4541;
const CITY_LNG = parseFloat(process.env.CITY_LNG) || 3.3792;
const CITY_RADIUS = parseFloat(process.env.CITY_RADIUS_KM) || 3;

class BikeSimulator {
  constructor(bikeId, startLat, startLng) {
    this.bikeId = bikeId;
    this.lat = startLat;
    this.lng = startLng;
    this.speed = 0;
    this.battery = Math.floor(Math.random() * 40) + 60; // 60-100%
    this.lockStatus = 'LOCKED';
    this.dockedAt = null;
    this.charging = false;
    this.isMoving = false;
  }

  generateTelemetry() {
    return {
      bike_id: this.bikeId,
      lat: parseFloat(this.lat.toFixed(6)),
      lng: parseFloat(this.lng.toFixed(6)),
      speed_kmh: this.speed,
      battery_pct: this.battery,
      lock_status: this.lockStatus,
      docked_at: this.dockedAt,
      charging: this.charging,
      timestamp: new Date().toISOString(),
    };
  }

  updatePosition() {
    if (this.isMoving && this.lockStatus === 'UNLOCKED') {
      const moved = movePoint(this.lat, this.lng, 0.05);
      this.lat = moved.lat;
      this.lng = moved.lng;
      this.speed = Math.floor(Math.random() * 15) + 10; // 10-25 km/h
      this.battery = Math.max(0, this.battery - 0.1); // Drain battery
    } else {
      this.speed = 0;
      if (this.charging && this.battery < 100) {
        this.battery = Math.min(100, this.battery + 0.5); // Charge battery
      }
    }
  }

  handleCommand(command) {
    switch (command.toUpperCase()) {
      case 'UNLOCK':
        this.lockStatus = 'UNLOCKED';
        this.isMoving = true;
        this.dockedAt = null;
        this.charging = false;
        console.log(chalk.green(`🔓 ${this.bikeId} unlocked`));
        break;
      case 'LOCK':
        this.lockStatus = 'LOCKED';
        this.isMoving = false;
        this.speed = 0;
        console.log(chalk.yellow(`🔒 ${this.bikeId} locked`));
        break;
      case 'ALARM':
        console.log(chalk.red(`🚨 ${this.bikeId} alarm triggered!`));
        break;
      case 'DISABLE':
        this.lockStatus = 'LOCKED';
        this.isMoving = false;
        this.speed = 0;
        console.log(chalk.red(`⛔ ${this.bikeId} disabled`));
        break;
      case 'LOCATE':
        console.log(chalk.blue(`📍 ${this.bikeId} location requested`));
        break;
      default:
        console.log(chalk.gray(`❓ ${this.bikeId} unknown command: ${command}`));
    }
  }
}

function startBikeFleet() {
  console.log(chalk.cyan.bold('\n🚲 E-Bike Fleet Simulator Starting...\n'));

  const client = mqtt.connect(MQTT_BROKER, {
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
  });

  const bikes = [];

  client.on('connect', () => {
    console.log(chalk.green('✓ Connected to MQTT broker'));
    console.log(chalk.cyan(`📍 City center: ${CITY_LAT}, ${CITY_LNG}`));
    console.log(chalk.cyan(`🚲 Spawning ${NUM_BIKES} bikes...\n`));

    // Create bikes
    for (let i = 1; i <= NUM_BIKES; i++) {
      const bikeId = `BK-${String(i).padStart(5, '0')}`;
      const pos = randomPointInRadius(CITY_LAT, CITY_LNG, CITY_RADIUS);
      const bike = new BikeSimulator(bikeId, pos.lat, pos.lng);
      bikes.push(bike);

      // Subscribe to commands for this bike
      client.subscribe(`bikes/${bikeId}/commands`, (err) => {
        if (!err) {
          console.log(
            chalk.gray(`  ✓ ${bikeId} spawned at (${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)})`),
          );
        }
      });
    }

    console.log(chalk.green(`\n✓ ${NUM_BIKES} bikes ready\n`));

    // Subscribe to dynamic demo spawns!
    client.subscribe('system/demo/spawn');
    console.log(chalk.magenta('✓ Listening for Dynamic Demo Spawns (system/demo/spawn)'));

    // Start telemetry loop
    setInterval(() => {
      bikes.forEach((bike) => {
        bike.updatePosition();
        const telemetry = bike.generateTelemetry();
        client.publish(`bikes/${bike.bikeId}/telemetry`, JSON.stringify(telemetry));
      });
      process.stdout.write(
        chalk.gray(
          `📡 Telemetry sent from ${NUM_BIKES} bikes | ${new Date().toLocaleTimeString()}\r`,
        ),
      );
    }, TELEMETRY_INTERVAL);
  });

  client.on('message', (topic, message) => {
    // Handle Global Demo Spawning
    if (topic === 'system/demo/spawn') {
      try {
        const { lat, lng, count = 10, radius = 2 } = JSON.parse(message.toString());
        console.log(
          chalk.magenta.bold(
            `\n🌍 DEMO MODE ACTIVATED: Spawning ${count} bikes at (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
          ),
        );

        const startingId = bikes.length + 1;
        for (let i = 0; i < count; i++) {
          const bikeId = `BK-${String(startingId + i).padStart(5, '0')}`;
          const pos = randomPointInRadius(lat, lng, radius);
          const bike = new BikeSimulator(bikeId, pos.lat, pos.lng);
          bikes.push(bike);

          client.subscribe(`bikes/${bikeId}/commands`, (err) => {
            if (!err) {
              console.log(
                chalk.gray(
                  `  ✓ Demo ${bikeId} spawned at (${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)})`,
                ),
              );
            }
          });
        }
      } catch (err) {
        console.error(chalk.red('❌ Failed to parse demo spawn command:'), err.message);
      }
      return;
    }

    const parts = topic.split('/');
    const bikeId = parts[1];
    const command = message.toString();

    const bike = bikes.find((b) => b.bikeId === bikeId);
    if (bike) {
      bike.handleCommand(command);
    }
  });

  client.on('error', (err) => {
    console.error(chalk.red('❌ MQTT Error:'), err.message);
  });
}

// Run if executed directly
if (require.main === module) {
  startBikeFleet();
}

module.exports = { startBikeFleet };
