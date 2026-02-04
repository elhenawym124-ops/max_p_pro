#!/usr/bin/env node

/**
 * سكريبت تشخيص مشاكل التحديث المباشر وإعدادات الذكاء الاصطناعي
 * Real-time Issues Diagnostic Script
 * 
 * يفحص:
 * 1. Socket.IO connections
 * 2. AI settings persistence
 * 3. Message notifications
 * 4. Database connectivity
 */

const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const WebSocket = require('ws');

const prisma = new PrismaClient();

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'https://maxp-ai.pro';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const API_BASE = `${BACKEND_URL}/api/v1`;

class DiagnosticTool {
  constructor() {
    this.results = {
      database: { status: 'pending', details: [] },
      socketIO: { status: 'pending', details: [] },
      aiSettings: { status: 'pending', details: [] },
      messageFlow: { status: 'pending', details: [] }
    };
  }

  async runDiagnostics() {
    console.log('🔍 بدء تشخيص مشاكل النظام...\n');
    
    try {
      await this.testDatabaseConnection();
      await this.testAISettingsPersistence();
      await this.testSocketIOConnection();
      await this.testMessageFlow();
      
      this.printResults();
      await this.provideSolutions();
      
    } catch (error) {
      console.error('❌ خطأ في تشغيل التشخيص:', error);
    } finally {
      await prisma.$disconnect();
    }
  }

  async testDatabaseConnection() {
    console.log('📊 فحص اتصال قاعدة البيانات...');
    
    try {
      // Test basic connection
      await prisma.$connect();
      this.results.database.details.push('✅ الاتصال بقاعدة البيانات يعمل');
      
      // Test AI settings table
      const aiSettingsCount = await prisma.aiSettings.count();
      this.results.database.details.push(`📊 عدد إعدادات الذكاء الاصطناعي: ${aiSettingsCount}`);
      
      // Test companies table
      const companiesCount = await prisma.company.count();
      this.results.database.details.push(`🏢 عدد الشركات: ${companiesCount}`);
      
      // Test messages table
      const messagesCount = await prisma.message.count();
      this.results.database.details.push(`💬 عدد الرسائل: ${messagesCount}`);
      
      this.results.database.status = 'success';
      
    } catch (error) {
      this.results.database.status = 'error';
      this.results.database.details.push(`❌ خطأ في قاعدة البيانات: ${error.message}`);
    }
  }

  async testAISettingsPersistence() {
    console.log('🤖 فحص حفظ إعدادات الذكاء الاصطناعي...');
    
    try {
      // Get all companies with AI settings
      const companies = await prisma.company.findMany({
        include: {
          aiSettings: true
        },
        take: 5 // Test first 5 companies
      });

      if (companies.length === 0) {
        this.results.aiSettings.details.push('⚠️ لا توجد شركات في قاعدة البيانات');
        this.results.aiSettings.status = 'warning';
        return;
      }

      for (const company of companies) {
        const companyName = company.name || `Company-${company.id.slice(-8)}`;
        
        if (!company.aiSettings) {
          this.results.aiSettings.details.push(`⚠️ ${companyName}: لا توجد إعدادات ذكاء اصطناعي`);
          continue;
        }

        const ai = company.aiSettings;
        const status = ai.autoReplyEnabled ? '✅ مُفعل' : '❌ معطل';
        const lastUpdate = ai.updatedAt ? new Date(ai.updatedAt).toLocaleString('ar-EG') : 'غير محدد';
        
        this.results.aiSettings.details.push(
          `🏢 ${companyName}: ${status} (آخر تحديث: ${lastUpdate})`
        );
      }

      // Test API endpoint
      try {
        const testCompany = companies[0];
        const response = await axios.get(`${API_BASE}/settings/ai`, {
          headers: {
            'Authorization': 'Bearer mock-access-token',
            'Content-Type': 'application/json'
          }
        });

        if (response.status === 200) {
          this.results.aiSettings.details.push('✅ API endpoint /settings/ai يعمل بشكل صحيح');
          
          // Test update
          const updateResponse = await axios.put(`${API_BASE}/settings/ai`, {
            autoReplyEnabled: !response.data.data.autoReplyEnabled
          }, {
            headers: {
              'Authorization': 'Bearer mock-access-token',
              'Content-Type': 'application/json'
            }
          });

          if (updateResponse.status === 200) {
            this.results.aiSettings.details.push('✅ تحديث إعدادات الذكاء الاصطناعي يعمل');
            
            // Revert the change
            await axios.put(`${API_BASE}/settings/ai`, {
              autoReplyEnabled: response.data.data.autoReplyEnabled
            }, {
              headers: {
                'Authorization': 'Bearer mock-access-token',
                'Content-Type': 'application/json'
              }
            });
            
          } else {
            this.results.aiSettings.details.push('❌ فشل في تحديث إعدادات الذكاء الاصطناعي');
          }
        }
      } catch (apiError) {
        this.results.aiSettings.details.push(`❌ خطأ في API: ${apiError.message}`);
      }

      this.results.aiSettings.status = 'success';
      
    } catch (error) {
      this.results.aiSettings.status = 'error';
      this.results.aiSettings.details.push(`❌ خطأ في فحص إعدادات الذكاء الاصطناعي: ${error.message}`);
    }
  }

