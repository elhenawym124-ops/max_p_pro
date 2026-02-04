const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getSharedPrismaClient } = require('./sharedDatabase');

/**
 * Helper class for generating and managing product embeddings
 * Embeddings are used for semantic search in RAG system
 */
class EmbeddingHelper {
  /**
   * Get all available Gemini API keys for a company
   * Returns central keys if allowed, plus company specific keys
   * @param {string} companyId - Company ID
   * @returns {Promise<string[]>} Array of API keys
   */
  static async getAllAvailableApiKeys(companyId) {
    try {
      const { getSharedPrismaClient } = require('./sharedDatabase');
      const prisma = getSharedPrismaClient();
      let allKeys = [];

      // 1️⃣ Check if company uses central keys
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { useCentralKeys: true }
      });

      // Get central keys if allowed
      if (company?.useCentralKeys) {
        const centralKeys = await prisma.geminiKey.findMany({
          where: {
            companyId: null,
            isActive: true
          },
          orderBy: {
            priority: 'desc'
          },
          select: { apiKey: true }
        });
        allKeys.push(...centralKeys.map(k => k.apiKey));
      }

      // 2️⃣ Get company-specific keys
      const companyKeys = await prisma.geminiKey.findMany({
        where: {
          companyId: companyId,
          isActive: true
        },
        orderBy: {
          priority: 'desc'
        },
        select: { apiKey: true }
      });
      allKeys.push(...companyKeys.map(k => k.apiKey));

      // Remove duplicates
      const uniqueKeys = [...new Set(allKeys)].filter(k => k);

