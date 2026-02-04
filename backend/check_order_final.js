const { getSharedPrismaClient } = require('./services/sharedDatabase');

async function checkOrderDetails() {
  try {
    const prisma = getSharedPrismaClient();
    const order = await prisma.order.findUnique({
      where: { id: 'cml1mtrww0069ufz836in5wld' },
      select: {
        id: true,
        orderNumber: true,
        sourceType: true,
        extractionMethod: true,
        governorate: true,
        shipping: true,
        total: true,
        shippingAddress: true,
        customerAddress: true,
        metadata: true
      }
    });
    console.log('ORDER DETAILS:', JSON.stringify(order, null, 2));
  } catch (error) {
    console.error('ERROR:', error);
  }
}

checkOrderDetails();
