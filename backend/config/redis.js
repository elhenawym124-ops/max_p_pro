const getRedisConfig = () => {
    // 1. الأولوية: رابط الاتصال الكامل (مثل Render, Heroku)
    if (process.env.REDIS_URL) {
        const config = {
            url: process.env.REDIS_URL
        };

        // إذا كان الرابط يبدأ بـ rediss:// فهو آمن ويتطلب TLS
        if (process.env.REDIS_URL.startsWith('rediss://')) {
            config.tls = {
                rejectUnauthorized: false // في بعض الأحيان تكون الشهادات موقعة ذاتياً
            };
        }

        return config.url; // ioredis يقبل الرابط مباشرة
    }

    // 2. الخيار الثاني: إعدادات منفصلة (مفيد للإنتاج المخصص VPS)
    // ✅ Improved: Ignore known placeholder values or empty strings
    if (process.env.REDIS_HOST && process.env.REDIS_HOST !== 'production-redis-host') {
        const config = {
            host: process.env.REDIS_HOST,
            port: process.env.REDIS_PORT || 6379,
            password: process.env.REDIS_PASSWORD || undefined,
            // إعدادات إضافية للإنتاج لضمان الاستقرار
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
            maxRetriesPerRequest: null, // مطلوب لـ BullMQ
        };

        // تفعيل TLS فقط إذا تم طلبه صراحة أو كان البورت 6380 (المعتاد للـ TLS)
        if (process.env.REDIS_TLS === 'true' || process.env.REDIS_PORT === '6380') {
            config.tls = {
                rejectUnauthorized: false
            };
        }

        return config;
    }

    // 3. الخيار الثالث: لا يوجد إعدادات (تعطيل Redis)
    return null;
};

const redisConfig = getRedisConfig();

module.exports = redisConfig;
