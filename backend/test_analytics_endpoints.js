const axios = require('axios');

// قائمة بجميع الـ analytics endpoints
const endpoints = [
  { name: 'Store Analytics', url: '/api/v1/analytics/store' },
  { name: 'Conversion Rate', url: '/api/v1/analytics/conversion-rate' },
  { name: 'Daily Analytics', url: '/api/v1/analytics/daily' },
  { name: 'Product Analytics', url: '/api/v1/analytics/products/analytics' },
  { name: 'Variations Analytics', url: '/api/v1/analytics/variations' },
  { name: 'Categories Analytics', url: '/api/v1/analytics/categories' },
  { name: 'Payment Methods', url: '/api/v1/analytics/payment-methods' },
  { name: 'Regions Analytics', url: '/api/v1/analytics/regions' },
  { name: 'Coupons Analytics', url: '/api/v1/analytics/coupons' },
  { name: 'COD Performance', url: '/api/v1/analytics/cod-performance' },
  { name: 'Abandoned Carts', url: '/api/v1/analytics/abandoned-carts' },
  { name: 'Customer Quality', url: '/api/v1/analytics/customer-quality' },
  { name: 'Profit Analytics', url: '/api/v1/analytics/profit' },
  { name: 'Delivery Rate', url: '/api/v1/analytics/delivery-rate' },
  { name: 'Order Status Time', url: '/api/v1/analytics/order-status-time' },
  { name: 'Product Health', url: '/api/v1/analytics/product-health' },
  { name: 'Returns Analytics', url: '/api/v1/analytics/returns' },
  { name: 'Team Performance', url: '/api/v1/analytics/team-performance' },
  { name: 'Funnel Analytics', url: '/api/v1/analytics/funnel' },
  { name: 'Stock Forecast', url: '/api/v1/analytics/stock-forecast' },
  { name: 'Comprehensive Dashboard', url: '/api/v1/analytics/comprehensive-dashboard' }
];

async function testEndpoint(endpoint, token) {
  try {
    const response = await axios.get(`https://maxp-ai.pro${endpoint.url}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        period: '30'
      },
      timeout: 10000
    });
    
    if (response.data.success) {
      console.log(`✅ ${endpoint.name}: SUCCESS`);
      return { name: endpoint.name, status: 'success' };
    } else {
      console.log(`⚠️  ${endpoint.name}: Response not successful`);
      return { name: endpoint.name, status: 'warning', message: 'Response not successful' };
    }
  } catch (error) {
    console.log(`❌ ${endpoint.name}: ERROR - ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Message: ${error.response.data?.message || 'No message'}`);
      return { 
        name: endpoint.name, 
        status: 'error', 
        statusCode: error.response.status,
        message: error.response.data?.message || error.message 
      };
    }
    return { name: endpoint.name, status: 'error', message: error.message };
  }
}

async function testAllEndpoints() {
  console.log('🔍 Testing all analytics endpoints...\n');
  
  // يجب وضع token صحيح هنا
  const token = process.env.TEST_TOKEN || 'YOUR_TOKEN_HERE';
  
  if (token === 'YOUR_TOKEN_HERE') {
    console.log('❌ Please set TEST_TOKEN environment variable or update the token in the script');
    return;
  }
  
  const results = [];
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint, token);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 100)); // تأخير بسيط بين الطلبات
  }
  
  console.log('\n📊 Summary:');
  console.log('='.repeat(50));
  
  const successful = results.filter(r => r.status === 'success').length;
  const warnings = results.filter(r => r.status === 'warning').length;
  const errors = results.filter(r => r.status === 'error').length;
  
  console.log(`✅ Successful: ${successful}/${results.length}`);
  console.log(`⚠️  Warnings: ${warnings}/${results.length}`);
  console.log(`❌ Errors: ${errors}/${results.length}`);
  
  if (errors > 0) {
    console.log('\n❌ Failed endpoints:');
    results.filter(r => r.status === 'error').forEach(r => {
      console.log(`   - ${r.name}: ${r.message}`);
    });
  }
}

testAllEndpoints().catch(console.error);
