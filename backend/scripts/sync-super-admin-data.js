require('dotenv').config(); // Load local .env (Remote DB)
const { PrismaClient } = require('@prisma/client');

// Remote Client (Source - Development)
const remotePrisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL // This should be the REMOTE URL from .env
        }
    }
});

// Local Client (Target - Production/VPS)
// Note: On VPS, we want to write to localhost.
// We will assume this script is run where .env.production is available OR 
// we will start a second client with the local connection string passed as argument or manually constructed.
// FOR SYNCING FROM "LOCAL DEV MACHINE" (where user added data) TO "VPS" (where data is missing):
// ACTUALLY: The user is ON THE LOCAL MACHINE. They added data to the REMOTE DB (because local machine uses remote DB).
// Wait, the user said "On localhost database I added lists... I want to make this update on VPS database".
// IF user was using .env (Remote DB), then the data IS already on the Remote DB.
// IF user was using a LOCAL MYSQL on their laptop (which is unlikely given previous context of "Remote DB for Dev"), then it's different.
// BUT assuming standard setup: Dev = Remote DB. Prod = Local DB on VPS.
// User wants data from Remote DB (Source) -> Local DB on VPS (Target).

// This script is best run ON THE VPS.
// On VPS:
// Source: Remote DB (92.113...)
// Target: Local DB (localhost)

const localPrisma = new PrismaClient({
    datasources: {
        db: {
            // Hardcoded "localhost" for safety on VPS execution, or read from .env.production
            url: 'mysql://u339372869_test2:0165676135Aa%40A@localhost:3306/u339372869_test2?charset=utf8mb4&collation=utf8mb4_unicode_ci'
        }
    }
});

async function syncData() {
    console.log('🚀 Starting Data Sync: Remote -> Localhost');

    try {
        // 1. Sync Super Admin Users
        const superAdmins = await remotePrisma.user.findMany({
            where: { role: 'SUPER_ADMIN' }
        });

        console.log(`📦 Found ${superAdmins.length} Super Admins in Remote DB.`);

        for (const user of superAdmins) {
            const exists = await localPrisma.user.findUnique({ where: { email: user.email } });
            if (!exists) {
                console.log(`Creating user: ${user.email}`);
                await localPrisma.user.create({ data: user });
            } else {
                console.log(`Updating user: ${user.email}`);
                await localPrisma.user.update({ where: { email: user.email }, data: user });
            }
        }

        // 2. Sync Tasks (Assuming all tasks or filtered)
        // Adjust filter as needed
        const tasks = await remotePrisma.task.findMany();
        console.log(`📦 Found ${tasks.length} Tasks in Remote DB.`);

        for (const task of tasks) {
            // Check if related user exists locally first (integrity)
            if (task.assignedUserId) {
                const userExists = await localPrisma.user.findUnique({ where: { id: task.assignedUserId } });
                if (!userExists) {
                    console.warn(`⚠️ Skipping task ${task.id} because assigned user ${task.assignedUserId} missing locally.`);
                    continue;
                }
            }

            const exists = await localPrisma.task.findUnique({ where: { id: task.id } });
            if (!exists) {
                console.log(`Creating task: ${task.title || task.id}`);
                await localPrisma.task.create({ data: task });
            } else {
                // await localPrisma.task.update({ where: { id: task.id }, data: task });
            }
        }

        console.log('✅ Sync Complete!');

    } catch (error) {
        console.error('❌ Sync Failed:', error);
    } finally {
        await remotePrisma.$disconnect();
        await localPrisma.$disconnect();
    }
}

syncData();
