/**
 * اختبار الاتصال بـ Redis
 * 
 * هذا السكربت يختبر الاتصال بـ Redis باستخدام الإعدادات الافتراضية
 */

const Redis = require('ioredis');
const redisConfig = require('../config/redis');

async function testRedisConnection() {
    console.log('🔍 اختبار الاتصال بـ Redis...\n');
    
    console.log('📋 إعدادات الاتصال:');
    console.log('   Redis URL:', typeof redisConfig === 'string' ? redisConfig : JSON.stringify(redisConfig));
    console.log('\n⏳ محاولة الاتصال...\n');

    let redis;

    try {
        // إنشاء اتصال Redis
        redis = new Redis(redisConfig);

        // اختبار الاتصال - PING
        const pong = await redis.ping();
        console.log('✅ الاتصال نجح!');
        console.log('   استجابة PING:', pong);

        // اختبار SET/GET
        console.log('\n📝 اختبار SET/GET...');
        await redis.set('test:key', 'Hello Redis!');
        const value = await redis.get('test:key');
        console.log('   ✅ SET نجح');
        console.log('   ✅ GET نجح - القيمة:', value);

        // اختبار DELETE
        const deleted = await redis.del('test:key');
        console.log('   ✅ DELETE نجح - عدد المفاتيح المحذوفة:', deleted);

        // معلومات عن Redis
        console.log('\n📊 معلومات Redis:');
        const info = await redis.info('server');
        const lines = info.split('\r\n');
        const redisVersion = lines.find(line => line.startsWith('redis_version:'));
        if (redisVersion) {
            console.log('   ', redisVersion);
        }

        // إحصائيات قاعدة البيانات
        const dbSize = await redis.dbsize();
        console.log('   عدد المفاتيح في قاعدة البيانات:', dbSize);

        // اختبار BullMQ - إنشاء Queue بسيط
        console.log('\n🔧 اختبار BullMQ...');
        try {
            const { Queue } = require('bullmq');
            const testQueue = new Queue('test-queue', { connection: redisConfig });
            console.log('   ✅ Queue تم إنشاؤه بنجاح');
            
            // إضافة مهمة اختبار
            const job = await testQueue.add('test-job', { message: 'Test job data' });
            console.log('   ✅ تمت إضافة مهمة - Job ID:', job.id);

            // الحصول على معلومات المهمة
            const jobState = await job.getState();
            console.log('   ✅ حالة المهمة:', jobState);

            // تنظيف
            await testQueue.close();
            console.log('   ✅ تم إغلاق Queue');
        } catch (bullmqError) {
            console.log('   ⚠️  BullMQ غير متاح (هذا طبيعي إذا لم يكن مثبتاً)');
        }

        console.log('\n✅ جميع الاختبارات نجحت! Redis يعمل بشكل صحيح.');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ فشل الاتصال!');
        console.error('   نوع الخطأ:', error.name);
        console.error('   رسالة الخطأ:', error.message);
        console.error('   رمز الخطأ:', error.code);
        
        if (error.code === 'ECONNREFUSED') {
            console.error('\n💡 نصيحة: تأكد من أن Redis يعمل على العنوان:', 
                typeof redisConfig === 'string' ? redisConfig : `${redisConfig.host}:${redisConfig.port}`);
            console.error('   يمكنك تشغيل Redis باستخدام: redis-server');
        }
        
        console.error('\nتفاصيل الخطأ الكاملة:');
        console.error(error);
        process.exit(1);
    } finally {
        if (redis) {
            await redis.quit();
            console.log('\n🔌 تم إغلاق الاتصال بـ Redis');
        }
    }
}

testRedisConnection();

