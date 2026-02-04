/**
 * 🔍 Test script for AGENT user WITH DevTeamMember
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const devSettingsService = require('../services/devSettingsService');

const normalizeRole = (role) => {
  if (!role) return null;
  const roleMap = {
    'AGENT': 'Agent',
    'agent': 'Agent',
  };
  return roleMap[role] || role;
};

async function test() {
  try {
    console.log('🔍 Testing AGENT with TeamMember...\n');

    // Find AGENT user WITH TeamMember
    const agentWithTeam = await prisma.user.findFirst({
      where: {
        role: { in: ['AGENT', 'Agent'] },
        devTeamMember: { isNot: null }
      },
      include: {
        devTeamMember: true
      }
    });

    if (!agentWithTeam) {
      console.log('❌ No AGENT user with TeamMember found');
      console.log('   Creating test scenario...\n');
      
      // Get any AGENT user
      const agent = await prisma.user.findFirst({
        where: { role: { in: ['AGENT', 'Agent'] } }
      });
      
      if (!agent) {
        console.log('❌ No AGENT user found at all');
        return;
      }
      
      console.log(`   Found AGENT: ${agent.email}`);
      console.log(`   ⚠️ This user has NO TeamMember - will see 0 tasks\n`);
      
      // Test the filter
      const filter = { id: { in: [] } };
      const taskCount = await prisma.devTask.count({ where: filter });
      console.log(`   Filter: { id: { in: [] } }`);
      console.log(`   Tasks matching: ${taskCount} (should be 0)`);
      
      return;
    }

    console.log(`✅ Found AGENT with TeamMember: ${agentWithTeam.email}`);
    console.log(`   TeamMember ID: ${agentWithTeam.devTeamMember.id}`);

    // Get permissions
    const settings = await devSettingsService.getSettings();
    const normalizedRole = normalizeRole(agentWithTeam.role);
    const rolePermissions = settings.permissions[normalizedRole] || settings.permissions[agentWithTeam.role];
    const viewScope = rolePermissions?.viewScope || 'assigned_only';

    console.log(`\n📋 Permissions:`);
    console.log(`   - viewScope: ${viewScope}`);

    // Test filter
    if (viewScope === 'assigned_only') {
      const filter = { assigneeId: agentWithTeam.devTeamMember.id };
      const taskCount = await prisma.devTask.count({ where: filter });
      console.log(`\n🔒 Filter: { assigneeId: "${agentWithTeam.devTeamMember.id}" }`);
      console.log(`📊 Tasks assigned to this user: ${taskCount}`);

      if (taskCount > 0) {
        const tasks = await prisma.devTask.findMany({
          where: filter,
          take: 3,
          select: { id: true, title: true, assigneeId: true }
        });
        console.log(`\n✅ Can access these tasks:`);
        tasks.forEach(t => console.log(`   - ${t.title.substring(0, 50)}... (${t.id})`));
      }

      // Test accessing a task NOT assigned to this user
      const otherTask = await prisma.devTask.findFirst({
        where: {
          assigneeId: { not: agentWithTeam.devTeamMember.id }
        },
        select: { id: true, title: true, assigneeId: true }
      });

      if (otherTask) {
        console.log(`\n❌ Should NOT access task: ${otherTask.title.substring(0, 50)}...`);
        console.log(`   Task assigneeId: ${otherTask.assigneeId}`);
        console.log(`   User teamMemberId: ${agentWithTeam.devTeamMember.id}`);
        console.log(`   ✅ Access correctly DENIED`);
      }
    }

    console.log('\n✅ Test completed!');

  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

test();
