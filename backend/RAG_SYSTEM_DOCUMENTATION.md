# 🧠 RAG System - Complete Documentation

## 📋 Overview

Enhanced RAG (Retrieval-Augmented Generation) system with advanced features including dynamic data loading, caching, analytics, rate limiting, and variant search capabilities.

---

## ✅ Implemented Features

### Phase 3: Database Integration 💾

#### ✅ Dynamic FAQs from Database
- **Schema**: Enhanced FAQ model with versioning support
- **Features**:
  - Load FAQs dynamically from database per company
  - Version tracking for FAQ updates
  - Helpful/Not Helpful rating system
  - Category-based organization
  - Fallback to default FAQs if database unavailable
  - Smart caching with 30-minute TTL

#### ✅ Dynamic Policies from Database
- **Schema**: New Policy model with versioning and effective dates
- **Features**:
  - Company-specific policy management
  - Version control for policy updates
  - Effective date and expiration date support
  - Category-based organization
  - Automatic filtering of expired policies
  - Fallback to default policies
  - Smart caching with 30-minute TTL

#### ✅ Cache System
- **Components**: `ragCache.js`
- **Features**:
  - Separate caches for FAQs, Policies, Products, and Search results
  - Configurable TTL per cache type
  - Size enforcement to prevent memory overflow
  - Automatic cleanup of expired entries
  - Cache invalidation API
  - Cache hit/miss tracking

---

### Phase 4: Advanced Features 📊

#### ✅ Improved Variant Search
- **Component**: `ragVariantSearch.js`
- **Features**:
  - Dedicated variant search method
  - Color filtering with synonym support (Arabic/English)
  - Size filtering with synonym support
  - Automatic color/size extraction from queries
  - Variant-specific scoring algorithm
  - Stock availability prioritization
  - Image availability bonus
  - Variant summary generation

**Supported Colors**:
- Arabic: ابيض، اسود، احمر، ازرق، اخضر، اصفر، رمادي، بني، برتقالي، وردي
- English: white, black, red, blue, green, yellow, grey, brown, orange, pink

**Supported Sizes**:
- Text: صغير (small), متوسط (medium), كبير (large), XL, XXL
- Numeric: 38, 39, 40, 41, 42, 43, 44, 45

---

### Phase 5: Monitoring & Analytics 📈

#### ✅ Search Analytics
- **Schema**: `SearchAnalytics` model
- **Features**:
  - Track all search queries
  - Record search intent
  - Monitor results count
  - Track response times
  - Flag successful/failed searches
  - Store metadata for analysis
  - Batch processing for performance
  - Failed search tracking for improvement

#### ✅ Performance Monitoring
- **Schema**: `RAGPerformance` model
- **Features**:
  - Track response times per operation
  - Monitor token usage
  - Record cache hit/miss rates
  - Track error occurrences
  - Operation-specific metrics
  - Batch logging for efficiency
  - Performance statistics API

**Monitored Operations**:
- `searchProducts`
- `loadFAQs`
- `loadPolicies`
- `retrieveRelevantData`
- `searchVariants`

---

### Phase 6: Quality & Security 🔒

#### ✅ Rate Limiting
- **Schema**: `RAGRateLimit` model
- **Component**: `ragRateLimiter.js`
- **Features**:
  - Per-company rate limits (100 req/min default)
  - Per-IP rate limits (50 req/min default)
  - Configurable time windows
  - Memory-based caching for performance
  - Database persistence for analytics
  - Graceful degradation on errors
  - Rate limit statistics API

#### ✅ Structured Logging
- **Component**: `ragLogger.js`
- **Features**:
  - Replaced all console.log with structured logger
  - Log levels: debug, info, warn, error
  - Context-aware logging
  - Performance metric logging
  - Cache hit/miss logging
  - Database operation logging
  - Rate limit event logging
  - Integration with Winston logger

#### ✅ Unit Tests
- **Test Files**:
  - `ragCache.test.js` - Cache functionality tests
  - `ragVariantSearch.test.js` - Variant search tests
  - `ragIntegration.test.js` - End-to-end integration tests

**Test Coverage**:
- Cache operations (set, get, invalidate)
- Cache expiration
- Cache size enforcement
- Variant color matching
- Variant size matching
- Query extraction (color/size)
- Variant search with filters
- Rate limiting
- Analytics tracking
- Error handling

