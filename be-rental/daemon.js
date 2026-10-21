const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const outLogPath = path.join(logDir, 'backend.log');
const errLogPath = path.join(logDir, 'error.log');

function logMessage(msg) {
  const timestamp = new Date().toISOString();
  const formattedMsg = `[${timestamp}] ${msg}\n`;
  console.log(msg);
  fs.appendFileSync(outLogPath, formattedMsg);
}

function startBackend() {
  logMessage('🚀 Memulai proses Backend Node.js...');

  const nodeExec = 'C:\\Program Files\\nodejs\\node.exe';
  const child = spawn(nodeExec, ['index.js'], {
    cwd: __dirname,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  child.stdout.on('data', (data) => {
    fs.appendFileSync(outLogPath, data);
  });

  child.stderr.on('data', (data) => {
    fs.appendFileSync(errLogPath, data);
  });

  child.on('exit', (code, signal) => {
    logMessage(`⚠️ Proses backend selesai dengan exit code ${code} (signal: ${signal})`);
    if (code === 0) {
      logMessage('ℹ️ Backend keluar secara bersih (misal: port sudah dipakai oleh instance lain). Supervisor berhenti.');
      process.exit(0);
    } else {
      logMessage('🔄 Backend terhenti/crash. Melakukan auto-restart dalam 5 detik...');
      setTimeout(startBackend, 5000);
    }
  });

  child.on('error', (err) => {
    logMessage(`❌ Gagal menjalankan child process: ${err.message}`);
    setTimeout(startBackend, 5000);
  });
}

startBackend();
