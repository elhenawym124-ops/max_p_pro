/**
 * 🔍 Test script for user WITH DevTeamMember
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const devSettingsService = require('../services/devSettingsService');

const normalizeRole = (role) => {
  if (!role) return null;
  const roleMap = {
    'AGENT': 'Agent',
    'agent': 'Agent',
    'DEVELOPER': 'Developer',
    'TESTER': 'Tester',
  };
  return roleMap[role] || role;
};

async function test() {
  try {
    console.log('🔍 Testing viewScope with TeamMember...\n');

    // Find user WITH TeamMember
    const userWithTeam = await prisma.user.findFirst({
      where: {
        devTeamMember: { isNot: null }
      },
      include: {
        devTeamMember: true
      }
    });

    if (!userWithTeam) {
      console.log('❌ No user with TeamMember found');
      return;
    }

    console.log(`✅ Found user: ${userWithTeam.email} (role: ${userWithTeam.role})`);
    console.log(`   TeamMember ID: ${userWithTeam.devTeamMember.id}`);

    // Get permissions
    const settings = await devSettingsService.getSettings();
    const normalizedRole = normalizeRole(userWithTeam.role);
    const rolePermissions = settings.permissions[normalizedRole] || settings.permissions[userWithTeam.role];
    const viewScope = rolePermissions?.viewScope || 'assigned_only';

    console.log(`\n📋 Permissions:`);
    console.log(`   - viewScope: ${viewScope}`);

    // Test filter
    if (viewScope === 'assigned_only') {
      const filter = { assigneeId: userWithTeam.devTeamMember.id };
      const taskCount = await prisma.devTask.count({ where: filter });
      console.log(`\n🔒 Filter: { assigneeId: "${userWithTeam.devTeamMember.id}" }`);
      console.log(`📊 Tasks assigned to this user: ${taskCount}`);

      // Get one task
      const task = await prisma.devTask.findFirst({
        where: filter,
        select: { id: true, title: true, assigneeId: true }
      });

      if (task) {
        console.log(`\n✅ Can access task: ${task.title} (${task.id})`);
        console.log(`   Task assigneeId matches: ${task.assigneeId === userWithTeam.devTeamMember.id}`);
      } else {
        console.log(`\n⚠️ No tasks assigned to this user`);
      }

      // Test accessing a task NOT assigned to this user
      const otherTask = await prisma.devTask.findFirst({
        where: {
          assigneeId: { not: userWithTeam.devTeamMember.id }
        },
        select: { id: true, title: true, assigneeId: true }
      });

      if (otherTask) {
        console.log(`\n❌ Should NOT access task: ${otherTask.title} (${otherTask.id})`);
        console.log(`   Task assigneeId: ${otherTask.assigneeId}`);
        console.log(`   User teamMemberId: ${userWithTeam.devTeamMember.id}`);
        console.log(`   Access should be: DENIED`);
      }
    }

    console.log('\n✅ Test completed!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