---

## 🗄️ Database Schema

### FAQ Model
```prisma
model FAQ {
  id         String   @id @default(cuid())
  companyId  String
  question   String   @db.Text
  answer     String   @db.Text
  category   String   @default("general")
  tags       String?  @db.Text
  order      Int      @default(0)
  helpful    Int      @default(0)
  notHelpful Int      @default(0)
  isActive   Boolean  @default(true)
  version    Int      @default(1)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

### Policy Model
```prisma
model Policy {
  id          String   @id @default(cuid())
  companyId   String
  title       String
  content     String   @db.Text
  category    String   @default("general")
  tags        String?  @db.Text
  order       Int      @default(0)
  isActive    Boolean  @default(true)
  version     Int      @default(1)
  effectiveAt DateTime @default(now())
  expiresAt   DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### SearchAnalytics Model
```prisma
model SearchAnalytics {
  id            String   @id @default(cuid())
  companyId     String
  customerId    String?
  query         String   @db.Text
  intent        String?
  resultsCount  Int      @default(0)
  wasSuccessful Boolean  @default(true)
  responseTime  Int?
  metadata      String?  @db.Text
  createdAt     DateTime @default(now())
}
```

### RAGPerformance Model
```prisma
model RAGPerformance {
  id               String   @id @default(cuid())
  companyId        String
  operation        String
  responseTime     Int
  tokensUsed       Int?
  cacheHit         Boolean  @default(false)
  errorOccurred    Boolean  @default(false)
  errorMessage     String?  @db.Text
  metadata         String?  @db.Text
  createdAt        DateTime @default(now())
}
```

### RAGRateLimit Model
```prisma
model RAGRateLimit {
  id          String   @id @default(cuid())
  companyId   String
  ipAddress   String?
  requestType String   @default("search")
  requestCount Int     @default(1)
  windowStart DateTime @default(now())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

---

## 🔌 API Endpoints

### Cache Management

#### GET `/api/v1/rag-admin/cache/stats`
Get cache statistics
```json
{
  "success": true,
  "data": {
    "faq": { "size": 10, "maxSize": 100, "ttl": 1800000 },
    "policy": { "size": 5, "maxSize": 100, "ttl": 1800000 },
    "product": { "size": 250, "maxSize": 1000, "ttl": 120000 },
    "search": { "size": 50, "maxSize": 500, "ttl": 300000 }
  }
}
```

#### POST `/api/v1/rag-admin/cache/invalidate`
Invalidate cache
```json
{
  "type": "faq" // or "policy", "product", "all"
}
```

### Analytics

#### GET `/api/v1/rag-admin/analytics/search`
Get search analytics
```
Query params: startDate, endDate, limit
```

#### GET `/api/v1/rag-admin/analytics/performance`
Get performance analytics
```
Query params: startDate, endDate
```

### Rate Limiting

#### GET `/api/v1/rag-admin/rate-limit/stats`
Get rate limit statistics
```
Query params: hours (default: 24)
```

#### POST `/api/v1/rag-admin/rate-limit/update` (Admin only)
Update rate limits
```json
{
  "type": "perCompany",
  "windowMs": 60000,
  "maxRequests": 100
}
```

### Data Reload

#### POST `/api/v1/rag-admin/reload/faqs`
Reload FAQs from database

#### POST `/api/v1/rag-admin/reload/policies`
Reload policies from database

### System Health

#### GET `/api/v1/rag-admin/health`
Get system health status

---

## 🚀 Usage Examples

### Using Variant Search
```javascript
const { ragVariantSearch } = require('./services/rag');

// Search with color filter
const results = ragVariantSearch.searchVariants(
  products,
  'كوتشي احمر',
  { color: 'احمر' }
);

// Search with size filter
const results = ragVariantSearch.searchVariants(
  products,
  'مقاس 42',
  { size: '42' }
);

// Auto-extract filters from query
const color = ragVariantSearch.extractColorFromQuery('عايز كوتشي ابيض');
const size = ragVariantSearch.extractSizeFromQuery('مقاس 40');
```

### Using Cache
```javascript
const { ragCache } = require('./services/rag');

// Get cached FAQs
const faqs = ragCache.getFAQs(companyId);

// Invalidate cache
ragCache.invalidateFAQs(companyId);
ragCache.invalidateAll(companyId);
```

### Logging Analytics
```javascript
const { ragAnalytics } = require('./services/rag');

// Log search
await ragAnalytics.logSearch(
  companyId,
  customerId,
  query,
  intent,
  resultsCount,
  responseTime,
  wasSuccessful
);

// Log performance
await ragAnalytics.logPerformance(
  companyId,
  'searchProducts',
  responseTime,
  tokensUsed,
  cacheHit
);
```

### Rate Limiting
```javascript
const { ragRateLimiter } = require('./services/rag');

// Check rate limit
const result = await ragRateLimiter.checkRateLimit(
  companyId,
  ipAddress,
  'search'
);

if (!result.allowed) {
  return res.status(429).json({
    error: 'Rate limit exceeded',
    retryAfter: result.retryAfter
  });
}
```

---

## 📊 Performance Optimizations

1. **Batch Processing**: Analytics are batched (50 items) before database write
2. **Memory Caching**: Rate limits cached in memory for fast checks
3. **TTL-based Expiration**: Automatic cleanup of expired cache entries
4. **Size Enforcement**: Prevents memory overflow with max size limits
5. **Lazy Loading**: FAQs/Policies loaded only when needed
6. **Parallel Operations**: Independent operations run in parallel

---

## 🧪 Testing

Run all RAG tests:
```bash
npm test -- tests/rag/
```

Run specific test suites:
```bash
npm test -- tests/rag/ragCache.test.js
npm test -- tests/rag/ragVariantSearch.test.js
npm test -- tests/rag/ragIntegration.test.js
```

---

## 🔧 Configuration

### Cache TTL (in milliseconds)
- FAQ: 30 minutes (1,800,000 ms)
- Policy: 30 minutes (1,800,000 ms)
- Product: 2 minutes (120,000 ms)
- Search: 5 minutes (300,000 ms)

### Cache Size Limits
- FAQ: 100 entries
- Policy: 100 entries
- Product: 1000 entries
- Search: 500 entries

### Rate Limits
- Per Company: 100 requests/minute
- Per IP: 50 requests/minute

### Analytics
- Batch Size: 50 items
- Flush Interval: 30 seconds

---

## 🔄 Migration Guide

1. Run Prisma migration:
```bash
npx prisma migrate dev --name add_rag_enhancements
```

2. Update server.js to include RAG admin routes:
```javascript
const ragAdminRoutes = require('./routes/ragAdmin');
app.use('/api/v1/rag-admin', ragAdminRoutes);
```

3. Update existing RAG service to use new components (optional - backward compatible)

---

## 📈 Monitoring Dashboard (Future Enhancement)

Recommended metrics to display:
- Search success rate
- Average response time
- Cache hit rate
- Top failed searches
- Token usage trends
- Rate limit violations
- Most searched queries
- Variant search patterns

---

## 🎯 Future Enhancements

1. **Machine Learning**:
   - Learn from failed searches
   - Auto-suggest FAQ improvements
   - Predict popular variants

2. **Advanced Analytics**:
   - Search trend analysis
   - Customer behavior patterns
   - Product recommendation engine

3. **Optimization**:
   - Redis integration for distributed caching
   - Elasticsearch for advanced search
   - GraphQL API for flexible queries

---

## 📝 Notes

- All components are backward compatible
- Graceful degradation on errors
- Production-ready with comprehensive error handling
- Fully tested with unit and integration tests
- Structured logging for debugging
- Rate limiting prevents abuse
- Analytics provide actionable insights

---

## 🆘 Troubleshooting

### Cache not working
- Check cache stats API
- Verify TTL configuration
- Check memory limits

### Rate limiting too strict
- Adjust limits via API
- Check rate limit stats
- Review IP-based limits

### Analytics not recording
- Check batch queue size
- Verify database connection
- Review error logs

### Variant search not finding results
- Check variant data structure
- Verify color/size synonyms
- Review normalization logic

---

## 📞 Support

For issues or questions:
1. Check logs in `./logs/` directory
2. Review error messages in structured logs
3. Check system health endpoint
4. Review analytics for patterns
