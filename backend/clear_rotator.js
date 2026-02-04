/**
 * Clear SimpleKeyRotator failed keys and check status
 */
const { getSimpleKeyRotator } = require('./services/aiAgent/SimpleKeyRotator');

const rotator = getSimpleKeyRotator();

console.log('📊 Current SimpleKeyRotator Status:');
console.log(JSON.stringify(rotator.getStatus(), null, 2));

console.log('\n🧹 Clearing all failed keys...');
rotator.clearAll();

console.log('✅ Done! All failures cleared.');
console.log('📊 New Status:', JSON.stringify(rotator.getStatus(), null, 2));
