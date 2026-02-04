const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '../../.env' }); // Adjust path if needed

// Mock Prisma
const mockPrisma = {
    devProject: {
        findMany: jest.fn().mockResolvedValue([{ id: '1', name: 'Project 1' }]),
        findUnique: jest.fn().mockResolvedValue({ id: '1', name: 'Project 1', tasks: [], releases: [] }),
        count: jest.fn().mockResolvedValue(1)
    },
    devTask: {
        findMany: jest.fn().mockResolvedValue([{ id: '1', title: 'Task 1', tags: '["frontend","bug"]' }]),
        findUnique: jest.fn().mockResolvedValue({ id: '1', title: 'Task 1', comments: [], activities: [], checklists: [], tags: '["frontend","urgent"]' }),
        count: jest.fn().mockResolvedValue(1)
    },
    devTeamMember: {
        findMany: jest.fn().mockResolvedValue([{ id: '1', role: 'developer' }])
    },
    devRelease: {
        findMany: jest.fn().mockResolvedValue([{ id: '1', version: '1.0.0' }]),
        findUnique: jest.fn().mockResolvedValue({ id: '1', version: '1.0.0', tasks: [] })
    },
    user: {
        findUnique: jest.fn().mockResolvedValue({
            id: 'mock-admin-id',
            email: 'admin@test.com',
            role: 'SUPER_ADMIN',
            isActive: true
        })
    }
};

// Mock sharedDatabase properly
jest.mock('../../services/sharedDatabase', () => ({
    getSharedPrismaClient: () => mockPrisma,
    safeQuery: (fn) => fn()
}));

// We must import routes AFTER mocking
const superAdminRoutes = require('../../routes/superAdminRoutes');

const app = express();
app.use(express.json());
app.use('/api/v1/super-admin', superAdminRoutes);

// Generate valid token
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
// Ensure middleware uses the same secret. Since middleware uses process.env.JWT_SECRET, we must ensure it is set.
process.env.JWT_SECRET = JWT_SECRET;

const token = jwt.sign(
    { userId: 'mock-admin-id', role: 'SUPER_ADMIN' },
    JWT_SECRET,
    { expiresIn: '1h' }
);

describe('Super Admin Dev Routes', () => {
    test('GET /dev/projects should return projects', async () => {
        const res = await request(app)
            .get('/api/v1/super-admin/dev/projects')
            .set('Authorization', `Bearer ${token}`);

        if (res.statusCode !== 200) {
            console.log('Error Response:', res.status, res.body);
        }
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveLength(1);
    });

    test('GET /dev/tasks should return tasks', async () => {
        const res = await request(app)
            .get('/api/v1/super-admin/dev/tasks')
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveLength(1);
    });

    test('GET /dev/team should return team members', async () => {
        const res = await request(app)
            .get('/api/v1/super-admin/dev/team')
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveLength(1);
    });

    test('GET /dev/releases should return releases', async () => {
        const res = await request(app)
            .get('/api/v1/super-admin/dev/releases')
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveLength(1);
    });

    test('GET /dev/tasks/:id should return single task details', async () => {
        // First get the task ID from list
        const listRes = await request(app)
            .get('/api/v1/super-admin/dev/tasks')
            .set('Authorization', `Bearer ${token}`);

        const taskId = listRes.body.data[0].id;

        // Then fetch details
        const res = await request(app)
            .get(`/api/v1/super-admin/dev/tasks/${taskId}`)
            .set('Authorization', `Bearer ${token}`);

        if (res.statusCode !== 200) {
            console.log('Error Response for Detail:', res.status, res.body);
        }
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.id).toBe(taskId);
        expect(Array.isArray(res.body.data.tags)).toBe(true);
        expect(res.body.data.tags).toContain('frontend');
    });
});
