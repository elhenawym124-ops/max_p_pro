const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function check() {
    const s = await p.devSystemSettings.findUnique({ where: { id: 'default' } });
    console.log('Current Permissions:');
    console.log(JSON.stringify(JSON.parse(s.permissions), null, 2));
    
    // Check if there's an Agent user
    const agents = await p.user.findMany({ where: { role: 'Agent' } });
    console.log('\nAgent users found:', agents.length);
    agents.forEach(a => console.log(`  - ${a.email} (role: ${a.role})`));
    
    // Check DevTeamMember for agents
    for (const agent of agents) {
        const tm = await p.devTeamMember.findFirst({ where: { userId: agent.id } });
        console.log(`  DevTeamMember for ${agent.email}:`, tm ? tm.id : 'NOT FOUND');
    }
    
    await p.$disconnect();
}

check();
