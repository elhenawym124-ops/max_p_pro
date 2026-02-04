const { getSharedPrismaClient } = require('./services/sharedDatabase');

async function fixNullStrings() {
  try {
    const prisma = getSharedPrismaClient();
    const companyId = 'cmem8ayyr004cufakqkcsyn97';
    
    console.log('\n🔍 Finding orders with "null" strings...\n');
    
    // Find orders with string "null" in customerAddress or city
    const orders = await prisma.order.findMany({
      where: {
        companyId,
        OR: [
          { customerAddress: 'null' },
          { city: 'null' }
        ]
      }
    });
    
    console.log(`Found ${orders.length} orders with "null" strings\n`);
    
    let fixed = 0;
    
    for (const order of orders) {
      try {
        // Parse shipping and billing addresses
        let shippingAddr = null;
        let billingAddr = null;
        
        if (order.shippingAddress) {
          try {
            shippingAddr = typeof order.shippingAddress === 'string' 
              ? JSON.parse(order.shippingAddress) 
              : order.shippingAddress;
          } catch (e) {}
        }
        
        if (order.billingAddress) {
          try {
            billingAddr = typeof order.billingAddress === 'string' 
              ? JSON.parse(order.billingAddress) 
              : order.billingAddress;
          } catch (e) {}
        }
        
        // Extract address and city
        const address = (billingAddr?.address_1 && billingAddr.address_1.trim()) || 
                       (shippingAddr?.address_1 && shippingAddr.address_1.trim()) || 
                       null;
        
        const city = (billingAddr?.city && billingAddr.city.trim()) || 
                     (shippingAddr?.city && shippingAddr.city.trim()) || 
                     null;
        
        // Update if we found valid data
        if (address || city) {
          const updateData = {};
          
          if (order.customerAddress === 'null' && address) {
            updateData.customerAddress = address;
          }
          
          if (order.city === 'null' && city) {
            updateData.city = city;
          }
          
          if (Object.keys(updateData).length > 0) {
            await prisma.order.update({
              where: { id: order.id },
              data: updateData
            });
            
            console.log(`✅ Fixed ${order.orderNumber}:`);
            if (updateData.customerAddress) {
              console.log(`   Address: "${updateData.customerAddress.substring(0, 50)}..."`);
            }
            if (updateData.city) {
              console.log(`   City: "${updateData.city}"`);
            }
            
            fixed++;
          }
        } else {
          console.log(`⚠️ ${order.orderNumber}: No valid address/city found in JSON`);
        }
        
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

fixNullStrings();
