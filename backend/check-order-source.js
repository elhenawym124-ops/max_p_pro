const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOrder() {
  try {
    const order = await prisma.order.findFirst({
      where: {
        orderNumber: 'ORD-646665-006'
      },
      include: {
        createdByUser: true,
        affiliate: {
          include: {
            user: true
          }
        },
        conversation: true
      }
    });

    if (order) {
      console.log('📦 Order Found:');
      console.log('Order Number:', order.orderNumber);
      console.log('Source Type:', order.sourceType);
      console.log('Extraction Method:', order.extractionMethod);
      console.log('Created By:', order.createdBy);
      console.log('Created By Name:', order.createdByName);
      console.log('Conversation ID:', order.conversationId);
      console.log('Affiliate ID:', order.affiliateId);
      console.log('Order Source:', order.orderSource);
      console.log('\n👤 Created By User:', order.createdByUser);
      console.log('\n👥 Affiliate:', order.affiliate);
      console.log('\n💬 Conversation:', order.conversation);
      console.log('\n📝 Metadata:', order.metadata);
    } else {
      // Try guest order
      const guestOrder = await prisma.guestOrder.findFirst({
        where: {
          orderNumber: 'ORD-646665-006'
        },
        include: {
          createdByUser: true,
          affiliate: {
            include: {
              user: true
            }
          }
        }
      });

      if (guestOrder) {
        console.log('📦 Guest Order Found:');
        console.log('Order Number:', guestOrder.orderNumber);
        console.log('Created By:', guestOrder.createdBy);
        console.log('Created By Name:', guestOrder.createdByName);
        console.log('Affiliate ID:', guestOrder.affiliateId);
        console.log('\n👤 Created By User:', guestOrder.createdByUser);
        console.log('\n👥 Affiliate:', guestOrder.affiliate);
        console.log('\n📝 Metadata:', guestOrder.metadata);
      } else {
        console.log('❌ Order not found');
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOrder();
