const ragLogger = require('./ragLogger');

class RAGVariantSearch {
  searchVariants(products, query, filters = {}) {
    const startTime = Date.now();
    const normalizedQuery = this.normalizeText(query);
    const results = [];

    for (const product of products) {
      if (!product.metadata?.variants || product.metadata.variants.length === 0) {
        continue;
      }

      const variantMatches = this.findMatchingVariants(
        product.metadata.variants,
        normalizedQuery,
        filters
      );

      if (variantMatches.length > 0) {
        results.push({
          ...product,
          matchedVariants: variantMatches,
          variantScore: this.calculateVariantScore(variantMatches, normalizedQuery, filters)
        });
      }
    }

    const sorted = results.sort((a, b) => b.variantScore - a.variantScore);
    
    const duration = Date.now() - startTime;
    ragLogger.debug('Variant search completed', {
      query,
      filters,
      resultsCount: sorted.length,
      duration
    });

    return sorted;
  }

  findMatchingVariants(variants, normalizedQuery, filters) {
    const matches = [];

    for (const variant of variants) {
      let score = 0;
      let matchReasons = [];

      if (filters.color && variant.type === 'color') {
        const colorMatch = this.matchColor(variant.name, filters.color);
        if (colorMatch) {
          score += 50;
          matchReasons.push('color_filter_match');
        } else {
          continue;
        }
      }

      if (filters.size && variant.type === 'size') {
        const sizeMatch = this.matchSize(variant.name, filters.size);
        if (sizeMatch) {
          score += 50;
          matchReasons.push('size_filter_match');
        } else {
          continue;
        }
      }

      if (filters.type && variant.type !== filters.type) {
        continue;
      }

      const nameMatch = this.normalizeText(variant.name).includes(normalizedQuery) ||
                        normalizedQuery.includes(this.normalizeText(variant.name));
      if (nameMatch) {
        score += 30;
        matchReasons.push('name_match');
      }

      if (variant.stock > 0) {
        score += 20;
        matchReasons.push('in_stock');
      }

      if (variant.images && variant.images.length > 0) {
        score += 10;
        matchReasons.push('has_images');
      }

      if (score > 0 || matchReasons.length > 0) {
        matches.push({
          ...variant,
          matchScore: score,
          matchReasons
        });
      }
    }

    return matches.sort((a, b) => b.matchScore - a.matchScore);
  }

  matchColor(variantName, filterColor) {
    const normalizedVariant = this.normalizeText(variantName);
    const normalizedFilter = this.normalizeText(filterColor);

    const colorSynonyms = {
      'ابيض': ['أبيض', 'الابيض', 'الأبيض', 'white', 'ابيظ', 'بيضاء'],
      'اسود': ['أسود', 'الاسود', 'الأسود', 'black', 'اسوت', 'سودة'],
      'احمر': ['أحمر', 'الاحمر', 'red', 'حمراء'],
      'ازرق': ['أزرق', 'الازرق', 'blue', 'زرقاء'],
      'اخضر': ['أخضر', 'الاخضر', 'green', 'خضراء'],
      'اصفر': ['أصفر', 'الاصفر', 'yellow', 'صفراء'],
      'رمادي': ['grey', 'gray', 'رصاصي'],
      'بني': ['brown', 'بنى'],
      'برتقالي': ['orange', 'برتقالى'],
      'وردي': ['pink', 'روز', 'زهري']
    };

    if (normalizedVariant === normalizedFilter) {
      return true;
    }

    for (const [base, synonyms] of Object.entries(colorSynonyms)) {
      const allVariants = [base, ...synonyms].map(s => this.normalizeText(s));
      if (allVariants.includes(normalizedVariant) && allVariants.includes(normalizedFilter)) {
        return true;
      }
    }

    return false;
  }

