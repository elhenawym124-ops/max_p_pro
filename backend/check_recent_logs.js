const fs = require('fs');
const path = require('path');

// Read console output from terminal
const logPatterns = [
  'QUOTA-PRIORITY',
  'QUOTA-CALC',
  'AI-RESPONSE',
  'exhausted',
  '429',
  '503',
  'EXHAUSTED',
  'فحص النموذج',
  'تم اختيار النموذج',
  'غير متاح'
];

console.log('\n=== Recent AI Request Logs ===\n');

// Try to read from different log sources
const logFiles = [
  'logs/combined.log',
  'logs/app.log',
  'logs/error.log'
];

let foundLogs = false;

for (const logFile of logFiles) {
  try {
    if (fs.existsSync(logFile)) {
      const content = fs.readFileSync(logFile, 'utf8');
      const lines = content.split('\n').slice(-500); // Last 500 lines
      
      const filtered = lines.filter(line => {
        return logPatterns.some(pattern => line.includes(pattern));
      });
      
      if (filtered.length > 0) {
        console.log(`\n--- From ${logFile} (${filtered.length} relevant lines) ---\n`);
        filtered.slice(-50).forEach(line => console.log(line)); // Last 50 relevant lines
        foundLogs = true;
      }
    }
  } catch (error) {
    // Skip if file doesn't exist or can't be read
  }
}

if (!foundLogs) {
  console.log('⚠️ No relevant logs found in log files');
  console.log('💡 Logs might be in console output only');
}
