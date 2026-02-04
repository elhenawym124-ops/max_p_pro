const { exec } = require('child_process');
const path = require('path');

console.log('🔄 Regenerating Prisma Client with correct binary targets...');

// Regenerate Prisma client for postgres
const postgresSchemaPath = path.join(__dirname, 'prisma', 'postgres', 'postgres.prisma');

exec(`npx prisma generate --schema=${postgresSchemaPath}`, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Error regenerating Prisma client:', error);
    return;
  }
  
  if (stderr) {
    console.warn('⚠️ Warnings:', stderr);
  }
  
  console.log('✅ Prisma client regenerated successfully');
  console.log(stdout);
  
  console.log('\n📋 Next steps for deployment:');
  console.log('1. Commit the updated schema.prisma file');
  console.log('2. Deploy the application');
  console.log('3. The new binary targets should resolve the deployment issue');
});
