const OrderService = require('../services/orderService');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function test() {
    const companyId = 'cme8oj1fo000cufdcg2fquia9';
    const prisma = getSharedPrismaClient();

    console.log('--- Initial Settings ---');
    let settings = await prisma.orderInvoiceSettings.upsert({
        where: { companyId },
        update: {
            enableSequentialOrders: true,
            orderPrefix: 'TEST',
            nextOrderNumber: 100,
            orderNumberFormat: 'PREFIX-XXXXXX'
        },
        create: {
            companyId,
            enableSequentialOrders: true,
            orderPrefix: 'TEST',
            nextOrderNumber: 100,
            orderNumberFormat: 'PREFIX-XXXXXX'
        }
    });
    console.log(settings);

    console.log('\n--- Generating Order Number 1 ---');
    const orderService = OrderService.setCompanyId(companyId);
    const num1 = await orderService.generateOrderNumber();
    console.log('Order Number 1:', num1);

    console.log('\n--- Generating Order Number 2 ---');
    const num2 = await orderService.generateOrderNumber();
    console.log('Order Number 2:', num2);

    console.log('\n--- Current Settings ---');
    settings = await prisma.orderInvoiceSettings.findUnique({ where: { companyId } });
    console.log(settings);

    console.log('\n--- Disabling Sequential Orders ---');
    await prisma.orderInvoiceSettings.update({
        where: { companyId },
        data: { enableSequentialOrders: false }
    });

    console.log('\n--- Generating Order Number (Standard) ---');
    const num3 = await orderService.generateOrderNumber();
    console.log('Order Number 3 (Standard):', num3);
}

test()
    .catch(e => console.error(e))
    .finally(() => process.exit());
