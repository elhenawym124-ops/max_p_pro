const { PrismaClient } = require('../prisma/generated/mysql');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
    console.log('--- DEBUG DATA DUMP ---');

    const companies = await prisma.company.findMany();
    console.log(`Total Companies: ${companies.length}`);
    companies.forEach(c => console.log(`Company: ${c.name} (${c.id})`));

    const users = await prisma.user.findMany();
    console.log(`Total Users: ${users.length}`);

    // Group users by company
    const usersByCompany = {};
    users.forEach(u => {
        if (!usersByCompany[u.companyId]) usersByCompany[u.companyId] = [];
        usersByCompany[u.companyId].push(u);
    });

    for (const cid in usersByCompany) {
        console.log(`  Company ${cid} has ${usersByCompany[cid].length} users.`);
    }

    const assets = await prisma.asset.findMany();
    console.log(`Total Assets: ${assets.length}`);
    assets.forEach(a => console.log(`Asset: ${a.name} (${a.id}) - Company: ${a.companyId} - AssignedTo: ${a.assignedToId}`));

    const assignments = await prisma.assetAssignment.findMany();
    console.log(`Total Assignments: ${assignments.length}`);
    assignments.forEach(a => console.log(`Assignment: Asset ${a.assetId} -> User ${a.userId} (Return: ${a.returnedAt})`));

    const history = await prisma.assetCustodyHistory.findMany();
    console.log(`Total History: ${history.length}`);
    history.forEach(h => console.log(`History: Asset ${h.assetId} -> User ${h.userId} Action: ${h.action}`));

    await prisma.$disconnect();
}

main();
