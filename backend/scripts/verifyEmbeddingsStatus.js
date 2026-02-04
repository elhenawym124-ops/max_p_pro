
const { getSharedPrismaClient, initializeSharedDatabase } = require('../services/sharedDatabase');

async function verifyStatus() {
  try {
    await initializeSharedDatabase();
    const prisma = getSharedPrismaClient();

    const totalProducts = await prisma.product.count();
    const productsWithEmbeddings = await prisma.product.count({
      where: {
        embedding: {
          not: null
        }
      }
    });

    const productsWithoutEmbeddings = totalProducts - productsWithEmbeddings;

    console.log('📊 Embeddings Status Verification:');
    console.log(`   Total Products: ${totalProducts}`);
    console.log(`   With Embeddings: ${productsWithEmbeddings}`);
    console.log(`   Without Embeddings: ${productsWithoutEmbeddings}`);
    
    if (productsWithoutEmbeddings === 0 && totalProducts > 0) {
      console.log('✅ All products have embeddings.');
    } else if (totalProducts === 0) {
      console.log('⚠️ No products found in the database.');
    } else {
      console.log(`⚠️ ${productsWithoutEmbeddings} products are missing embeddings.`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error verifying status:', error);
    process.exit(1);
  }
}

verifyStatus();
