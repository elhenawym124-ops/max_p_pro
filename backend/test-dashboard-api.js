const { getSharedPrismaClient, initializeSharedDatabase } = require('./services/sharedDatabase');

async function testDashboardAPI() {
  console.log('🧪 Testing Super Admin Dashboard API...\n');
  
  try {
    await initializeSharedDatabase();
    const prisma = getSharedPrismaClient();
    
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    console.log('📊 Testing database queries...\n');

    // Test 1: Count Companies
    console.log('1️⃣ Testing Company count...');
    try {
      const totalCompanies = await prisma.company.count();
      console.log(`   ✅ Total Companies: ${totalCompanies}`);
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    // Test 2: Count Active Companies
    console.log('\n2️⃣ Testing Active Companies count...');
    try {
      const activeCompanies = await prisma.company.count({ where: { isActive: true } });
      console.log(`   ✅ Active Companies: ${activeCompanies}`);
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    // Test 3: Count Users
    console.log('\n3️⃣ Testing Users count...');
    try {
      const totalUsers = await prisma.user.count();
      console.log(`   ✅ Total Users: ${totalUsers}`);
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    // Test 4: Count Customers
    console.log('\n4️⃣ Testing Customers count...');
    try {
      const totalCustomers = await prisma.customer.count();
      console.log(`   ✅ Total Customers: ${totalCustomers}`);
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    // Test 5: Count Conversations
    console.log('\n5️⃣ Testing Conversations count...');
    try {
      const totalConversations = await prisma.conversation.count();
      console.log(`   ✅ Total Conversations: ${totalConversations}`);
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    // Test 6: Group by Plan
    console.log('\n6️⃣ Testing Plan Distribution...');
    try {
      const companiesByPlan = await prisma.company.groupBy({
        by: ['plan'],
        _count: { plan: true }
      });
      console.log(`   ✅ Plan Distribution:`);
      companiesByPlan.forEach(p => {
        console.log(`      - ${p.plan}: ${p._count.plan} companies`);
      });
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    // Test 7: Recent Activity
    console.log('\n7️⃣ Testing Recent Activity (30 days)...');
    try {
      const recentCompanies = await prisma.company.count({ 
        where: { createdAt: { gte: thirtyDaysAgo } } 
      });
      const recentUsers = await prisma.user.count({ 
        where: { createdAt: { gte: thirtyDaysAgo } } 
      });
      const recentCustomers = await prisma.customer.count({ 
        where: { createdAt: { gte: thirtyDaysAgo } } 
      });
      
      console.log(`   ✅ Recent Activity:`);
      console.log(`      - New Companies: ${recentCompanies}`);
      console.log(`      - New Users: ${recentUsers}`);
      console.log(`      - New Customers: ${recentCustomers}`);
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    // Test 8: Active Timers (for Active Users Monitor)
    console.log('\n8️⃣ Testing Active Timers...');
    try {
      const activeTimers = await prisma.devTimeLog.findMany({
        where: { isRunning: true },
        include: {
          dev_team_members: {
            select: {
              id: true,
              role: true,
              users: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            }
          },
          dev_tasks: {
            select: {
              id: true,
              title: true,
              status: true
            }
          }
        }
      });
      console.log(`   ✅ Active Timers: ${activeTimers.length}`);
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    console.log('\n✅ All tests completed!');

  } catch (error) {
    console.error('\n❌ Fatal Error:', error);
  } finally {
    process.exit(0);
  }
}

testDashboardAPI();
