const { spawn } = require('child_process');
const net = require('net');

function checkPort(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(800);
    
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.connect(port, host);
  });
}

async function waitForInfrastructure() {
  const ports = [
    { name: 'PostgreSQL', port: 5440 },
    { name: 'Redis', port: 6380 },
    { name: 'MQTT (EMQX)', port: 1883 },
    { name: 'Kafka', port: 9092 }
  ];

  console.log('⏳ Checking database and message broker ports...');

  while (true) {
    let allReady = true;
    const pending = [];
    for (const service of ports) {
      const ready = await checkPort(service.port);
      if (!ready) {
        allReady = false;
        pending.push(service.name);
      }
    }

    if (allReady) {
      console.log('🔌 Ports are open! Waiting 10 seconds for services to finish internal initialization...');
      
      // Run database migrations
      console.log('🔄 Running database migrations...');
      try {
        await new Promise((resolve, reject) => {
          const migrate = spawn('npx', ['prisma', 'migrate', 'deploy'], {
            cwd: 'backend/shared/db',
            stdio: 'inherit'
          });
          migrate.on('close', (code) => {
            if (code === 0) {
              console.log('✅ Database migrations complete');
              resolve();
            } else {
              console.warn('⚠️  Migration warning (code: ' + code + ')');
              resolve(); // Don't fail, migrations might not exist yet
            }
          });
        });
      } catch (err) {
        console.warn('⚠️  Migration skipped:', err.message);
      }
      await new Promise((resolve) => setTimeout(resolve, 10000));
      console.log('✅ Infrastructure is ready!');
      break;
    }

    console.log(`⏳ Waiting for ports to open: ${pending.join(', ')}...`);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

console.log('🚀 Starting Docker infrastructure...');
const dockerUp = spawn('npm', ['run', 'docker:up'], { stdio: 'inherit', shell: true });

dockerUp.on('close', async (code) => {
  if (code !== 0) {
    console.error('❌ Failed to start Docker. Exiting.');
    process.exit(code);
  }

  // Wait for Postgres, Redis, MQTT, and Kafka to start listening + 10s initialization buffer
  await waitForInfrastructure();

  console.log('💻 Starting development servers...');
  const devServer = spawn('npx', ['turbo', 'run', 'dev', '--parallel'], { stdio: 'inherit', shell: true });

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    
    console.log('\n🛑 Stopping Docker infrastructure...');
    const dockerDown = spawn('npm', ['run', 'docker:down'], { stdio: 'inherit', shell: true });
    dockerDown.on('close', () => {
      console.log('✅ Docker stopped successfully.');
      process.exit();
    });
  };

  // Catch Ctrl+C and system termination signals
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', cleanup);

  devServer.on('close', (code) => {
    cleanup();
  });
});
