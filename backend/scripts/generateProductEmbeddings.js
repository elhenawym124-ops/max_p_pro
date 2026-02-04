/**
 * Migration Script: Generate Embeddings for Existing Products
 * 
 * This script generates vector embeddings for all existing products in the database
 * that don't have embeddings yet. This is a one-time migration to populate the
 * embedding field for existing products.
 * 
 * Usage:
 *   node backend/scripts/generateProductEmbeddings.js
 * 
 * Options:
 *   --company-id=<id>  - Generate embeddings for specific company only
 *   --force           - Regenerate embeddings even if they already exist
 *   --batch-size=<n>  - Number of products to process per batch (default: 10)
 */

const { getSharedPrismaClient, initializeSharedDatabase } = require('../services/sharedDatabase');
const EmbeddingHelper = require('../services/embeddingHelper');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  companyId: null,
  force: false,
  batchSize: 10
};

args.forEach(arg => {
  if (arg.startsWith('--company-id=')) {
    options.companyId = arg.split('=')[1];
  } else if (arg === '--force') {
    options.force = true;
  } else if (arg.startsWith('--batch-size=')) {
    options.batchSize = parseInt(arg.split('=')[1]) || 10;
  }
});

async function generateEmbeddings() {
  console.log('\n🚀 ===== Product Embeddings Generation Started =====\n');
  console.log('Options:', options);
  console.log('');

  try {
    // Initialize database
    await initializeSharedDatabase();
    const prisma = getSharedPrismaClient();

    // Build where clause
    const whereClause = {
      isActive: true
    };

    if (options.companyId) {
      whereClause.companyId = options.companyId;
      console.log(`🏢 Processing products for company: ${options.companyId}`);
    } else {
      console.log('🌍 Processing products for all companies');
    }

    if (!options.force) {
      whereClause.embedding = null;
      console.log('📋 Only processing products without embeddings');
    } else {
      console.log('🔄 Force mode: Regenerating all embeddings');
    }

    // Get total count
    const totalProducts = await prisma.product.count({ where: whereClause });
    console.log(`\n📊 Total products to process: ${totalProducts}\n`);

    if (totalProducts === 0) {
      console.log('✅ No products need embedding generation. All done!');
      return;
    }

    // Get all companies that need processing
    const companies = await prisma.company.findMany({
      where: options.companyId ? { id: options.companyId } : {},
      select: { id: true, name: true }
    });

    let totalProcessed = 0;
    let totalSuccess = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

    // Process each company
    for (const company of companies) {
      console.log(`\n🏢 Processing company: ${company.name} (${company.id})`);

      // Check if company has any keys (optional check to avoid processing if no keys at all)
      const keys = await EmbeddingHelper.getAllAvailableApiKeys(company.id);
      if (keys.length === 0) {
        console.log(`⚠️  No API keys found for company ${company.name}. Skipping...`);
        continue;
      }
      console.log(`   🔑 Found ${keys.length} available API keys (with rotation support)`);

      // Get products for this company
      const companyWhereClause = { ...whereClause, companyId: company.id };
      const products = await prisma.product.findMany({
        where: companyWhereClause,
        include: {
          category: true
        },
        orderBy: { createdAt: 'asc' }
      });

      console.log(`   📦 Found ${products.length} products for this company`);

      // Process in batches to avoid rate limits
      for (let i = 0; i < products.length; i += options.batchSize) {
        const batch = products.slice(i, i + options.batchSize);
        const batchNumber = Math.floor(i / options.batchSize) + 1;
        const totalBatches = Math.ceil(products.length / options.batchSize);

        console.log(`\n   📦 Batch ${batchNumber}/${totalBatches} (${batch.length} products)`);

        // Process batch sequentially
        for (const product of batch) {
          totalProcessed++;
          const progress = `[${totalProcessed}/${totalProducts}]`;

          try {
            // Generate and save embedding (passing companyId allows automatic key rotation)
            const embedding = await EmbeddingHelper.generateAndSaveProductEmbedding(
              product.id,
              product.name,
              product.description,
              product.category?.name,
              company.id // ✅ Pass companyId to enable key rotation
            );

            if (embedding) {
              totalSuccess++;
              console.log(`   ✅ ${progress} ${product.name}`);
            } else {
              totalSkipped++;
              console.log(`   ⏭️  ${progress} ${product.name} (skipped - generation failed)`);
            }

            // Small delay to avoid hitting rate limits too hard even with rotation
            await new Promise(resolve => setTimeout(resolve, 500));

          } catch (error) {
            totalFailed++;
            console.error(`   ❌ ${progress} ${product.name}: ${error.message}`);
          }
        }

        // Delay between batches
        if (i + options.batchSize < products.length) {
          console.log(`   ⏸️  Waiting 1 second before next batch...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    // Final summary
    console.log('\n\n🎉 ===== Embeddings Generation Complete =====\n');
    console.log(`📊 Summary:`);
    console.log(`   Total processed: ${totalProcessed}`);
    console.log(`   ✅ Success: ${totalSuccess}`);
    console.log(`   ❌ Failed: ${totalFailed}`);
    console.log(`   ⏭️  Skipped: ${totalSkipped}`);
    console.log('');

    if (totalFailed > 0) {
      console.log('⚠️  Some embeddings failed to generate. Check the logs above for details.');
      process.exit(1);
    } else {
      console.log('✅ All embeddings generated successfully!');
      process.exit(0);
    }

  } catch (error) {
    console.error('\n❌ Fatal error during embedding generation:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
generateEmbeddings();
