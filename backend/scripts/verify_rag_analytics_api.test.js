const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const app = require('../server'); // Import the app
const prisma = new PrismaClient();

// Mock user with companyId
const mockUser = {
    companyId: 'company_A', // Replace with a valid companyId from your DB or seed
    role: 'COMPANY_ADMIN',
    id: 'user_123'
};

// Mock authentication middleware
jest.mock('../middleware/auth', () => ({
    requireAuth: (req, res, next) => {
        req.user = mockUser;
        next();
    }
}));

// We need to ensure we don't actually start the full server if it's already imported
// But typically requiring express app doesn't start listening unless .listen is called in the main file
// However, server.js seems to call startServer(). 
// For this script, we might run into port conflict if server is running.
// But since we saw "Exit code 1", server is likely down.

describe('RAG Analytics API Verification', () => {
    let server;

    beforeAll(async () => {
        // Wait for DB connection if needed
    });

    afterAll(async () => {
        await prisma.$disconnect();
        // If server.js started a server, we might need to close it, 
        // but since we imported 'app', if startServer() was called, it's running.
        // We can just exit the process after tests.
    });

    test('GET /api/v1/rag-analytics/stats returns 200', async () => {
        // First, let's look if we have any data. If not, we might get empty stats but 200 OK.
        const res = await request(app).get('/api/v1/rag-analytics/stats');
        console.log('Stats Response:', res.body);
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('totalSearches');
        expect(res.body.data).toHaveProperty('successRate');
    });

    test('GET /api/v1/rag-analytics/failed-searches returns 200', async () => {
        const res = await request(app).get('/api/v1/rag-analytics/failed-searches');
        console.log('Failed Searches Response:', res.body);
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('GET /api/v1/rag-analytics/top-terms returns 200', async () => {
        const res = await request(app).get('/api/v1/rag-analytics/top-terms');
        console.log('Top Terms Response:', res.body);
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
    });
});
