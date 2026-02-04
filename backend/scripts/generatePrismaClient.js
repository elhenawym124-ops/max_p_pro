const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🔄 تحديث Prisma Client...');

// Find backend directory
let backendPath = __dirname;
while (!fs.existsSync(path.join(backendPath, 'prisma', 'schema.prisma'))) {
  const parent = path.dirname(backendPath);
  if (parent === backendPath) {
    console.error('❌ لم يتم العثور على مجلد backend');
    process.exit(1);
  }
  backendPath = parent;
}

console.log('📦 تشغيل prisma generate من:', backendPath);

try {
  process.chdir(backendPath);
  
  const prismaPath = path.join(backendPath, 'node_modules', 'prisma', 'build', 'index.js');
  if (!fs.existsSync(prismaPath)) {
    console.error('❌ Prisma CLI غير موجود في:', prismaPath);
    process.exit(1);
  }
  
  execSync(`node "${prismaPath}" generate`, {
    stdio: 'inherit',
    cwd: backendPath,
    shell: true
  });
  
  console.log('✅ تم تحديث Prisma Client بنجاح!');
} catch (error) {
  console.error('❌ حدث خطأ:', error.message);
  process.exit(1);
}

