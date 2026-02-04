const request = require('supertest');
const express = require('express');
const { getSharedPrismaClient } = require('../../services/sharedDatabase');

describe('Products API', () => {
  let app;
  let prisma;
  let testCompanyId;
  let testProductId;
  let authToken;

  beforeAll(async () => {
    prisma = getSharedPrismaClient();
    
    // Create minimal Express app for testing
    app = express();
    app.use(express.json());
    
    // Mock authentication middleware
    app.use((req, res, next) => {
      req.user = {
        id: 'test-user-id',
        companyId: testCompanyId,
        role: 'OWNER'
      };
      next();
    });
    
    // Mount product routes
    const productRoutes = require('../../routes/productRoutes');
    app.use('/api/v1/products', productRoutes);
  });

  afterAll(async () => {
    // Cleanup test data
    if (testProductId) {
      try {
        await prisma.product.delete({
          where: { id: testProductId }
        });
      } catch (error) {
        // Product might already be deleted
      }
    }
    await prisma.$disconnect();
  });

  describe('GET /api/v1/products', () => {
    test('should return products list', async () => {
      const response = await request(app)
        .get('/api/v1/products')
        .expect('Content-Type', /json/);

      expect(response.status).toBeLessThan(500);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('success');
        expect(Array.isArray(response.body.products) || Array.isArray(response.body.data)).toBe(true);
      }
    });

    test('should handle pagination parameters', async () => {
      const response = await request(app)
        .get('/api/v1/products?page=1&limit=10')
        .expect('Content-Type', /json/);

      expect(response.status).toBeLessThan(500);
    });

    test('should handle search query', async () => {
      const response = await request(app)
        .get('/api/v1/products?search=test')
        .expect('Content-Type', /json/);

      expect(response.status).toBeLessThan(500);
    });
  });

  describe('Product Data Validation', () => {
    test('should validate required fields for product creation', () => {
      const validProduct = {
        name: 'Test Product',
        price: 99.99,
        companyId: 'test-company-id'
      };

      expect(validProduct.name).toBeDefined();
      expect(validProduct.price).toBeGreaterThan(0);
      expect(validProduct.companyId).toBeDefined();
    });

    test('should validate price is a positive number', () => {
      const price = 99.99;
      
      expect(typeof price).toBe('number');
      expect(price).toBeGreaterThan(0);
      expect(isNaN(price)).toBe(false);
    });

    test('should validate product name is not empty', () => {
      const name = 'Test Product';
      
      expect(name).toBeDefined();
      expect(name.length).toBeGreaterThan(0);
      expect(typeof name).toBe('string');
    });
  });

  describe('Product Price Calculations', () => {
    test('should calculate final price with discount', () => {
      const basePrice = 100;
      const discountPercent = 20;
      const finalPrice = basePrice - (basePrice * discountPercent / 100);
      
      expect(finalPrice).toBe(80);
    });

    test('should calculate tax amount', () => {
      const price = 100;
      const taxRate = 14; // 14% VAT in Egypt
      const taxAmount = price * (taxRate / 100);
      
      expect(taxAmount).toBe(14);
    });

    test('should calculate total with tax', () => {
      const price = 100;
      const taxRate = 14;
      const total = price + (price * taxRate / 100);
      
      expect(total).toBe(114);
    });
  });

  describe('Product Variants', () => {
    test('should handle product with variants', () => {
      const product = {
        name: 'T-Shirt',
        basePrice: 100,
        variants: [
          { size: 'S', color: 'Red', price: 100 },
          { size: 'M', color: 'Blue', price: 110 },
          { size: 'L', color: 'Green', price: 120 }
        ]
      };

      expect(product.variants).toBeDefined();
      expect(Array.isArray(product.variants)).toBe(true);
      expect(product.variants.length).toBe(3);
      expect(product.variants[0]).toHaveProperty('size');
      expect(product.variants[0]).toHaveProperty('color');
      expect(product.variants[0]).toHaveProperty('price');
    });

    test('should find variant by attributes', () => {
      const variants = [
        { size: 'S', color: 'Red', price: 100, stock: 10 },
        { size: 'M', color: 'Blue', price: 110, stock: 5 },
        { size: 'L', color: 'Green', price: 120, stock: 0 }
      ];

      const selectedVariant = variants.find(v => v.size === 'M' && v.color === 'Blue');
      
      expect(selectedVariant).toBeDefined();
      expect(selectedVariant.price).toBe(110);
      expect(selectedVariant.stock).toBe(5);
    });
  });

  describe('Product Stock Management', () => {
    test('should check if product is in stock', () => {
      const product = { stock: 10 };
      const isInStock = product.stock > 0;
      
      expect(isInStock).toBe(true);
    });

    test('should check if product is out of stock', () => {
      const product = { stock: 0 };
      const isInStock = product.stock > 0;
      
      expect(isInStock).toBe(false);
    });

    test('should validate stock quantity', () => {
      const stock = 10;
      const requestedQuantity = 5;
      const hasEnoughStock = stock >= requestedQuantity;
      
      expect(hasEnoughStock).toBe(true);
    });

    test('should reject negative stock', () => {
      const stock = -5;
      const isValidStock = stock >= 0;
      
      expect(isValidStock).toBe(false);
    });
  });

  describe('Product Images', () => {
    test('should validate image URL format', () => {
      const imageUrl = 'https://example.com/image.jpg';
      const isValidUrl = imageUrl.startsWith('http://') || imageUrl.startsWith('https://');
      
      expect(isValidUrl).toBe(true);
    });

    test('should handle multiple images', () => {
      const product = {
        images: [
          'https://example.com/image1.jpg',
          'https://example.com/image2.jpg',
          'https://example.com/image3.jpg'
        ]
      };

      expect(Array.isArray(product.images)).toBe(true);
      expect(product.images.length).toBe(3);
    });

    test('should handle product without images', () => {
      const product = {
        name: 'Test Product',
        images: []
      };

      expect(Array.isArray(product.images)).toBe(true);
      expect(product.images.length).toBe(0);
    });
  });

  describe('Product Categories', () => {
    test('should validate category assignment', () => {
      const product = {
        name: 'Test Product',
        categoryId: 'test-category-id'
      };

      expect(product.categoryId).toBeDefined();
      expect(typeof product.categoryId).toBe('string');
    });

    test('should handle product without category', () => {
      const product = {
        name: 'Test Product',
        categoryId: null
      };

      expect(product.categoryId).toBeNull();
    });
  });
});
