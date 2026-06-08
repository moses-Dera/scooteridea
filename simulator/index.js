require('dotenv').config();
const chalk = require('chalk');
const { startBikeFleet } = require('./bike_simulator');
const { startDockStations } = require('./dock_simulator');

console.log(chalk.cyan.bold('='.repeat(60)));
console.log(chalk.cyan.bold('   E-BIKE SHARING PLATFORM - HARDWARE SIMULATOR'));
console.log(chalk.cyan.bold('='.repeat(60)));
console.log(chalk.gray('\nSimulates IoT telemetry from bikes and docking stations'));
console.log(chalk.gray('Publishing to MQTT broker for Fleet Service consumption\n'));

console.log(chalk.white('Configuration:'));
console.log(chalk.gray(`  MQTT Broker: ${process.env.MQTT_BROKER || 'mqtt://localhost:1883'}`));
console.log(chalk.gray(`  Bikes: ${process.env.NUM_BIKES || 10}`));
console.log(chalk.gray(`  Docks: ${process.env.NUM_DOCKS || 4}`));
console.log(chalk.gray(`  Bike telemetry: every ${process.env.TELEMETRY_INTERVAL_MS || 4000}ms`));
console.log(chalk.gray(`  Dock status: every ${process.env.DOCK_INTERVAL_MS || 10000}ms\n`));

console.log(chalk.yellow('Press Ctrl+C to stop\n'));
console.log(chalk.cyan.bold('='.repeat(60)));

// Start both simulators
setTimeout(() => {
  startBikeFleet();
}, 500);

setTimeout(() => {
  startDockStations();
}, 1500);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\n👋 Shutting down simulator...'));
  process.exit(0);
});
