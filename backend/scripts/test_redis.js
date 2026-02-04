const Redis = require('ioredis');

const redis = new Redis({
    host: '127.0.0.1',
    port: 6379,
    connectTimeout: 5000,
    maxRetriesPerRequest: 1
});

redis.ping().then((result) => {
    console.log('Redis ping result:', result);
    redis.quit();
    process.exit(0);
}).catch((err) => {
    console.error('Redis connection failed:', err.message);
    redis.quit();
    process.exit(1);
});
