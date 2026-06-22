const { spawn } = require('child_process');

console.log('🚀 Starting Docker infrastructure...');
const dockerUp = spawn('npm', ['run', 'docker:up'], { stdio: 'inherit', shell: true });

dockerUp.on('close', (code) => {
  if (code !== 0) {
    console.error('❌ Failed to start Docker. Exiting.');
    process.exit(code);
  }

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
