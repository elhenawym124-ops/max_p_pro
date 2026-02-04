/**
 * Script to find and delete orphan/debug notes from the database
 * Run with: node scripts/cleanup_debug_notes.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupDebugNotes() {
    console.log('🧹 Starting cleanup of debug notes...\n');

    try {
        // 1. Find orphan notes (notes with no orderId AND no guestOrderId)
        console.log('🔍 Step 1: Finding orphan notes (no order association)...');
        const orphanNotes = await prisma.orderNote.findMany({
            where: {
                AND: [
                    { orderId: null },
                    { guestOrderId: null }
                ]
            }
        });

        console.log(`📋 Found ${orphanNotes.length} orphan notes:`);
        orphanNotes.forEach(note => {
            console.log(`   - ID: ${note.id}`);
            console.log(`     Content: "${note.content.substring(0, 80)}..."`);
            console.log(`     Author: ${note.authorName}`);
            console.log(`     Created: ${note.createdAt}`);
            console.log('');
        });

        // 2. Find debug/test notes by content
        console.log('🔍 Step 2: Finding debug/test notes by content...');
        const debugNotes = await prisma.orderNote.findMany({
            where: {
                OR: [
                    { content: { contains: 'DEBUG' } },
                    { content: { contains: 'System Check Note' } },
                    { content: { contains: 'System Debugger' } },
                    { authorName: { contains: 'System Debugger' } }
                ]
            }
        });

        console.log(`📋 Found ${debugNotes.length} debug notes (by content):`);
        debugNotes.forEach(note => {
            console.log(`   - ID: ${note.id}`);
            console.log(`     Content: "${note.content.substring(0, 80)}..."`);
            console.log(`     Author: ${note.authorName}`);
            console.log(`     OrderId: ${note.orderId || 'NULL'}`);
            console.log(`     GuestOrderId: ${note.guestOrderId || 'NULL'}`);
            console.log('');
        });

        // 3. Merge and dedupe all notes to delete
        const allNotesMap = new Map();
        [...orphanNotes, ...debugNotes].forEach(note => {
            allNotesMap.set(note.id, note);
        });

        const allNotesToDelete = Array.from(allNotesMap.values());
        console.log(`\n📊 Total unique notes to delete: ${allNotesToDelete.length}`);

        if (allNotesToDelete.length > 0) {
            console.log('\n🗑️ Deleting notes...');
            const result = await prisma.orderNote.deleteMany({
                where: {
                    id: { in: allNotesToDelete.map(n => n.id) }
                }
            });
            console.log(`✅ Deleted ${result.count} notes`);
        } else {
            console.log('ℹ️ No notes found to delete');
        }

        // 4. Verify
        console.log('\n🔍 Step 3: Verification - checking remaining debug notes...');
        const remaining = await prisma.orderNote.findMany({
            where: {
                OR: [
                    { content: { contains: 'DEBUG' } },
                    { content: { contains: 'System Debugger' } },
                    {
                        AND: [
                            { orderId: null },
                            { guestOrderId: null }
                        ]
                    }
                ]
            }
        });
        console.log(`📋 Remaining problematic notes: ${remaining.length}`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

cleanupDebugNotes();
