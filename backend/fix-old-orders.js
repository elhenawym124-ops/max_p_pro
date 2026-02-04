const { getSharedPrismaClient } = require('./services/sharedDatabase');

async function fixOldOrders() {
  try {
    const prisma = getSharedPrismaClient();
    
    // Find orders with missing customerAddress or city
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { customerAddress: null },
          { city: null }
        ],
        billingAddress: { not: null }
      }
    });

    console.log(`\n🔧 Found ${orders.length} orders with missing address/city data\n`);

    let fixed = 0;
    for (const order of orders) {
      try {
        let billing = {};
        let shipping = {};
        
        // Parse billing address
        if (order.billingAddress) {
          try {
            billing = JSON.parse(order.billingAddress);
          } catch (e) {}
        }
        
        // Parse shipping address
        if (order.shippingAddress) {
          try {
            shipping = JSON.parse(order.shippingAddress);
          } catch (e) {}
        }

        // Extract data
        const customerAddress = billing.address_1 || shipping.address_1 || null;
        const city = billing.city || shipping.city || null;

        // Update order
        await prisma.order.update({
          where: { id: order.id },
          data: {
            customerAddress,
            city
          }
        });

        console.log(`✅ Fixed ${order.orderNumber}: Address="${customerAddress?.substring(0, 30)}...", City="${city}"`);
        fixed++;
      } catch (error) {
        console.error(`❌ Error fixing ${order.orderNumber}:`, error.message);
      }
    }

    console.log(`\n✅ Fixed ${fixed} out of ${orders.length} orders\n`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

fixOldOrders();
