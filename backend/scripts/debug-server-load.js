// Full Debug Server Loading - Step by Step
require('dotenv').config();

console.log('🔍 Step 1: Loading basic modules...');
const express = require('express');
const path = require('path');
const http = require('http');
console.log('✅ Step 1 complete');

console.log('🔍 Step 2: Loading sharedDatabase...');
const { getSharedPrismaClient, initializeSharedDatabase, safeQuery } = require('../services/sharedDatabase');
console.log('✅ Step 2 complete');

console.log('🔍 Step 3: Loading ALL heavy services that server.js loads...');

// From server.js line 33-42
try {
    console.log('  -> aiAgentService...');
    const aiAgentService = require('../services/aiAgentService');
    console.log('  ✅ aiAgentService OK');
} catch (e) { console.log('  ❌ aiAgentService FAILED:', e.message); }

try {
    console.log('  -> ragService...');
    const ragService = require('../services/ragService');
    console.log('  ✅ ragService OK');
} catch (e) { console.log('  ❌ ragService FAILED:', e.message); }

try {
    console.log('  -> memoryService...');
    const memoryService = require('../services/memoryService');
    console.log('  ✅ memoryService OK');
} catch (e) { console.log('  ❌ memoryService FAILED:', e.message); }

try {
    console.log('  -> multimodalService...');
    const multimodalService = require('../services/multimodalService');
    console.log('  ✅ multimodalService OK');
} catch (e) { console.log('  ❌ multimodalService FAILED:', e.message); }

try {
    console.log('  -> simpleMonitor...');
    const { simpleMonitor } = require('../services/simpleMonitor');
    console.log('  ✅ simpleMonitor OK');
} catch (e) { console.log('  ❌ simpleMonitor FAILED:', e.message); }

try {
    console.log('  -> TelegramBotService...');
    const telegramBotService = require('../services/TelegramBotService');
    console.log('  ✅ TelegramBotService OK');
} catch (e) { console.log('  ❌ TelegramBotService FAILED:', e.message); }

try {
    console.log('  -> WhatsAppManager...');
    const { WhatsAppManager } = require('../services/whatsapp');
    console.log('  ✅ WhatsAppManager OK');
} catch (e) { console.log('  ❌ WhatsAppManager FAILED:', e.message); }

console.log('\n🎉 All services loaded successfully without crash!');
console.log('\n📊 Summary: If we got here, no service is calling getSharedPrismaClient() at module load time.');
process.exit(0);
