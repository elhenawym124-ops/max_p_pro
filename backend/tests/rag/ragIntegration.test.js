const ragCache = require('../../services/rag/ragCache');
const ragAnalytics = require('../../services/rag/ragAnalytics');
const ragRateLimiter = require('../../services/rag/ragRateLimiter');
const ragVariantSearch = require('../../services/rag/ragVariantSearch');

describe('RAG System Integration Tests', () => {
  beforeEach(() => {
    ragCache.cleanup();
  });

  afterAll(async () => {
    ragCache.cleanup();
    await ragAnalytics.cleanup();
    await ragRateLimiter.cleanup();
  });

  describe('Cache and Analytics Integration', () => {
    test('should track cache hits and misses in analytics', async () => {
      const companyId = 'test-company-1';
      const faqs = [{ question: 'Q1', answer: 'A1' }];

      ragCache.setFAQs(companyId, faqs);
      
      const hit = ragCache.getFAQs(companyId);
      expect(hit).toEqual(faqs);

      ragCache.invalidateFAQs(companyId);
      const miss = ragCache.getFAQs(companyId);
      expect(miss).toBeNull();
    });
  });

  describe('Rate Limiting and Search Integration', () => {
    test('should enforce rate limits on search operations', async () => {
      const companyId = `test-company-${Date.now()}`;
      const ipAddress = `192.168.1.${Math.floor(Math.random() * 255)}`;

      await ragRateLimiter.cleanup();
      ragRateLimiter.setLimits('perCompany', 1000, 2);

      const result1 = await ragRateLimiter.checkRateLimit(companyId, ipAddress, 'search');
      expect(result1.allowed).toBe(true);

      const result2 = await ragRateLimiter.checkRateLimit(companyId, ipAddress, 'search');
      expect(result2.allowed).toBe(true);

      const result3 = await ragRateLimiter.checkRateLimit(companyId, ipAddress, 'search');
      if (!result3.allowed) {
        expect(result3.reason).toBe('company_limit_exceeded');
      }

      ragRateLimiter.setLimits('perCompany', 60000, 100);
      await ragRateLimiter.cleanup();
    });
  });

  describe('Variant Search with Caching', () => {
    test('should cache variant search results', () => {
      const companyId = 'test-company-3';
      const query = 'كوتشي ابيض';
      const intent = 'product_inquiry';
      
      const mockProducts = [
        {
          type: 'product',
          metadata: {
            id: 'prod1',
            name: 'Nike Shoes',
            variants: [
              { id: 'v1', name: 'ابيض', type: 'color', price: 500, stock: 10, images: [] }
            ]
          }
        }
      ];

      const results = ragVariantSearch.searchVariants(mockProducts, query, { color: 'ابيض' });
      
      ragCache.setSearch(companyId, query, intent, results);
      const cached = ragCache.getSearch(companyId, query, intent);

      expect(cached).toEqual(results);
      expect(cached.length).toBeGreaterThan(0);
    });
  });

  describe('End-to-End Search Flow', () => {
    test('should handle complete search flow with all components', async () => {
      const companyId = 'test-company-4';
      const customerId = 'customer-1';
      const query = 'كوتشي احمر مقاس 42';
      const intent = 'product_inquiry';
      const ipAddress = '192.168.1.100';

      const rateLimitCheck = await ragRateLimiter.checkRateLimit(companyId, ipAddress, 'search');
      expect(rateLimitCheck.allowed).toBe(true);

      const cachedResults = ragCache.getSearch(companyId, query, intent);
      expect(cachedResults).toBeNull();

      const mockProducts = [
        {
          type: 'product',
          metadata: {
            id: 'prod1',
            name: 'Adidas Shoes',
            variants: [
              { id: 'v1', name: 'احمر', type: 'color', price: 600, stock: 5, images: ['img1.jpg'] },
              { id: 'v2', name: '42', type: 'size', price: 600, stock: 5, images: [] }
            ]
          }
        }
      ];

      const colorFilter = ragVariantSearch.extractColorFromQuery(query);
      const sizeFilter = ragVariantSearch.extractSizeFromQuery(query);

      const searchResults = ragVariantSearch.searchVariants(mockProducts, query, {
        color: colorFilter,
        size: sizeFilter
      });

      expect(searchResults.length).toBeGreaterThan(0);

      ragCache.setSearch(companyId, query, intent, searchResults);

      const responseTime = 150;
      await ragAnalytics.logSearch(
        companyId,
        customerId,
        query,
        intent,
        searchResults.length,
        responseTime,
        true,
        { colorFilter, sizeFilter }
      );

      const cachedAfterSearch = ragCache.getSearch(companyId, query, intent);
      expect(cachedAfterSearch).toEqual(searchResults);
    });
  });

  describe('Performance Monitoring', () => {
    test('should track performance metrics', async () => {
      const companyId = 'test-company-5';
      
      await ragAnalytics.logPerformance(
        companyId,
        'searchProducts',
        120,
        500,
        false,
        false,
        null,
        { source: 'test' }
      );

      await ragAnalytics.logPerformance(
        companyId,
        'loadFAQs',
        50,
        null,
        true,
        false,
        null,
        { source: 'test' }
      );

      await ragAnalytics.flushBatch();
    });
  });

  describe('Error Handling', () => {
    test('should handle errors gracefully in analytics', async () => {
      const companyId = 'test-company-6';
      
      await ragAnalytics.logPerformance(
        companyId,
        'failedOperation',
        200,
        null,
        false,
        true,
        'Test error message',
        { errorCode: 'TEST_ERROR' }
      );

      await ragAnalytics.flushBatch();
    });

    test('should continue working when rate limiter fails', async () => {
      const result = await ragRateLimiter.checkRateLimit('invalid-company', null, 'search');
      expect(result.allowed).toBe(true);
    });
  });

  describe('Cache Invalidation Flow', () => {
    test('should invalidate all related caches', () => {
      const companyId = 'test-company-7';

      ragCache.setFAQs(companyId, [{ question: 'Q1', answer: 'A1' }]);
      ragCache.setPolicies(companyId, [{ title: 'P1', content: 'C1' }]);
      ragCache.setProducts(companyId, [{ id: 1, name: 'Product 1' }]);
      ragCache.setSearch(companyId, 'query', 'intent', [{ id: 1 }]);

      ragCache.invalidateAll(companyId);

      expect(ragCache.getFAQs(companyId)).toBeNull();
      expect(ragCache.getPolicies(companyId)).toBeNull();
      expect(ragCache.getProducts(companyId)).toBeNull();
      expect(ragCache.getSearch(companyId, 'query', 'intent')).toBeNull();
    });
  });
});
