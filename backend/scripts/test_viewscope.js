/**
 * 🔍 Test script to verify viewScope filtering works correctly
 * This simulates what happens when an AGENT user tries to access tasks
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const devSettingsService = require('../services/devSettingsService');

// Helper to normalize role (copied from middleware)
const normalizeRole = (role) => {
  if (!role) return null;
  const roleMap = {
    'AGENT': 'Agent',
    'agent': 'Agent',
    'DEVELOPER': 'Developer',
    'developer': 'Developer',
    'TESTER': 'Tester',
    'tester': 'Tester',
    'PROJECT MANAGER': 'Project Manager',
    'project manager': 'Project Manager',
    'TEAM LEAD': 'Team Lead',
    'team lead': 'Team Lead',
  };
  return roleMap[role] || role;
};

async function testViewScope() {
  try {
    console.log('🔍 Testing viewScope filtering...\n');

    // 1. Get an AGENT user
    const agentUser = await prisma.user.findFirst({
      where: { role: { in: ['AGENT', 'Agent'] } }
    });

    if (!agentUser) {
      console.log('❌ No AGENT user found');
      return;
    }

    console.log(`✅ Found AGENT user: ${agentUser.email} (role: ${agentUser.role})`);

    // 2. Check permissions
    const settings = await devSettingsService.getSettings();
    const normalizedRole = normalizeRole(agentUser.role);
    const rolePermissions = settings.permissions[normalizedRole] || settings.permissions[agentUser.role];
    
    console.log(`\n📋 Permissions for ${agentUser.role}:`);
    console.log(`   - viewScope: ${rolePermissions?.viewScope || 'NOT FOUND'}`);
    console.log(`   - canViewAll: ${rolePermissions?.canViewAll || false}`);

    // 3. Check if user has DevTeamMember
    const teamMember = await prisma.devTeamMember.findFirst({
      where: { userId: agentUser.id }
    });

    console.log(`\n👤 DevTeamMember: ${teamMember ? teamMember.id : 'NOT FOUND'}`);

    // 4. Test viewScope filter
    const viewScope = rolePermissions?.viewScope || 'assigned_only';
    console.log(`\n🔒 Testing viewScope: ${viewScope}`);

    if (viewScope === 'assigned_only') {
      if (!teamMember) {
        console.log('   ❌ No TeamMember - should return NO ACCESS filter: { id: { in: [] } }');
        const filter = { id: { in: [] } };
        const taskCount = await prisma.devTask.count({ where: filter });
        console.log(`   📊 Tasks matching filter: ${taskCount} (should be 0)`);
      } else {
        console.log(`   ✅ Has TeamMember: ${teamMember.id}`);
        const filter = { assigneeId: teamMember.id };
        const taskCount = await prisma.devTask.count({ where: filter });
        console.log(`   📊 Tasks assigned to this user: ${taskCount}`);
        
        // Show sample tasks
        const tasks = await prisma.devTask.findMany({
          where: filter,
          take: 5,
          select: { id: true, title: true, assigneeId: true }
        });
        console.log(`   📝 Sample tasks (first 5):`);
        tasks.forEach(t => console.log(`      - ${t.title} (${t.id})`));
      }
    } else if (viewScope === 'all') {
      console.log('   ✅ viewScope is "all" - should see all tasks');
      const taskCount = await prisma.devTask.count();
      console.log(`   📊 Total tasks: ${taskCount}`);
    }

    // 5. Test getDevTaskById scenario
    console.log(`\n🔍 Testing getDevTaskById scenario...`);
    const anyTask = await prisma.devTask.findFirst({
      select: { id: true, title: true, assigneeId: true }
    });

    if (anyTask) {
      console.log(`   📋 Testing access to task: ${anyTask.title} (${anyTask.id})`);
      
      if (viewScope === 'assigned_only') {
        if (!teamMember) {
          console.log('   ❌ No TeamMember - should return 403 Forbidden');
        } else {
          const hasAccess = anyTask.assigneeId === teamMember.id;
          console.log(`   ${hasAccess ? '✅' : '❌'} Access: ${hasAccess ? 'GRANTED' : 'DENIED'}`);
          console.log(`      Task assigneeId: ${anyTask.assigneeId}`);
          console.log(`      User teamMemberId: ${teamMember.id}`);
        }
      } else if (viewScope === 'all') {
        console.log('   ✅ Access: GRANTED (viewScope = all)');
      }
    }

    console.log('\n✅ Test completed!');

  } catch (error) {
    console.error('❌ Test error:', error);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testViewScope();