  async testSocketIOConnection() {
    console.log('🔌 فحص اتصال Socket.IO...');
    
    return new Promise((resolve) => {
      try {
        const socket = new WebSocket(`ws://localhost:3010/socket.io/?EIO=4&transport=websocket`);
        
        const timeout = setTimeout(() => {
          this.results.socketIO.status = 'error';
          this.results.socketIO.details.push('❌ انتهت مهلة الاتصال بـ Socket.IO');
          socket.close();
          resolve();
        }, 5000);

        socket.on('open', () => {
          clearTimeout(timeout);
          this.results.socketIO.status = 'success';
          this.results.socketIO.details.push('✅ Socket.IO متاح ويقبل الاتصالات');
          socket.close();
          resolve();
        });

        socket.on('error', (error) => {
          clearTimeout(timeout);
          this.results.socketIO.status = 'error';
          this.results.socketIO.details.push(`❌ خطأ في Socket.IO: ${error.message}`);
          resolve();
        });

      } catch (error) {
        this.results.socketIO.status = 'error';
        this.results.socketIO.details.push(`❌ فشل في الاتصال بـ Socket.IO: ${error.message}`);
        resolve();
      }
    });
  }

  async testMessageFlow() {
    console.log('💬 فحص تدفق الرسائل...');
    
    try {
      // Get recent messages
      const recentMessages = await prisma.message.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          conversation: {
            include: {
              customer: true
            }
          }
        }
      });

      if (recentMessages.length === 0) {
        this.results.messageFlow.details.push('⚠️ لا توجد رسائل حديثة في قاعدة البيانات');
        this.results.messageFlow.status = 'warning';
        return;
      }

      this.results.messageFlow.details.push(`📊 تم العثور على ${recentMessages.length} رسائل حديثة`);

      // Check message metadata for socket events
      let socketEventsFound = 0;
      for (const message of recentMessages) {
        if (message.metadata) {
          try {
            const metadata = JSON.parse(message.metadata);
            if (metadata.socketEmitted || metadata.facebookMessageId) {
              socketEventsFound++;
            }
          } catch (e) {
            // Ignore parsing errors
          }
        }
      }

      this.results.messageFlow.details.push(`🔌 ${socketEventsFound} رسائل تحتوي على معلومات Socket`);

      // Check conversations
      const activeConversations = await prisma.conversation.count({
        where: { status: 'ACTIVE' }
      });

      this.results.messageFlow.details.push(`💬 ${activeConversations} محادثة نشطة`);

      this.results.messageFlow.status = 'success';
      
    } catch (error) {
      this.results.messageFlow.status = 'error';
      this.results.messageFlow.details.push(`❌ خطأ في فحص تدفق الرسائل: ${error.message}`);
    }
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 نتائج التشخيص');
    console.log('='.repeat(60));

    for (const [category, result] of Object.entries(this.results)) {
      const statusIcon = result.status === 'success' ? '✅' : 
                        result.status === 'warning' ? '⚠️' : '❌';
      
      console.log(`\n${statusIcon} ${this.getCategoryName(category)}:`);
      result.details.forEach(detail => console.log(`   ${detail}`));
    }
  }

  getCategoryName(category) {
    const names = {
      database: 'قاعدة البيانات',
      socketIO: 'Socket.IO',
      aiSettings: 'إعدادات الذكاء الاصطناعي',
      messageFlow: 'تدفق الرسائل'
    };
    return names[category] || category;
  }

  async provideSolutions() {
    console.log('\n' + '='.repeat(60));
    console.log('💡 الحلول المقترحة');
    console.log('='.repeat(60));

    // Database issues
    if (this.results.database.status === 'error') {
      console.log('\n🔧 مشاكل قاعدة البيانات:');
      console.log('   1. تأكد من تشغيل قاعدة البيانات');
      console.log('   2. فحص متغيرات البيئة DATABASE_URL');
      console.log('   3. تشغيل: npx prisma db push');
    }

    // AI Settings issues
    if (this.results.aiSettings.status === 'error' || this.results.aiSettings.status === 'warning') {
      console.log('\n🤖 مشاكل إعدادات الذكاء الاصطناعي:');
      console.log('   1. تشغيل سكريبت فحص الحالة: node scripts/check-ai-status.js');
      console.log('   2. فحص مسارات API في settingsRoutes.js');
      console.log('   3. التأكد من صحة التوكن في الواجهة');
    }

    // Socket.IO issues
    if (this.results.socketIO.status === 'error') {
      console.log('\n🔌 مشاكل Socket.IO:');
      console.log('   1. التأكد من تشغيل الخادم الخلفي على المنفذ 3010');
      console.log('   2. فحص إعدادات CORS في socketService.js');
      console.log('   3. فحص اتصال الواجهة بـ Socket.IO');
      console.log('   4. إعادة تشغيل الخادم الخلفي');
    }

    // Message flow issues
    if (this.results.messageFlow.status === 'error' || this.results.messageFlow.status === 'warning') {
      console.log('\n💬 مشاكل تدفق الرسائل:');
      console.log('   1. فحص webhook Facebook');
      console.log('   2. التأكد من إرسال Socket events في allFunctions.js');
      console.log('   3. فحص استقبال الواجهة للأحداث');
    }

    console.log('\n🔧 أوامر مفيدة:');
    console.log('   - فحص حالة الذكاء الاصطناعي: node scripts/check-ai-status.js');
    console.log('   - إعادة تشغيل الخادم: npm run start');
    console.log('   - فحص قاعدة البيانات: npx prisma studio');
  }
}

// تشغيل التشخيص
const diagnostic = new DiagnosticTool();
diagnostic.runDiagnostics().catch(console.error);

// التعامل مع إغلاق السكريبت
process.on('SIGINT', async () => {
  console.log('\n\n👋 إغلاق سكريبت التشخيص...');
  await prisma.$disconnect();
  process.exit(0);
});
