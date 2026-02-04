/**
 * Super Admin Endpoints Testing Script
 * يختبر جميع endpoints ويسجل الأخطاء
 */

const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'https://maxp-ai.pro/api/v1';
let TOKEN = '';

// تسجيل الدخول أولاً للحصول على التوكن
async function login() {
    try {
        const response = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'admin@superadmin.com',
            password: 'Admin@123456'
        });
        return response.data.token;
    } catch (error) {
        console.error('❌ فشل تسجيل الدخول:', error.response?.data || error.message);
        process.exit(1);
    }
}

// دالة الاختبار
async function testEndpoint(name, method, url, data = null) {
    try {
        const config = {
            method,
            url: `${BASE_URL}${url}`,
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            }
        };

        if (data) {
            config.data = data;
        }

        const response = await axios(config);
        console.log(`✅ ${name}: نجح`);
        return { success: true, name, url, status: response.status };
    } catch (error) {
        const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message;
        console.error(`❌ ${name}: فشل - ${errorMsg}`);
        return { 
            success: false, 
            name, 
            url, 
            status: error.response?.status,
            error: errorMsg,
            details: error.response?.data
        };
    }
}

// قائمة جميع الـ endpoints للاختبار
const endpoints = {
    dashboard: [
        { name: 'لوحة التحكم - الإحصائيات', method: 'GET', url: '/admin/statistics' },
        { name: 'لوحة التحكم - المستخدمين النشطين', method: 'GET', url: '/admin/active-users' },
    ],
    
    companies: [
        { name: 'الشركات - قائمة الشركات', method: 'GET', url: '/companies?page=1&limit=10' },
        { name: 'الشركات - إحصائيات', method: 'GET', url: '/companies/stats' },
    ],
    
    subscriptions: [
        { name: 'الاشتراكات - قائمة الاشتراكات', method: 'GET', url: '/super-admin/platform/subscriptions' },
        { name: 'الفواتير - نظرة عامة', method: 'GET', url: '/super-admin/platform/billing-overview' },
        { name: 'السوق - إحصائيات', method: 'GET', url: '/super-admin/platform/marketplace-stats' },
    ],
    
    reports: [
        { name: 'التقارير - AI Logs', method: 'GET', url: '/super-admin/ai-logs?page=1&limit=10' },
        { name: 'التقارير - Key Stats', method: 'GET', url: '/super-admin/key-stats' },
        { name: 'التقارير - Image Statistics', method: 'GET', url: '/super-admin/image-statistics' },
        { name: 'التقارير - Server Usage', method: 'GET', url: '/super-admin/server-usage' },
    ],
    
    aiKeys: [
        { name: 'المفاتيح - قائمة المفاتيح', method: 'GET', url: '/super-admin/ai/keys' },
        { name: 'المفاتيح - الإعدادات العامة', method: 'GET', url: '/super-admin/ai/config' },
    ],
    
    monitoring: [
        { name: 'المراقبة - Orphaned Files', method: 'GET', url: '/super-admin/image-stats/orphaned-stats' },
        { name: 'المراقبة - Compression Status', method: 'GET', url: '/super-admin/image-stats/compress/status' },
    ],
    
    systemManagement: [
        { name: 'النظام - قائمة الأنظمة', method: 'GET', url: '/admin/systems' },
        { name: 'النظام - إحصائيات الأنظمة', method: 'GET', url: '/admin/systems/stats' },
    ],
    
    development: [
        { name: 'التطوير - Dashboard', method: 'GET', url: '/super-admin/dev/dashboard' },
        { name: 'التطوير - Unified Dashboard', method: 'GET', url: '/super-admin/dev/unified?period=0' },
        { name: 'التطوير - Projects', method: 'GET', url: '/super-admin/dev/projects' },
        { name: 'التطوير - Tasks', method: 'GET', url: '/super-admin/dev/tasks' },
        { name: 'التطوير - Team', method: 'GET', url: '/super-admin/dev/team' },
        { name: 'التطوير - Settings', method: 'GET', url: '/super-admin/dev/settings' },
        { name: 'التطوير - Active Timer', method: 'GET', url: '/super-admin/dev/timer/active' },
        { name: 'التطوير - All Active Timers', method: 'GET', url: '/super-admin/dev/timer/all-active' },
        { name: 'التطوير - Reports', method: 'GET', url: '/super-admin/dev/reports' },
        { name: 'التطوير - Leaderboard', method: 'GET', url: '/super-admin/dev/leaderboard' },
    ],
    
    timeTracking: [
        { name: 'تتبع الوقت - Dashboard', method: 'GET', url: '/super-admin/time-tracking/dashboard' },
        { name: 'تتبع الوقت - Live Activity', method: 'GET', url: '/super-admin/time-tracking/live' },
        { name: 'تتبع الوقت - Logs', method: 'GET', url: '/super-admin/time-tracking/logs' },
        { name: 'تتبع الوقت - Members', method: 'GET', url: '/super-admin/time-tracking/members' },
        { name: 'تتبع الوقت - Analytics', method: 'GET', url: '/super-admin/time-tracking/analytics' },
    ],
    
    users: [
        { name: 'المستخدمين - قائمة Super Admins', method: 'GET', url: '/super-admin/users' },
        { name: 'المستخدمين - الصلاحيات الحالية', method: 'GET', url: '/super-admin/user/permissions' },
    ]
};

// تشغيل الاختبارات
async function runTests() {
    console.log('🚀 بدء اختبار Super Admin Endpoints...\n');
    
    // تسجيل الدخول
    console.log('🔐 تسجيل الدخول...');
    TOKEN = await login();
    console.log('✅ تم تسجيل الدخول بنجاح\n');
    
    const results = {
        total: 0,
        passed: 0,
        failed: 0,
        errors: []
    };
    
    // اختبار كل قسم
    for (const [section, tests] of Object.entries(endpoints)) {
        console.log(`\n📂 اختبار قسم: ${section}`);
        console.log('='.repeat(50));
        
        for (const test of tests) {
            results.total++;
            const result = await testEndpoint(test.name, test.method, test.url, test.data);
            
            if (result.success) {
                results.passed++;
            } else {
                results.failed++;
                results.errors.push(result);
            }
            
            // انتظار قصير بين الطلبات
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    // طباعة النتائج النهائية
    console.log('\n\n📊 ملخص النتائج:');
    console.log('='.repeat(50));
    console.log(`✅ نجح: ${results.passed}/${results.total}`);
    console.log(`❌ فشل: ${results.failed}/${results.total}`);
    console.log(`📈 نسبة النجاح: ${((results.passed / results.total) * 100).toFixed(2)}%`);
    
    if (results.errors.length > 0) {
        console.log('\n\n❌ الأخطاء المكتشفة:');
        console.log('='.repeat(50));
        results.errors.forEach((error, index) => {
            console.log(`\n${index + 1}. ${error.name}`);
            console.log(`   URL: ${error.url}`);
            console.log(`   Status: ${error.status}`);
            console.log(`   Error: ${error.error}`);
            if (error.details) {
                console.log(`   Details:`, JSON.stringify(error.details, null, 2));
            }
        });
        
        // حفظ الأخطاء في ملف
        fs.writeFileSync(
            'super-admin-errors.json',
            JSON.stringify(results.errors, null, 2)
        );
        console.log('\n💾 تم حفظ تفاصيل الأخطاء في: super-admin-errors.json');
    }
}

// تشغيل الاختبار
runTests().catch(console.error);
