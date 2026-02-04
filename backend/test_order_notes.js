const { getSharedPrismaClient } = require('./services/sharedDatabase');

async function testNotes() {
    console.log('🚀 Starting System Test...');
    const prisma = getSharedPrismaClient();

    try {
        // 1. Check Orders
        console.log('🔍 Fetching first order...');
        const order = await prisma.order.findFirst({
            include: { orderItems: true }
        });

        if (!order) {
            console.log('⚠️ No orders found in the database. Trying guest orders...');
            const guestOrder = await prisma.guestOrder.findFirst();
            if (!guestOrder) {
                console.log('❌ No guest orders found either.');
                return;
            }
            console.log('✅ Found guest order:', guestOrder.orderNumber);
            await testAddNote('guestOrder', guestOrder.id);
        } else {
            console.log('✅ Found regular order:', order.orderNumber);
            await testAddNote('order', order.id);
        }
    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
        if (error.stack) console.error(error.stack);
    }
}

async function testAddNote(type, id) {
    const prisma = getSharedPrismaClient();
    const content = 'Test Note from Antigravity Agent ' + new Date().toISOString();

    console.log(`📝 Adding note to ${type} (ID: ${id})...`);

    const data = {
        content: content,
        authorName: 'Antigravity Test'
    };

    if (type === 'order') data.orderId = id;
    else data.guestOrderId = id;

    try {
        const note = await prisma.orderNote.create({
            data: data,
            include: { author: true }
        });
        console.log('✅ Note created successfully:', note.id);
        console.log('👤 Author:', note.authorName);

        const fetchedNotes = await prisma.orderNote.findMany({
            where: type === 'order' ? { orderId: id } : { guestOrderId: id },
            orderBy: { createdAt: 'desc' }
        });
        console.log(`📊 Total notes for this order: ${fetchedNotes.length}`);

        // Cleanup (Optional)
        // await prisma.orderNote.delete({ where: { id: note.id } });
        // console.log('🧹 Test note cleaned up.');
    } catch (e) {
        console.error('❌ Failed to add note:', e.message);
    }
}

testNotes()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