  matchSize(variantName, filterSize) {
    const normalizedVariant = this.normalizeText(variantName);
    const normalizedFilter = this.normalizeText(filterSize);

    const sizeSynonyms = {
      'صغير': ['small', 'صغيره', 'صغيرة', 's', 'xs'],
      'متوسط': ['medium', 'وسط', 'm'],
      'كبير': ['large', 'كبيره', 'كبيرة', 'l', 'xl'],
      'كبير جدا': ['xlarge', 'xxl', '2xl', 'كبير جدا'],
      '38': ['38', 'ثمانيه وثلاثين'],
      '39': ['39', 'تسعه وثلاثين'],
      '40': ['40', 'اربعين'],
      '41': ['41', 'واحد واربعين'],
      '42': ['42', 'اثنين واربعين'],
      '43': ['43', 'ثلاثه واربعين'],
      '44': ['44', 'اربعه واربعين'],
      '45': ['45', 'خمسه واربعين']
    };

    if (normalizedVariant === normalizedFilter) {
      return true;
    }

    for (const [base, synonyms] of Object.entries(sizeSynonyms)) {
      const allVariants = [base, ...synonyms].map(s => this.normalizeText(s));
      if (allVariants.includes(normalizedVariant) && allVariants.includes(normalizedFilter)) {
        return true;
      }
    }

    return normalizedVariant.includes(normalizedFilter) || normalizedFilter.includes(normalizedVariant);
  }

  calculateVariantScore(variants, query, filters) {
    if (variants.length === 0) return 0;

    const avgScore = variants.reduce((sum, v) => sum + v.matchScore, 0) / variants.length;
    const maxScore = Math.max(...variants.map(v => v.matchScore));
    const variantCount = variants.length;

    let finalScore = (avgScore * 0.4) + (maxScore * 0.6);

    if (filters.color || filters.size) {
      finalScore += 30;
    }

    if (variantCount > 3) {
      finalScore += 10;
    }

    return finalScore;
  }

  extractColorFromQuery(query) {
    const normalizedQuery = this.normalizeText(query);
    const colors = [
      'ابيض', 'أبيض', 'white',
      'اسود', 'أسود', 'black',
      'احمر', 'أحمر', 'red',
      'ازرق', 'أزرق', 'blue',
      'اخضر', 'أخضر', 'green',
      'اصفر', 'أصفر', 'yellow',
      'رمادي', 'grey', 'gray',
      'بني', 'brown',
      'برتقالي', 'orange',
      'وردي', 'pink', 'روز'
    ];

    for (const color of colors) {
      if (normalizedQuery.includes(this.normalizeText(color))) {
        return color;
      }
    }

    return null;
  }

  extractSizeFromQuery(query) {
    const normalizedQuery = this.normalizeText(query);
    const sizes = [
      'صغير', 'small', 's',
      'متوسط', 'medium', 'm',
      'كبير', 'large', 'l',
      'xl', 'xxl',
      '38', '39', '40', '41', '42', '43', '44', '45'
    ];

    for (const size of sizes) {
      if (normalizedQuery.includes(this.normalizeText(size))) {
        return size;
      }
    }

    const numberMatch = query.match(/\d+/);
    if (numberMatch) {
      return numberMatch[0];
    }

    return null;
  }

  normalizeText(text) {
    if (!text) return '';
    
    return text
      .replace(/[أإآا]/g, 'ا')
      .replace(/[يى]/g, 'ي')
      .replace(/[ة]/g, 'ه')
      .replace(/[ًٌٍَُِّْ]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  getVariantSummary(product) {
    if (!product.metadata?.variants || product.metadata.variants.length === 0) {
      return null;
    }

    const variants = product.metadata.variants;
    const byType = {};

    for (const variant of variants) {
      if (!byType[variant.type]) {
        byType[variant.type] = [];
      }
      byType[variant.type].push(variant);
    }

    const summary = {};
    for (const [type, items] of Object.entries(byType)) {
      summary[type] = {
        count: items.length,
        options: items.map(v => v.name),
        inStock: items.filter(v => v.stock > 0).length,
        priceRange: {
          min: Math.min(...items.map(v => v.price)),
          max: Math.max(...items.map(v => v.price))
        }
      };
    }

    return summary;
  }
}

module.exports = new RAGVariantSearch();
