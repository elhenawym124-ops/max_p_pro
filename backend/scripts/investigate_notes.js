/**
 * Direct database investigation script
 * Run with: node scripts/investigate_notes.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function investigateNotes() {
    console.log('🔍 Starting deep investigation of order_notes table...\n');

    try {
        // 1. Get ALL notes (no filter)
        console.log('📋 Step 1: Listing ALL notes in the database...');
        const allNotes = await prisma.orderNote.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50 // Limit to 50 most recent
        });

        console.log(`   Total notes found: ${allNotes.length}`);

        if (allNotes.length === 0) {
            console.log('   ⚠️ No notes in database at all!');
        } else {
            console.log('\n   Notes list:');
            allNotes.forEach((note, index) => {
                console.log(`   ${index + 1}. ID: ${note.id}`);
                console.log(`      Content: "${note.content}"`);
                console.log(`      Author: ${note.authorName}`);
                console.log(`      OrderId: ${note.orderId || 'NULL'}`);
                console.log(`      GuestOrderId: ${note.guestOrderId || 'NULL'}`);
                console.log(`      Created: ${note.createdAt}`);
                console.log('');
            });
        }

        // 2. Check for case-insensitive DEBUG search
        console.log('\n📋 Step 2: Raw SQL search for DEBUG (case insensitive)...');
        const rawDebugNotes = await prisma.$queryRaw`
            SELECT * FROM order_notes 
            WHERE content LIKE '%DEBUG%' 
               OR content LIKE '%debug%' 
               OR authorName LIKE '%Debugger%'
               OR authorName LIKE '%debugger%'
        `;

        console.log(`   Found via raw SQL: ${rawDebugNotes.length} notes`);
        if (rawDebugNotes.length > 0) {
            rawDebugNotes.forEach(note => {
                console.log(`   - ${note.id}: "${note.content}" by ${note.authorName}`);
            });
        }

        // 3. Check OrderStatusHistory for debug entries
        console.log('\n📋 Step 3: Checking OrderStatusHistory for debug entries...');
        const statusHistory = await prisma.orderStatusHistory.findMany({
            where: {
                OR: [
                    { reason: { contains: 'DEBUG' } },
                    { userName: { contains: 'Debugger' } },
                    { reason: { contains: 'System Check' } }
                ]
            }
        });

        console.log(`   Found ${statusHistory.length} debug status history entries`);
        if (statusHistory.length > 0) {
            statusHistory.forEach(h => {
                console.log(`   - ${h.id}: "${h.reason}" by ${h.userName}`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

investigateNotes();
