/**
 * Safe Database Operations Wrapper
 * 
 * Provides wrapped database operations that automatically handle connection limits
 * and other database errors with retry logic.
 */

const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');

class SafeDatabase {
  constructor() {
    this.prisma = getSharedPrismaClient();
  }

  /**
   * Safe wrapper for any Prisma operation with retry logic
   */
  async execute(operation, options = {}) {
    const { maxRetries = 3, fallback = null } = options;
    
    try {
      return await executeWithRetry(async () => {
        return await operation(this.prisma);
      }, maxRetries);
    } catch (error) {
      // Log the error with context
      console.error('🚨 [SafeDB] Database operation failed:', {
        error: error.message,
        code: error.code,
        isConnectionLimit: error.message.includes('max_connections_per_hour'),
        timestamp: new Date().toISOString()
      });

      // Return fallback if provided and it's a connection limit error
      if (fallback !== null && error.message.includes('max_connections_per_hour')) {
        //console.log('🔄 [SafeDB] Using fallback response due to connection limit');
        return fallback;
      }

      throw error;
    }
  }

  /**
   * Safe find operations
   */
  async findMany(model, args = {}, options = {}) {
    return this.execute(async (prisma) => {
      return await prisma[model].findMany(args);
    }, { fallback: [], ...options });
  }

  async findUnique(model, args, options = {}) {
    return this.execute(async (prisma) => {
      return await prisma[model].findUnique(args);
    }, { fallback: null, ...options });
  }

  async findFirst(model, args, options = {}) {
    return this.execute(async (prisma) => {
      return await prisma[model].findFirst(args);
    }, { fallback: null, ...options });
  }

  /**
   * Safe create operations
   */
  async create(model, args, options = {}) {
    return this.execute(async (prisma) => {
      return await prisma[model].create(args);
    }, options);
  }

  async createMany(model, args, options = {}) {
    return this.execute(async (prisma) => {
      return await prisma[model].createMany(args);
    }, options);
  }

  /**
   * Safe update operations
   */
  async update(model, args, options = {}) {
    return this.execute(async (prisma) => {
      return await prisma[model].update(args);
    }, options);
  }

  async updateMany(model, args, options = {}) {
    return this.execute(async (prisma) => {
      return await prisma[model].updateMany(args);
    }, options);
  }

  /**
   * Safe delete operations
   */
  async delete(model, args, options = {}) {
    return this.execute(async (prisma) => {
      return await prisma[model].delete(args);
    }, options);
  }

  async deleteMany(model, args, options = {}) {
    return this.execute(async (prisma) => {
      return await prisma[model].deleteMany(args);
    }, options);
  }

  /**
   * Safe count operations
   */
  async count(model, args = {}, options = {}) {
    return this.execute(async (prisma) => {
      return await prisma[model].count(args);
    }, { fallback: 0, ...options });
  }

  /**
   * Safe aggregate operations
   */
  async aggregate(model, args, options = {}) {
    return this.execute(async (prisma) => {
      return await prisma[model].aggregate(args);
    }, options);
  }

  /**
   * Safe groupBy operations
   */
  async groupBy(model, args, options = {}) {
    return this.execute(async (prisma) => {
      return await prisma[model].groupBy(args);
    }, { fallback: [], ...options });
  }

  /**
   * Safe raw query operations
   */
  async queryRaw(query, values = [], options = {}) {
    return this.execute(async (prisma) => {
      return await prisma.$queryRaw(query, ...values);
    }, options);
  }

  /**
   * Safe transaction operations
   */
  async transaction(operations, options = {}) {
    return this.execute(async (prisma) => {
      return await prisma.$transaction(operations);
    }, options);
  }

  /**
   * Get connection status
   */
  async getConnectionStatus() {
    try {
      await this.execute(async (prisma) => {
        await prisma.$queryRaw`SELECT 1 as test`;
      }, { maxRetries: 1 });
      return { status: 'connected', timestamp: new Date().toISOString() };
    } catch (error) {
      return { 
        status: 'disconnected', 
        error: error.message, 
        isConnectionLimit: error.message.includes('max_connections_per_hour'),
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Create singleton instance
const safeDb = new SafeDatabase();

/**
 * Helper functions for common patterns
 */
const DatabaseHelpers = {
  /**
   * Safely get paginated results with fallback
   */
  async getPaginated(model, { page = 1, limit = 10, where = {}, orderBy = {} }) {
    const skip = (page - 1) * limit;
    
    try {
      const [items, total] = await Promise.all([
        safeDb.findMany(model, {
          where,
          orderBy,
          skip,
          take: limit
        }),
        safeDb.count(model, { where })
      ]);

      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + items.length < total
      };
    } catch (error) {
      if (error.message.includes('max_connections_per_hour')) {
        return {
          items: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
          hasMore: false,
          error: 'Connection limit exceeded'
        };
      }
      throw error;
    }
  },

  /**
   * Safely check if record exists
   */
  async exists(model, where) {
    try {
      const record = await safeDb.findFirst(model, { where });
      return !!record;
    } catch (error) {
      if (error.message.includes('max_connections_per_hour')) {
        return false; // Assume doesn't exist if can't check
      }
      throw error;
    }
  },

  /**
   * Safely get or create record
   */
  async getOrCreate(model, { where, create }) {
    try {
      let record = await safeDb.findFirst(model, { where });
      if (!record) {
        record = await safeDb.create(model, { data: create });
      }
      return record;
    } catch (error) {
      if (error.message.includes('max_connections_per_hour')) {
        throw new Error('Cannot create record due to connection limit');
      }
      throw error;
    }
  }
};

module.exports = {
  SafeDatabase,
  safeDb,
  DatabaseHelpers
};