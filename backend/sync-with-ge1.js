const { getSharedPrismaClient } = require('./services/sharedDatabase');
const postgresVectorService = require('./services/postgresVectorService');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const dotenv = require('dotenv');

// Load env
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function fullSyncWithGe1() {
    console.log('🔄 Starting Full Data Sync with "ge1" key...');

    const mysql = getSharedPrismaClient();

    try {
        // 1. Get the GE1 key
        const keyRecord = await mysql.aiKey.findFirst({
            where: { name: 'ge1', isActive: true }
        });

        if (!keyRecord) {
            console.error('❌ Key "ge1" not found or inactive. Stopping sync.');
            return;
        }

        console.log(`🔑 Using API Key: ${keyRecord.apiKey.substring(0, 10)}...`);
        const genAI = new GoogleGenerativeAI(keyRecord.apiKey);
        const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

        // 2. Fetch all active products from MySQL
        const products = await mysql.product.findMany({
            where: { isActive: true }
        });

        console.log(`📦 Found ${products.length} products to process`);

        // 3. Process each product
        let successCount = 0;
        for (const product of products) {
            try {
                process.stdout.write(`⏳ Processing: ${product.name}... `);

                // Generate embedding
                const textToEmbed = `${product.name} ${product.description || ''}`;
                const result = await embeddingModel.embedContent({
                    content: { parts: [{ text: textToEmbed }] },
                    outputDimensionality: 768
                });
                const embedding = result.embedding.values;

                // Sync to Postgres
                await postgresVectorService.pgClient.query(`
          INSERT INTO products (
            id, name, description, price, stock,
            company_id, category_id, is_active,
            embedding, embedding_generated_at,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(), NOW())
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            price = EXCLUDED.price,
            stock = EXCLUDED.stock,
            embedding = EXCLUDED.embedding,
            embedding_generated_at = EXCLUDED.embedding_generated_at,
            updated_at = NOW()
        `, [
                    product.id,
                    product.name,
                    product.description,
                    product.price.toString(),
                    product.stock,
                    product.companyId,
                    product.categoryId,
                    product.isActive !== false,
                    embedding
                ]);

                successCount++;
                console.log('✅');

            } catch (err) {
                console.log('❌');
                console.error(`  Error for ${product.id}:`, err.message);
            }
        }

        console.log(`\n🎉 Completed! Successfully synced ${successCount}/${products.length} products.`);

    } catch (err) {
        console.error('❌ Sync Failed:', err.message);
    } finally {
        await postgresVectorService.close();
        process.exit(0);
    }
}

// Make sure postgres is initialized before starting
postgresVectorService.initialize().then(() => {
    fullSyncWithGe1();
}).catch(err => {
    console.error('Failed to initialize postgres:', err.message);
    process.exit(1);
});