      // Shuffle keys to distribute load
      return this.shuffleArray(uniqueKeys);
    } catch (error) {
      console.error(`❌ [EMBEDDING] Failed to get API keys for company ${companyId}:`, error.message);
      return [];
    }
  }

  /**
   * Shuffle array using Fisher-Yates algorithm
   * @param {Array} array 
   * @returns {Array} Shuffled array
   */
  static shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Generate embedding with key rotation
   * Tries multiple keys if one fails (Rate Limit or Invalid Key)
   */
  static async generateAndSaveProductEmbedding(productId, productName, description, categoryName, apiKeyOrCompanyId) {
    try {
      let apiKeys = [];

      // Handle legacy call with single apiKey or new call with companyId
      if (apiKeyOrCompanyId.startsWith('AIza')) {
        apiKeys = [apiKeyOrCompanyId];
      } else {
        // It's a companyId, fetch all available keys
        apiKeys = await this.getAllAvailableApiKeys(apiKeyOrCompanyId);
      }

      if (apiKeys.length === 0) {
        console.error(`❌ [EMBEDDING] No API keys available for embedding generation (Product: ${productId})`);
        return null;
      }

      // Try keys sequentially
      let lastError = null;
      for (const apiKey of apiKeys) {
        try {
          // Initialize Gemini AI
          const genAI = new GoogleGenerativeAI(apiKey);
          // Use gemini-embedding-001 for better performance and potentially better quotas
          const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

          // Create structured embedding text for better retrieval quality
          // Focus on semantic meaning and key attributes, removing noise
          const embeddingText = `
            Product: ${productName}
            Category: ${categoryName || 'General'}
            Description: ${description ? description.substring(0, 1000) : ''}
            Keywords: ${productName.split(' ').join(', ')}
          `.trim().replace(/\s+/g, ' '); // Normalize whitespace

          // Generate embedding with 768 dimensions to match postgres schema
          const result = await embeddingModel.embedContent({
            content: { parts: [{ text: embeddingText }] },
            outputDimensionality: 768
          });
          const embedding = result.embedding.values;

          if (!embedding || !Array.isArray(embedding)) {
            throw new Error('Invalid embedding format');
          }

          // Save to database
          await getSharedPrismaClient().product.update({
            where: { id: productId },
            data: {
              embedding: JSON.stringify(embedding),
              embeddingGeneratedAt: new Date()
            }
          });

          console.log(`✅ [EMBEDDING] Generated successfully for: ${productName}`);
          return embedding; // Success!

        } catch (error) {
          lastError = error;
          const isQuota = error.message.includes('429') || error.message.includes('Quota') || error.message.includes('Resource has been exhausted');
          const isAuth = error.message.includes('400') || error.message.includes('API key not valid');

          if (isQuota || isAuth) {
            console.warn(`⚠️ [EMBEDDING] Key failed (${isQuota ? 'Quota' : 'Auth'}), trying next key...`);
            continue; // Try next key
          } else {
            // Other errors (like network or bad request payload) might not be solved by switching keys
            // But we continue just in case
            console.warn(`⚠️ [EMBEDDING] Generation error: ${error.message}, trying next key...`);
          }
        }
      }

      console.error(`❌ [EMBEDDING] All keys failed for product ${productId}. Last error: ${lastError?.message}`);
      return null;

    } catch (error) {
      console.error(`❌ [EMBEDDING] Fatal error for product ${productId}:`, error.message);
      return null;
    }
  }

  /**
   * Update embedding when product data changes
   * Only regenerates if name, description, or category changed
   * @param {string} productId - Product ID
   * @param {Object} updateData - Update data object
   * @param {Object} currentProduct - Current product data
   * @param {string} apiKey - Gemini API key
   * @returns {Promise<boolean>} True if embedding was updated
   */
  static async updateEmbeddingIfNeeded(productId, updateData, currentProduct, apiKey) {
    // Check if fields that affect embedding were changed
    const needsUpdate =
      updateData.name ||
      updateData.description !== undefined ||
      updateData.categoryId;

    if (!needsUpdate) {
      console.log(`⏭️ [EMBEDDING] No embedding update needed for product ${productId}`);
      return false;
    }

    try {
      // Get category name if categoryId changed
      let categoryName = currentProduct.category?.name;
      if (updateData.categoryId && updateData.categoryId !== currentProduct.categoryId) {
        const category = await getSharedPrismaClient().category.findUnique({
          where: { id: updateData.categoryId }
        });
        categoryName = category?.name;
      }

      // Use updated values or fall back to current values
      const productName = updateData.name || currentProduct.name;
      const description = updateData.description !== undefined
        ? updateData.description
        : currentProduct.description;

      // Generate new embedding
      await this.generateAndSaveProductEmbedding(
        productId,
        productName,
        description,
        categoryName,
        apiKey
      );

      console.log(`🔄 [EMBEDDING] Updated embedding for product ${productId}`);
      return true;

    } catch (error) {
      console.error(`❌ [EMBEDDING] Failed to update embedding for product ${productId}:`, error.message);
      return false;
    }
  }

  /**
   * Get active Gemini API key for a company
   * Checks central keys first, then company-specific keys
   * @param {string} companyId - Company ID
   * @returns {Promise<string|null>} API key or null
   */
  static async getActiveApiKey(companyId) {
    try {
      const { getSharedPrismaClient } = require('./sharedDatabase');
      const prisma = getSharedPrismaClient();

      // 1️⃣ Check if company uses central keys
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { useCentralKeys: true }
      });

      if (company?.useCentralKeys) {
        // Use central keys (companyId = null)
        const centralKey = await prisma.geminiKey.findFirst({
          where: {
            companyId: null,
            isActive: true
          },
          orderBy: {
            priority: 'desc'
          }
        });

        if (centralKey && centralKey.apiKey) {
          console.log(`🔑 [EMBEDDING] Using central key for company ${companyId}`);
          return centralKey.apiKey;
        }
      }

      // 2️⃣ Fallback to company-specific keys
      const geminiKey = await prisma.geminiKey.findFirst({
        where: {
          companyId: companyId,
          isActive: true
        },
        orderBy: {
          priority: 'desc'
        }
      });

      if (geminiKey && geminiKey.apiKey) {
        console.log(`🔑 [EMBEDDING] Using company-specific key for company ${companyId}`);
        return geminiKey.apiKey;
      }

      console.warn(`⚠️ [EMBEDDING] No active Gemini API key found for company ${companyId}`);
      return null;

    } catch (error) {
      console.error(`❌ [EMBEDDING] Failed to get API key for company ${companyId}:`, error.message);
      return null;
    }
  }
}

module.exports = EmbeddingHelper;
