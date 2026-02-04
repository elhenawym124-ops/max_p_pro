const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getSharedPrismaClient } = require('../../services/sharedDatabase');

describe('Authentication Service', () => {
  let prisma;

  beforeAll(() => {
    prisma = getSharedPrismaClient();
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.$disconnect();
  });

  describe('Password Hashing', () => {
    test('should hash password correctly', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await bcrypt.hash(password, 10);
      
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(20);
    });

    test('should verify correct password', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const isValid = await bcrypt.compare(password, hashedPassword);
      expect(isValid).toBe(true);
    });

    test('should reject incorrect password', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword456!';
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const isValid = await bcrypt.compare(wrongPassword, hashedPassword);
      expect(isValid).toBe(false);
    });
  });

  describe('JWT Token Generation', () => {
    test('should generate valid JWT token', () => {
      const payload = {
        userId: 'test-user-id',
        email: 'test@example.com',
        role: 'USER'
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', {
        expiresIn: '1h'
      });

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    test('should verify valid JWT token', () => {
      const payload = {
        userId: 'test-user-id',
        email: 'test@example.com',
        role: 'USER'
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', {
        expiresIn: '1h'
      });

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
      
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
    });

    test('should reject invalid JWT token', () => {
      const invalidToken = 'invalid.token.here';

      expect(() => {
        jwt.verify(invalidToken, process.env.JWT_SECRET || 'test-secret');
      }).toThrow();
    });

    test('should reject expired JWT token', () => {
      const payload = {
        userId: 'test-user-id',
        email: 'test@example.com'
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', {
        expiresIn: '-1h' // Already expired
      });

      expect(() => {
        jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
      }).toThrow('jwt expired');
    });
  });

  describe('Token Payload Validation', () => {
    test('should include required fields in token', () => {
      const payload = {
        userId: 'test-user-id',
        email: 'test@example.com',
        role: 'USER',
        companyId: 'test-company-id'
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', {
        expiresIn: '1h'
      });

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
      
      expect(decoded).toHaveProperty('userId');
      expect(decoded).toHaveProperty('email');
      expect(decoded).toHaveProperty('role');
      expect(decoded).toHaveProperty('companyId');
    });

    test('should handle token without optional fields', () => {
      const payload = {
        userId: 'test-user-id',
        email: 'test@example.com'
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', {
        expiresIn: '1h'
      });

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
      
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBeUndefined();
    });
  });
});
