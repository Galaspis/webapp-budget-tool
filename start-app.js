const { spawn } = require('child_process');
const open = require('open');

// Customize these paths to match your project structure
const BACKEND_PATH = 'C:\Users\galas\Projects\webapp-budget-tool\backend';
const FRONTEND_PATH = 'C:\Users\galas\Projects\webapp-budget-tool\frontend';
const APP_URL = 'http://localhost:5173/'; // Change to your frontend URL

// Start backend
const backend = spawn('npm', ['run', 'start'], {
  cwd: BACKEND_PATH,
  stdio: 'inherit'
});

// Start frontend
const frontend = spawn('npm', ['run', 'start'], {
  cwd: FRONTEND_PATH,
  stdio: 'inherit'
});

console.log('Starting backend and frontend services...');

// Wait for services to start before opening browser
setTimeout(() => {
  open(APP_URL);
  console.log('Opened browser with application at ' + APP_URL);
}, 5000); // Adjust timing if needed

// Handle graceful shutdown
process.on('SIGINT', () => {
  backend.kill();
  frontend.kill();
  process.exit();
});