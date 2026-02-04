const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkConsistency() {
    try {
        console.log("--- Checking Role Consistency ---");

        const members = await prisma.devTeamMember.findMany({
            select: {
                id: true,
                role: true,
                user: { select: { firstName: true, lastName: true, email: true } }
            }
        });

        const memberRoles = {};
        members.forEach(m => {
            const name = m.user ? `${m.user.firstName} ${m.user.lastName}` : 'Unknown';
            // Default role if null (though schema says string default 'developer')
            const r = m.role || 'developer';
            if (!memberRoles[r]) memberRoles[r] = [];
            memberRoles[r].push(name);
        });

        console.log("\n1. Roles used by Team Members:");
        Object.keys(memberRoles).forEach(r => {
            console.log(`   - "${r}": assigned to ${memberRoles[r].length} members (${memberRoles[r].join(', ')})`);
        });

        // 2. Fetch Settings
        const settings = await prisma.devSystemSettings.findFirst();
        if (!settings) {
            console.log("\n2. System Settings: NOT FOUND");
            return;
        }

        let permissions = {};
        try {
            permissions = JSON.parse(settings.permissions || '{}');
        } catch (e) {
            console.log("Error parsing permissions JSON");
        }

        console.log("\n2. Roles defined in Settings (Permissions):");
        const settingRoles = Object.keys(permissions);
        settingRoles.forEach(r => {
            console.log(`   - "${r}"`);
        });

        // 3. Comparison
        console.log("\n3. Mismatches:");
        const usedButNotDefined = Object.keys(memberRoles).filter(r => !settingRoles.includes(r));
        const definedButNotUsed = settingRoles.filter(r => !Object.keys(memberRoles).includes(r));

        if (usedButNotDefined.length > 0) {
            console.log("   ⚠️  Roles assigned to members but NOT configured in Settings:");
            usedButNotDefined.forEach(r => console.log(`      - "${r}"`));
        } else {
            console.log("   ✅ All assigned roles have configuration.");
        }

        if (definedButNotUsed.length > 0) {
            console.log("   ℹ️  Roles configured in Settings but NOT assigned to anyone:");
            definedButNotUsed.forEach(r => console.log(`      - "${r}"`));
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

checkConsistency();
