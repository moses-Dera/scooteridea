const { spawn, execSync } = require('child_process');

console.log('🧹 Cleaning up blocked ports to guarantee startup...');
const portsToClear = [1883, 6379, 5432, 3010, 3004, 3002, 80];

portsToClear.forEach(port => {
  try {
    // Suppress output so it doesn't clutter the terminal if the port is already free
    execSync(`fuser -k ${port}/tcp > /dev/null 2>&1`);
    console.log(`   Cleared port ${port}`);
  } catch (err) {
    // If it throws, it means no process was using the port (which is fine!)
  }
});

console.log('\n🚀 Starting Docker containers (Redis, Postgres, MQTT)...');
try {
  execSync('docker compose -f backend/infra/docker-compose.yml up -d postgres redis emqx nginx', { stdio: 'inherit' });
} catch (err) {
  console.error('❌ Failed to start Docker containers. Make sure Docker is running.');
  process.exit(1);
}

console.log('✅ Docker containers are up! Starting Turborepo...');

// Start the Turborepo dev server
const turbo = spawn('npm', ['run', 'dev:turbo'], { 
  stdio: 'inherit',
  env: process.env
});

// Function to gracefully shut down everything
const shutdown = () => {
  console.log('\n🛑 Shutting down...');
  
  // Kill turbo if it's still running
  if (turbo.pid) {
    turbo.kill('SIGINT');
  }

  console.log('🐳 Stopping Docker containers...');
  try {
    execSync('docker compose -f backend/infra/docker-compose.yml down', { stdio: 'inherit' });
    console.log('✅ Docker containers stopped safely.');
  } catch (err) {
    console.error('❌ Failed to stop Docker containers automatically.');
  }

  process.exit(0);
};

// Catch Ctrl+C and other exit signals to run the shutdown function
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
