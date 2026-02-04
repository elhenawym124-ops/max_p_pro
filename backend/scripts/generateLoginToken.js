const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function generateToken() {
  try {
    const companyId = 'cmkvo8czx0000vbe859dddrd1'; // f22

    const user = await prisma.user.findFirst({
      where: {
        email: 'shrouk0@gmail.com',
        companyId
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true
      }
    });

    if (!user) {
      console.error('❌ User not found');
      return;
    }

    console.log('✅ User found:', user.email);

    // إنشاء JWT token طويل الأمد للاختبار
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role || 'EMPLOYEE',
        companyId: companyId,
        id: user.id
      },
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
      { expiresIn: '7d' } // صالح لمدة 7 أيام
    );

    console.log('\n🔑 JWT Token (valid for 7 days):');
    console.log(token);

    console.log('\n📋 To use this token:');
    console.log('1. Open browser DevTools (F12)');
    console.log('2. Go to Application > Local Storage > http://localhost:3000');
    console.log('3. Find "token" key and replace its value with the token above');
    console.log('4. Refresh the page');

    console.log('\n🌐 Or use this curl command:');
    console.log(`curl -H "Authorization: Bearer ${token}" https://maxp-ai.pro/api/v1/hr/payroll/my-projection`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generateToken();
