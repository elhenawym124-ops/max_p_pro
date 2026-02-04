/**
 * 🔧 Fix: Remove duplicate roles (AGENT vs Agent)
 * Keep only one consistent role name
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDuplicateRoles() {
    try {
        console.log('🔧 Fixing duplicate roles...\n');

        // Get current settings
        const settings = await prisma.devSystemSettings.findUnique({
            where: { id: 'default' }
        });

        if (!settings) {
            console.log('❌ No settings found');
            return;
        }

        let permissions = JSON.parse(settings.permissions);
        
        console.log('Current roles:', Object.keys(permissions));

        // Merge AGENT into Agent (keep Agent as the standard)
        if (permissions['AGENT'] && permissions['Agent']) {
            console.log('\n🔀 Merging AGENT into Agent...');
            // Agent already exists, just remove AGENT
            delete permissions['AGENT'];
        } else if (permissions['AGENT'] && !permissions['Agent']) {
            console.log('\n🔀 Renaming AGENT to Agent...');
            permissions['Agent'] = permissions['AGENT'];
            delete permissions['AGENT'];
        }

        // Save updated permissions
        await prisma.devSystemSettings.update({
            where: { id: 'default' },
            data: {
                permissions: JSON.stringify(permissions)
            }
        });

        console.log('\n✅ Fixed! New roles:', Object.keys(permissions));
        console.log('\n📋 Agent permissions:');
        console.log(JSON.stringify(permissions['Agent'], null, 2));

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixDuplicateRoles();
