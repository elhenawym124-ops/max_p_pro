const { exec } = require('child_process');

const PORT = 3000;

function killPort(port) {
    const command = process.platform === 'win32'
        ? `netstat -ano | findstr :${port}`
        : `lsof -i :${port} -t`;

    exec(command, (err, stdout) => {
        if (err || !stdout) return;

        const pids = stdout.split('\n')
            .map(line => {
                const parts = line.trim().split(/\s+/);
                return parts[parts.length - 1]; // PID is last column
            })
            .filter(pid => pid && !isNaN(pid));

        if (pids.length > 0) {
            const uniquePids = [...new Set(pids)];
            console.log(`Killing processes on port ${port}: ${uniquePids.join(', ')}`);
            uniquePids.forEach(pid => {
                exec(`taskkill /F /PID ${pid} /T`, () => { }); // Windows kill
            });
        }
    });
}

killPort(PORT);
