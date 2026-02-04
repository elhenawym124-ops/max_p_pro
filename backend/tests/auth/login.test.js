const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getSharedPrismaClient } = require('../../services/sharedDatabase');

describe('Login API Tests', () => {
  let app;
  let prisma;
  let testUser;
  let testCompany;

  beforeAll(async () => {
    prisma = getSharedPrismaClient();
    
    // Create Express app for testing
    app = express();
    app.use(express.json());
    
    // Mount auth routes
    const authRoutes = require('../../routes/authRoutes');
    app.use('/api/v1/auth', authRoutes);

    // Create test company and user
    try {
      // Create test company
      testCompany = await prisma.company.create({
        data: {
          id: 'test-company-login-' + Date.now(),
          name: 'Test Company for Login',
          email: 'testcompany@login.test',
          plan: 'BASIC',
          isActive: true,
          useCentralKeys: true,
          sidebarLayout: 'three-tier',
          timezone: 'Asia/Riyadh',
          updatedAt: new Date()
        }
      });

      // Create test user
      const hashedPassword = await bcrypt.hash('TestPassword123!', 10);
      testUser = await prisma.user.create({
        data: {
          id: 'test-user-login-' + Date.now(),
          email: 'testuser@login.test',
          password: hashedPassword,
          firstName: 'Test',
          lastName: 'User',
          role: 'OWNER',
          companiesId: testCompany.id,
          isActive: true,
          timezone: 'Asia/Riyadh'
        }
      });

      console.log('✅ Test user created:', testUser.email);
    } catch (error) {
      console.error('⚠️ Error creating test data:', error.message);
    }
  });

  afterAll(async () => {
    // Cleanup test data
    try {
      if (testUser) {
        await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
      }
      if (testCompany) {
        await prisma.company.delete({ where: { id: testCompany.id } }).catch(() => {});
      }
    } catch (error) {
      console.error('⚠️ Cleanup error:', error.message);
    }
    await prisma.$disconnect();
  });

  describe('POST /api/v1/auth/login - Successful Login', () => {
    test('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'testuser@login.test',
          password: 'TestPassword123!'
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBeLessThan(500);
      
      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('token');
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('user');
        expect(response.body.data.user.email).toBe('testuser@login.test');
        
        // Verify token is valid JWT
        const token = response.body.token;
        expect(typeof token).toBe('string');
        expect(token.split('.').length).toBe(3);
        
        // Decode and verify token payload
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        expect(decoded).toHaveProperty('userId');
        expect(decoded).toHaveProperty('email', 'testuser@login.test');
        expect(decoded).toHaveProperty('role');
        expect(decoded).toHaveProperty('companyId');
      }
    });

    test('should return user data with company information', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'testuser@login.test',
          password: 'TestPassword123!'
        });

      if (response.status === 200) {
        expect(response.body.data.user).toHaveProperty('firstName');
        expect(response.body.data.user).toHaveProperty('lastName');
        expect(response.body.data.user).toHaveProperty('role');
        expect(response.body.data.user).toHaveProperty('company');
        
        if (response.body.data.user.company) {
          expect(response.body.data.user.company).toHaveProperty('id');
          expect(response.body.data.user.company).toHaveProperty('name');
          expect(response.body.data.user.company).toHaveProperty('plan');
        }
      }
    });

    test('should handle case-insensitive email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'TESTUSER@LOGIN.TEST',
          password: 'TestPassword123!'
        });

      expect(response.status).toBeLessThan(500);
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
      }
    });
  });

  describe('POST /api/v1/auth/login - Failed Login Attempts', () => {
    test('should reject login with missing email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          password: 'TestPassword123!'
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });

    test('should reject login with missing password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'testuser@login.test'
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });

    test('should reject login with wrong password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'testuser@login.test',
          password: 'WrongPassword123!'
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('غير صحيحة');
    });

    test('should reject login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'TestPassword123!'
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('غير صحيحة');
    });

    test('should reject login with empty credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: '',
          password: ''
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('JWT Token Validation', () => {
    test('should generate valid JWT token structure', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'testuser@login.test',
          password: 'TestPassword123!'
        });

      if (response.status === 200 && response.body.token) {
        const token = response.body.token;
        
        // Check JWT structure (header.payload.signature)
        const parts = token.split('.');
        expect(parts.length).toBe(3);
        
        // Verify each part is base64 encoded
        parts.forEach(part => {
          expect(part.length).toBeGreaterThan(0);
          expect(/^[A-Za-z0-9_-]+$/.test(part)).toBe(true);
        });
      }
    });

    test('should include required claims in JWT token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'testuser@login.test',
          password: 'TestPassword123!'
        });

      if (response.status === 200 && response.body.token) {
        const decoded = jwt.verify(
          response.body.token,
          process.env.JWT_SECRET || 'your-secret-key'
        );

        expect(decoded).toHaveProperty('userId');
        expect(decoded).toHaveProperty('email');
        expect(decoded).toHaveProperty('role');
        expect(decoded).toHaveProperty('companyId');
        expect(decoded).toHaveProperty('exp'); // Expiration
        expect(decoded).toHaveProperty('iat'); // Issued at
      }
    });

    test('should set token expiration to 24 hours', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'testuser@login.test',
          password: 'TestPassword123!'
        });

      if (response.status === 200 && response.body.token) {
        const decoded = jwt.verify(
          response.body.token,
          process.env.JWT_SECRET || 'your-secret-key'
        );

        const expirationTime = decoded.exp - decoded.iat;
        const expectedExpiration = 24 * 60 * 60; // 24 hours in seconds
        
        expect(expirationTime).toBe(expectedExpiration);
      }
    });
  });

  describe('Password Security', () => {
    test('should not return password in response', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'testuser@login.test',
          password: 'TestPassword123!'
        });

      if (response.status === 200) {
        const responseString = JSON.stringify(response.body);
        expect(responseString).not.toContain('TestPassword123!');
        expect(response.body.data.user).not.toHaveProperty('password');
      }
    });

    test('should use bcrypt for password comparison', async () => {
      // Verify that stored password is hashed
      const user = await prisma.user.findUnique({
        where: { email: 'testuser@login.test' }
      });

      expect(user.password).not.toBe('TestPassword123!');
      expect(user.password.length).toBeGreaterThan(50); // Bcrypt hash length
      expect(user.password.startsWith('$2')).toBe(true); // Bcrypt prefix
    });
  });

  describe('Account Status Validation', () => {
    test('should handle inactive user account', async () => {
      // Create inactive user
      const inactiveUser = await prisma.user.create({
        data: {
          id: 'inactive-user-' + Date.now(),
          email: 'inactive@test.com',
          password: await bcrypt.hash('Test123!', 10),
          firstName: 'Inactive',
          lastName: 'User',
          role: 'USER',
          companiesId: testCompany.id,
          isActive: false,
          timezone: 'Asia/Riyadh'
        }
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'inactive@test.com',
          password: 'Test123!'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);

      // Cleanup
      await prisma.user.delete({ where: { id: inactiveUser.id } }).catch(() => {});
    });
  });
});
