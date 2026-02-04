const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOrder() {
  try {
    const order = await prisma.order.findFirst({
      where: {
        orderNumber: 'ORD-097446-218'
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        },
        affiliate: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        },
        conversation: {
          select: {
            id: true,
            channel: true
          }
        }
      }
    });

    if (order) {
      console.log('📦 Order Found (Regular Order):');
      console.log('═══════════════════════════════════════');
      console.log('Order Number:', order.orderNumber);
      console.log('Customer Name:', order.customerName);
      console.log('\n🔍 Source Information:');
      console.log('  Source Type:', order.sourceType || 'NULL');
      console.log('  Extraction Method:', order.extractionMethod || 'NULL');
      console.log('  Order Source:', order.orderSource || 'NULL');
      console.log('\n👤 Creator Information:');
      console.log('  Created By ID:', order.createdBy || 'NULL');
      console.log('  Created By Name:', order.createdByName || 'NULL');
      console.log('  Created By User:', order.createdByUser ? 
        `${order.createdByUser.firstName} ${order.createdByUser.lastName} (${order.createdByUser.email}) - Role: ${order.createdByUser.role}` : 
        'NULL');
      console.log('\n💬 Conversation:');
      console.log('  Conversation ID:', order.conversationId || 'NULL');
      console.log('  Channel:', order.conversation?.channel || 'NULL');
      console.log('\n👥 Affiliate:');
      console.log('  Affiliate ID:', order.affiliateId || 'NULL');
      if (order.affiliate) {
        console.log('  Affiliate Code:', order.affiliate.affiliateCode);
        console.log('  Affiliate User:', order.affiliate.user ? 
          `${order.affiliate.user.firstName} ${order.affiliate.user.lastName} (${order.affiliate.user.email})` : 
          'NULL');
      }
      console.log('\n📝 Metadata:', order.metadata || 'NULL');
      console.log('═══════════════════════════════════════');
    } else {
      // Try guest order
      const guestOrder = await prisma.guestOrder.findFirst({
        where: {
          orderNumber: 'ORD-097446-218'
        },
        include: {
          createdByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          },
          affiliate: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            }
          }
        }
      });

      if (guestOrder) {
        console.log('📦 Order Found (Guest Order):');
        console.log('═══════════════════════════════════════');
        console.log('Order Number:', guestOrder.orderNumber);
        console.log('Guest Name:', guestOrder.guestName);
        console.log('\n👤 Creator Information:');
        console.log('  Created By ID:', guestOrder.createdBy || 'NULL');
        console.log('  Created By Name:', guestOrder.createdByName || 'NULL');
        console.log('  Created By User:', guestOrder.createdByUser ? 
          `${guestOrder.createdByUser.firstName} ${guestOrder.createdByUser.lastName} (${guestOrder.createdByUser.email}) - Role: ${guestOrder.createdByUser.role}` : 
          'NULL');
        console.log('\n👥 Affiliate:');
        console.log('  Affiliate ID:', guestOrder.affiliateId || 'NULL');
        if (guestOrder.affiliate) {
          console.log('  Affiliate Code:', guestOrder.affiliate.affiliateCode);
          console.log('  Affiliate User:', guestOrder.affiliate.user ? 
            `${guestOrder.affiliate.user.firstName} ${guestOrder.affiliate.user.lastName} (${guestOrder.affiliate.user.email})` : 
            'NULL');
        }
        console.log('\n📝 Metadata:', guestOrder.metadata || 'NULL');
        console.log('═══════════════════════════════════════');
      } else {
        console.log('❌ Order not found in both regular and guest orders');
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkOrder();
