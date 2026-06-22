const { spawn, execSync } = require('child_process');
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

/**
 * Check Docker container health status using `docker inspect`.
 * Returns 'healthy', 'starting', 'unhealthy', or 'none' (no healthcheck defined).
 */
function getContainerHealth(containerName) {
  try {
    const result = execSync(
      `docker inspect --format "{{.State.Health.Status}}" ${containerName}`,
      { encoding: 'utf-8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();
    return result || 'none';
  } catch (err) {
    return 'not_found';
  }
}

async function waitForInfrastructure() {
  // Containers that have Docker healthchecks defined
  const healthCheckedContainers = [
    { name: 'infra-postgres-1', label: 'PostgreSQL' },
    { name: 'infra-redis-1', label: 'Redis' },
    { name: 'infra-kafka-1', label: 'Kafka' },
    { name: 'infra-emqx-1', label: 'MQTT (EMQX)' },
  ];

  console.log('⏳ Waiting for Docker containers to become healthy...');

  const MAX_WAIT_SECONDS = 120;
  const startTime = Date.now();

  while (true) {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    if (elapsed > MAX_WAIT_SECONDS) {
      console.error(`❌ Timed out after ${MAX_WAIT_SECONDS}s waiting for infrastructure. Exiting.`);
      process.exit(1);
    }

    let allHealthy = true;
    const pending = [];

    for (const container of healthCheckedContainers) {
      const health = getContainerHealth(container.name);
      if (health !== 'healthy') {
        allHealthy = false;
        pending.push(`${container.label}(${health})`);
      }
    }

    if (allHealthy) {
      console.log(`✅ [${elapsed}s] All Docker containers are healthy!`);
      console.log('🔌 Waiting 5 seconds for final initialization...');
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Verify ports are accepting TCP connections
      const portChecks = [
        { name: 'PostgreSQL', port: 5440 },
        { name: 'Redis', port: 6380 },
        { name: 'MQTT (EMQX)', port: 1883 },
        { name: 'Kafka', port: 9092 },
      ];
      for (const svc of portChecks) {
        const ok = await checkPort(svc.port);
        console.log(`  ${ok ? '✅' : '❌'} ${svc.name} :${svc.port}`);
      }

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
              resolve();
            }
          });
        });
      } catch (err) {
        console.warn('⚠️  Migration skipped:', err.message);
      }
      console.log('✅ Infrastructure is ready!\n');
      break;
    }

    console.log(`⏳ [${elapsed}s] Waiting: ${pending.join(', ')}`);
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
}

console.log('🚀 Starting Docker infrastructure...');
const dockerUp = spawn('npm', ['run', 'docker:up'], { stdio: 'inherit', shell: true });

dockerUp.on('close', async (code) => {
  if (code !== 0) {
    console.error('❌ Failed to start Docker. Exiting.');
    process.exit(code);
  }

  // Wait for all containers to report healthy via Docker's native healthchecks
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
