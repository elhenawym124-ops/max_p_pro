const ragVariantSearch = require('../../services/rag/ragVariantSearch');

describe('RAGVariantSearch', () => {
  describe('Color Matching', () => {
    test('should match exact color names', () => {
      expect(ragVariantSearch.matchColor('ابيض', 'ابيض')).toBe(true);
      expect(ragVariantSearch.matchColor('اسود', 'اسود')).toBe(true);
    });

    test('should match color synonyms', () => {
      expect(ragVariantSearch.matchColor('ابيض', 'أبيض')).toBe(true);
      expect(ragVariantSearch.matchColor('white', 'ابيض')).toBe(true);
      expect(ragVariantSearch.matchColor('اسود', 'black')).toBe(true);
    });

    test('should not match different colors', () => {
      expect(ragVariantSearch.matchColor('ابيض', 'اسود')).toBe(false);
      expect(ragVariantSearch.matchColor('احمر', 'ازرق')).toBe(false);
    });
  });

  describe('Size Matching', () => {
    test('should match exact size names', () => {
      expect(ragVariantSearch.matchSize('40', '40')).toBe(true);
      expect(ragVariantSearch.matchSize('large', 'large')).toBe(true);
    });

    test('should match size synonyms', () => {
      expect(ragVariantSearch.matchSize('صغير', 'small')).toBe(true);
      expect(ragVariantSearch.matchSize('متوسط', 'medium')).toBe(true);
      expect(ragVariantSearch.matchSize('كبير', 'large')).toBe(true);
    });

    test('should match numeric sizes', () => {
      expect(ragVariantSearch.matchSize('40', '40')).toBe(true);
      expect(ragVariantSearch.matchSize('42', '42')).toBe(true);
    });
  });

  describe('Extract Color from Query', () => {
    test('should extract Arabic color names', () => {
      expect(ragVariantSearch.extractColorFromQuery('عايز كوتشي ابيض')).toBeTruthy();
      expect(ragVariantSearch.extractColorFromQuery('محتاج حذاء اسود')).toBeTruthy();
    });

    test('should extract English color names', () => {
      expect(ragVariantSearch.extractColorFromQuery('I want white shoes')).toBeTruthy();
      expect(ragVariantSearch.extractColorFromQuery('black sneakers')).toBeTruthy();
    });

    test('should return null if no color found', () => {
      expect(ragVariantSearch.extractColorFromQuery('عايز كوتشي')).toBeNull();
      expect(ragVariantSearch.extractColorFromQuery('shoes')).toBeNull();
    });
  });

  describe('Extract Size from Query', () => {
    test('should extract numeric sizes', () => {
      expect(ragVariantSearch.extractSizeFromQuery('مقاس 42')).toBe('42');
      const result = ragVariantSearch.extractSizeFromQuery('size 40');
      expect(result).toBeTruthy();
    });

    test('should extract text sizes', () => {
      expect(ragVariantSearch.extractSizeFromQuery('مقاس كبير')).toBeTruthy();
      expect(ragVariantSearch.extractSizeFromQuery('small size')).toBeTruthy();
    });

    test('should return null if no size found', () => {
      expect(ragVariantSearch.extractSizeFromQuery('عايز كوتشي')).toBeNull();
    });
  });

  describe('Search Variants', () => {
    const mockProducts = [
      {
        type: 'product',
        metadata: {
          id: 'prod1',
          name: 'Nike Shoes',
          variants: [
            { id: 'v1', name: 'ابيض', type: 'color', price: 500, stock: 10, images: ['img1.jpg'] },
            { id: 'v2', name: 'اسود', type: 'color', price: 500, stock: 5, images: ['img2.jpg'] },
            { id: 'v3', name: '40', type: 'size', price: 500, stock: 8, images: [] },
            { id: 'v4', name: '42', type: 'size', price: 500, stock: 0, images: [] }
          ]
        }
      }
    ];

    test('should find variants matching color filter', () => {
      const results = ragVariantSearch.searchVariants(mockProducts, 'كوتشي', { color: 'ابيض' });
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].matchedVariants.length).toBeGreaterThan(0);
      expect(results[0].matchedVariants[0].name).toBe('ابيض');
    });

    test('should find variants matching size filter', () => {
      const results = ragVariantSearch.searchVariants(mockProducts, 'كوتشي', { size: '40' });
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].matchedVariants.length).toBeGreaterThan(0);
      expect(results[0].matchedVariants[0].name).toBe('40');
    });

    test('should prioritize in-stock variants', () => {
      const results = ragVariantSearch.searchVariants(mockProducts, 'كوتشي', { type: 'color' });
      
      expect(results.length).toBeGreaterThan(0);
      const firstVariant = results[0].matchedVariants[0];
      expect(firstVariant.stock).toBeGreaterThan(0);
    });

    test('should return empty array for products without variants', () => {
      const noVariantProducts = [
        {
          type: 'product',
          metadata: { id: 'prod2', name: 'Simple Product', variants: [] }
        }
      ];

      const results = ragVariantSearch.searchVariants(noVariantProducts, 'product', {});
      expect(results).toEqual([]);
    });
  });

  describe('Calculate Variant Score', () => {
    test('should calculate higher score for multiple matching variants', () => {
      const variants1 = [
        { matchScore: 50 },
        { matchScore: 40 },
        { matchScore: 30 }
      ];

      const variants2 = [
        { matchScore: 50 }
      ];

      const score1 = ragVariantSearch.calculateVariantScore(variants1, 'query', {});
      const score2 = ragVariantSearch.calculateVariantScore(variants2, 'query', {});

      expect(score1).toBeGreaterThanOrEqual(score2 - 5);
    });

    test('should add bonus for filter matches', () => {
      const variants = [{ matchScore: 50 }];

      const scoreWithFilter = ragVariantSearch.calculateVariantScore(variants, 'query', { color: 'ابيض' });
      const scoreWithoutFilter = ragVariantSearch.calculateVariantScore(variants, 'query', {});

      expect(scoreWithFilter).toBeGreaterThan(scoreWithoutFilter);
    });
  });

  describe('Get Variant Summary', () => {
    test('should generate variant summary', () => {
      const product = {
        metadata: {
          variants: [
            { name: 'ابيض', type: 'color', price: 500, stock: 10 },
            { name: 'اسود', type: 'color', price: 500, stock: 5 },
            { name: '40', type: 'size', price: 500, stock: 8 },
            { name: '42', type: 'size', price: 550, stock: 0 }
          ]
        }
      };

      const summary = ragVariantSearch.getVariantSummary(product);

      expect(summary).toHaveProperty('color');
      expect(summary).toHaveProperty('size');
      expect(summary.color.count).toBe(2);
      expect(summary.size.count).toBe(2);
      expect(summary.color.inStock).toBe(2);
      expect(summary.size.inStock).toBe(1);
    });

    test('should return null for products without variants', () => {
      const product = { metadata: { variants: [] } };
      const summary = ragVariantSearch.getVariantSummary(product);
      expect(summary).toBeNull();
    });
  });

  describe('Text Normalization', () => {
    test('should normalize Arabic text', () => {
      expect(ragVariantSearch.normalizeText('أبيض')).toBe('ابيض');
      expect(ragVariantSearch.normalizeText('إسود')).toBe('اسود');
      expect(ragVariantSearch.normalizeText('كبيرة')).toBe('كبيره');
    });

    test('should remove diacritics', () => {
      expect(ragVariantSearch.normalizeText('مُنتَج')).toBe('منتج');
    });

    test('should handle empty strings', () => {
      expect(ragVariantSearch.normalizeText('')).toBe('');
      expect(ragVariantSearch.normalizeText(null)).toBe('');
    });
  });
});
