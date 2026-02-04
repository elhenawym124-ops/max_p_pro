const mysql = require('mysql2/promise');

async function testConnection() {
    console.log('🔍 Testing remote database connection...\n');

    const config = {
        host: '92.113.22.70',
        port: 3306,
        user: 'u339372869_test2',
        password: '0165676135Aa@A',
        database: 'u339372869_test2',
        connectTimeout: 10000
    };

    try {
        console.log('📍 Host:', config.host);
        console.log('🔌 Port:', config.port);
        console.log('👤 User:', config.user);
        console.log('💾 Database:', config.database);
        console.log('\n⏳ Attempting connection...\n');

        const connection = await mysql.createConnection(config);

        console.log('✅ Connection successful!\n');

        // Test query
        const [rows] = await connection.execute('SELECT 1 as test');
        console.log('✅ Test query successful:', rows);

        // Get database version
        const [version] = await connection.execute('SELECT VERSION() as version');
        console.log('📊 MySQL Version:', version[0].version);

        // Count companies
        const [companies] = await connection.execute('SELECT COUNT(*) as count FROM Company');
        console.log('🏢 Total Companies:', companies[0].count);

        await connection.end();
        console.log('\n✅ All tests passed! Database is accessible.');

    } catch (error) {
        console.error('\n❌ Connection failed!');
        console.error('Error Code:', error.code);
        console.error('Error Message:', error.message);
        console.error('\nFull Error:', error);
        process.exit(1);
    }
}

testConnection();
