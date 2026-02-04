const child_process = require('child_process');
console.log('Starting server wrapper...');
const proc = child_process.spawn('node', ['server.js'], { stdio: 'inherit', cwd: __dirname });
proc.on('exit', (code, signal) => {
    console.log(`Server exited with code ${code} and signal ${signal}`);
});
proc.on('error', (err) => {
    console.error('Failed to start server:', err);
});
console.log('Spawned server process:', proc.pid);
