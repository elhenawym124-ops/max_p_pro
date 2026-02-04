const ragCache = require('../../services/rag/ragCache');

describe('RAGCache', () => {
  beforeEach(() => {
    ragCache.cleanup();
  });

  afterAll(() => {
    ragCache.cleanup();
  });

  describe('FAQ Cache', () => {
    test('should cache and retrieve FAQs', () => {
      const companyId = 'test-company-1';
      const faqs = [
        { question: 'Test Q1', answer: 'Test A1' },
        { question: 'Test Q2', answer: 'Test A2' }
      ];

      ragCache.setFAQs(companyId, faqs);
      const retrieved = ragCache.getFAQs(companyId);

      expect(retrieved).toEqual(faqs);
    });

    test('should return null for expired FAQs', () => {
      const companyId = 'test-company-2';
      const faqs = [{ question: 'Test', answer: 'Test' }];

      ragCache.cacheTTL.faq = 100;
      ragCache.setFAQs(companyId, faqs);

      return new Promise((resolve) => {
        setTimeout(() => {
          const retrieved = ragCache.getFAQs(companyId);
          expect(retrieved).toBeNull();
          ragCache.cacheTTL.faq = 30 * 60 * 1000;
          resolve();
        }, 150);
      });
    });

    test('should invalidate FAQ cache', () => {
      const companyId = 'test-company-3';
      const faqs = [{ question: 'Test', answer: 'Test' }];

      ragCache.setFAQs(companyId, faqs);
      ragCache.invalidateFAQs(companyId);
      const retrieved = ragCache.getFAQs(companyId);

      expect(retrieved).toBeNull();
    });
  });

  describe('Policy Cache', () => {
    test('should cache and retrieve Policies', () => {
      const companyId = 'test-company-1';
      const policies = [
        { title: 'Policy 1', content: 'Content 1' },
        { title: 'Policy 2', content: 'Content 2' }
      ];

      ragCache.setPolicies(companyId, policies);
      const retrieved = ragCache.getPolicies(companyId);

      expect(retrieved).toEqual(policies);
    });

    test('should invalidate Policy cache', () => {
      const companyId = 'test-company-4';
      const policies = [{ title: 'Test', content: 'Test' }];

      ragCache.setPolicies(companyId, policies);
      ragCache.invalidatePolicies(companyId);
      const retrieved = ragCache.getPolicies(companyId);

      expect(retrieved).toBeNull();
    });
  });

  describe('Search Cache', () => {
    test('should cache and retrieve search results', () => {
      const companyId = 'test-company-1';
      const query = 'test query';
      const intent = 'product_inquiry';
      const results = [{ id: 1, name: 'Product 1' }];

      ragCache.setSearch(companyId, query, intent, results);
      const retrieved = ragCache.getSearch(companyId, query, intent);

      expect(retrieved).toEqual(results);
    });

    test('should return null for different query', () => {
      const companyId = 'test-company-1';
      const query1 = 'test query 1';
      const query2 = 'test query 2';
      const intent = 'product_inquiry';
      const results = [{ id: 1, name: 'Product 1' }];

      ragCache.setSearch(companyId, query1, intent, results);
      const retrieved = ragCache.getSearch(companyId, query2, intent);

      expect(retrieved).toBeNull();
    });
  });

  describe('Cache Size Enforcement', () => {
    test('should enforce max cache size for FAQs', () => {
      const originalMaxSize = ragCache.maxCacheSize.faq;
      ragCache.maxCacheSize.faq = 3;

      for (let i = 0; i < 5; i++) {
        ragCache.setFAQs(`company-${i}`, [{ question: `Q${i}`, answer: `A${i}` }]);
      }

      expect(ragCache.faqCache.size).toBeLessThanOrEqual(3);
      ragCache.maxCacheSize.faq = originalMaxSize;
    });
  });

  describe('Cache Statistics', () => {
    test('should return cache statistics', () => {
      ragCache.setFAQs('company-1', [{ question: 'Q1', answer: 'A1' }]);
      ragCache.setPolicies('company-1', [{ title: 'P1', content: 'C1' }]);

      const stats = ragCache.getStats();

      expect(stats).toHaveProperty('faq');
      expect(stats).toHaveProperty('policy');
      expect(stats).toHaveProperty('product');
      expect(stats).toHaveProperty('search');
      expect(stats.faq.size).toBeGreaterThan(0);
      expect(stats.policy.size).toBeGreaterThan(0);
    });
  });

  describe('Invalidate All', () => {
    test('should invalidate all caches for a company', () => {
      const companyId = 'test-company-1';

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
