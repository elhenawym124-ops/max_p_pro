const { getSharedPrismaClient } = require('./services/sharedDatabase');

async function fixOrder() {
  try {
    const prisma = getSharedPrismaClient();
    
    const order = await prisma.order.findUnique({
      where: { orderNumber: 'WOO-25374' }
    });
    
    if (!order) {
      console.log('Order not found!');
      process.exit(1);
    }
    
    // Parse billing address
    const billing = JSON.parse(order.billingAddress);
    
    const address = billing.address_1?.trim() || null;
    const city = billing.city?.trim() || null;
    
    console.log('\n🔧 Fixing WOO-25374...\n');
    console.log(`Current customerAddress: "${order.customerAddress}"`);
    console.log(`Current city: "${order.city}"`);
    console.log(`\nNew customerAddress: "${address}"`);
    console.log(`New city: "${city}"`);
    
    await prisma.order.update({
      where: { orderNumber: 'WOO-25374' },
      data: {
        customerAddress: address,
        city: city
      }
    });
    
    console.log('\n✅ Order fixed!\n');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

fixOrder();
