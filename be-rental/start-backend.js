const { spawn } = require('child_process');
const path = require('path');

const nodeExec = 'C:\\Program Files\\nodejs\\node.exe';
const daemonScript = path.join(__dirname, 'daemon.js');

const child = spawn(nodeExec, [daemonScript], {
  cwd: __dirname,
  detached: true,
  stdio: 'ignore'
});

child.unref();
console.log(`✅ Backend daemon started in background with PID ${child.pid}`);
process.exit(0);
