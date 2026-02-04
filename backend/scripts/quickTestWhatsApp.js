/**
 * 📱 Quick WhatsApp API Test
 * اختبار سريع للتأكد من أن الـ routes تعمل
 */

const axios = require('axios');

const BASE_URL = 'https://maxp-ai.pro/api/v1';

async function quickTest() {
  console.log('\n📱 Quick WhatsApp API Test\n');
  console.log('═'.repeat(50));
  
  const endpoints = [
    { method: 'GET', path: '/whatsapp/sessions' },
    { method: 'GET', path: '/whatsapp/settings' },
    { method: 'GET', path: '/whatsapp/quick-replies' },
    { method: 'GET', path: '/whatsapp/stats' },
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios({
        method: endpoint.method,
        url: `${BASE_URL}${endpoint.path}`,
        validateStatus: () => true // Accept any status
      });
      
      const status = response.status;
      const statusText = status === 401 ? '🔐 Needs Auth' : 
                        status === 200 ? '✅ OK' : 
                        status === 404 ? '❌ Not Found' : 
                        `⚠️ ${status}`;
      
      console.log(`${endpoint.method} ${endpoint.path} → ${statusText}`);
      
    } catch (error) {
      console.log(`${endpoint.method} ${endpoint.path} → ❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n═'.repeat(50));
  console.log('\n✅ Routes are registered if you see "🔐 Needs Auth" (401)');
  console.log('❌ Routes are NOT registered if you see "Not Found" (404)\n');
}

quickTest();
