const RedisServer = require('redis-server');
const path = require('path');

// Path to the redis-server executable
// Adjusting for the fact that this script is in backend/scripts
const binPath = path.join(__dirname, '../redis_setup/bin/redis-server.exe');

console.log(`Attempting to start Redis server using binary at: ${binPath}`);

const server = new RedisServer({
    port: 6379,
    bin: binPath
});

server.open((err) => {
    if (err === null) {
        console.log('Redis server is listening on port 6379');
        // Keep the process alive
    } else {
        console.error(`Error starting Redis: ${err.message}`);
        console.error(err);
        process.exit(1);
    }
});
