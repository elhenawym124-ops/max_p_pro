/**
 * 📱 Complete WhatsApp API Test
 * اختبار شامل لجميع endpoints الـ WhatsApp
 */

const axios = require('axios');

const BASE_URL = 'https://maxp-ai.pro/api/v1';
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️ ${msg}${colors.reset}`),
  title: (msg) => console.log(`\n${colors.cyan}═══ ${msg} ═══${colors.reset}\n`),
  step: (msg) => console.log(`${colors.magenta}🔸 ${msg}${colors.reset}`),
};

async function completeTest() {
  log.title('📱 Complete WhatsApp API Test Suite');
  
  let token = '';
  let testResults = {
    passed: 0,
    failed: 0,
    total: 0
  };
  
  function recordResult(name, success, details = '') {
    testResults.total++;
    if (success) {
      testResults.passed++;
      log.success(`${name} ${details ? `- ${details}` : ''}`);
    } else {
      testResults.failed++;
      log.error(`${name} ${details ? `- ${details}` : ''}`);
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // 🔐 Step 1: Authentication
  // ═══════════════════════════════════════════════════════════════════════════════
  
  log.title('🔐 Step 1: Authentication');
  
  try {
    log.step('Attempting login...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'ali@ali.com',
      password: 'admin123'
    });
    
    if (loginRes.data.success && loginRes.data.data.token) {
      token = loginRes.data.data.token;
      recordResult('Login', true, 'Token received');
      log.info(`User: ${loginRes.data.data.user.email} (${loginRes.data.data.user.role})`);
      log.info(`Company: ${loginRes.data.data.user.company.name}`);
    } else {
      recordResult('Login', false, 'No token in response');
      return;
    }
  } catch (error) {
    recordResult('Login', false, error.response?.data?.message || error.message);
    return;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // 🧪 Step 2: Route Registration Test (without auth)
  // ═══════════════════════════════════════════════════════════════════════════════
  
  log.title('🧪 Step 2: Route Registration Test');
  
  const endpoints = [
    '/whatsapp/sessions',
    '/whatsapp/settings', 
    '/whatsapp/quick-replies',
    '/whatsapp/stats'
  ];
  
  for (const endpoint of endpoints) {
    try {
      log.step(`Testing ${endpoint} without auth...`);
      const res = await axios.get(`${BASE_URL}${endpoint}`, {
        validateStatus: () => true
      });
      
      if (res.status === 401) {
        recordResult(`Route ${endpoint}`, true, 'Registered (needs auth)');
      } else if (res.status === 404) {
        recordResult(`Route ${endpoint}`, false, 'Not registered (404)');
      } else {
        recordResult(`Route ${endpoint}`, false, `Unexpected status: ${res.status}`);
      }
    } catch (error) {
      recordResult(`Route ${endpoint}`, false, `Network error: ${error.message}`);
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // 🔑 Step 3: Authenticated API Tests
  // ═══════════════════════════════════════════════════════════════════════════════
  
  log.title('🔑 Step 3: Authenticated API Tests');
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  // Test GET endpoints
  for (const endpoint of endpoints) {
    try {
      log.step(`Testing ${endpoint} with auth...`);
      const res = await axios.get(`${BASE_URL}${endpoint}`, {
        headers,
        validateStatus: () => true
      });
      
      if (res.status === 200) {
        recordResult(`Auth ${endpoint}`, true, 'Success');
        log.info(`Response keys: ${Object.keys(res.data).join(', ')}`);
      } else if (res.status === 404) {
        recordResult(`Auth ${endpoint}`, false, 'Route not found after auth');
      } else {
        recordResult(`Auth ${endpoint}`, false, `Status: ${res.status}`);
        if (res.data?.error) log.warning(`Error: ${res.data.error}`);
      }
    } catch (error) {
      recordResult(`Auth ${endpoint}`, false, error.message);
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // 📝 Step 4: Create/Update Tests
  // ═══════════════════════════════════════════════════════════════════════════════
  
  log.title('📝 Step 4: Create/Update Tests');
  
  // Test creating a session
  try {
    log.step('Testing session creation...');
    const sessionRes = await axios.post(`${BASE_URL}/whatsapp/sessions`, {
      name: `Test Session ${Date.now()}`,
      aiEnabled: true,
      autoReply: false,
      aiMode: 'suggest'
    }, { headers, validateStatus: () => true });
    
    if (sessionRes.status === 201) {
      recordResult('Create Session', true, `ID: ${sessionRes.data.session?.id}`);
    } else if (sessionRes.status === 400) {
      recordResult('Create Session', true, 'Max sessions reached (expected)');
    } else {
      recordResult('Create Session', false, `Status: ${sessionRes.status}`);
    }
  } catch (error) {
    recordResult('Create Session', false, error.message);
  }
  
  // Test creating a quick reply
  try {
    log.step('Testing quick reply creation...');
    const qrRes = await axios.post(`${BASE_URL}/whatsapp/quick-replies`, {
      title: 'Test Quick Reply',
      shortcut: `/test${Date.now()}`,
      content: 'مرحباً {{customer_name}}، شكراً لتواصلك معنا!',
      category: 'greeting'
    }, { headers, validateStatus: () => true });
    
    if (qrRes.status === 201) {
      recordResult('Create Quick Reply', true, `ID: ${qrRes.data.quickReply?.id}`);
      
      // Test deleting it
      const deleteRes = await axios.delete(`${BASE_URL}/whatsapp/quick-replies/${qrRes.data.quickReply.id}`, {
        headers,
        validateStatus: () => true
      });
      
      if (deleteRes.status === 200) {
        recordResult('Delete Quick Reply', true, 'Cleanup successful');
      } else {
        recordResult('Delete Quick Reply', false, `Status: ${deleteRes.status}`);
      }
    } else {
      recordResult('Create Quick Reply', false, `Status: ${qrRes.status}`);
    }
  } catch (error) {
    recordResult('Create Quick Reply', false, error.message);
  }
  
  // Test updating settings
  try {
    log.step('Testing settings update...');
    const settingsRes = await axios.put(`${BASE_URL}/whatsapp/settings`, {
      isEnabled: true,
      maxSessions: 3,
      notificationSound: true,
      browserNotifications: true,
      defaultAIMode: 'suggest'
    }, { headers, validateStatus: () => true });
    
    if (settingsRes.status === 200) {
      recordResult('Update Settings', true, 'Settings updated');
    } else {
      recordResult('Update Settings', false, `Status: ${settingsRes.status}`);
    }
  } catch (error) {
    recordResult('Update Settings', false, error.message);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // 📊 Final Results
  // ═══════════════════════════════════════════════════════════════════════════════
  
  log.title('📊 Test Results Summary');
  
  console.log(`\n${colors.green}✅ Passed: ${testResults.passed}${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${testResults.failed}${colors.reset}`);
  console.log(`📊 Total: ${testResults.total}\n`);
  
  const successRate = ((testResults.passed / testResults.total) * 100).toFixed(1);
  
  if (testResults.failed === 0) {
    log.success(`🎉 All tests passed! WhatsApp API is fully functional.`);
  } else if (successRate >= 80) {
    log.warning(`⚠️ Most tests passed (${successRate}%). Minor issues detected.`);
  } else {
    log.error(`❌ Multiple failures detected (${successRate}% success rate). Check server restart.`);
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log('🔧 Next steps:');
  console.log('1. If routes show 404 with auth: Restart the backend server');
  console.log('2. If auth fails: Check JWT_SECRET and user credentials');
  console.log('3. If database errors: Run "npx prisma db push"');
  console.log('4. Test frontend: Open http://localhost:3000/whatsapp/settings');
  console.log('═'.repeat(60) + '\n');
}

completeTest().catch(console.error);
