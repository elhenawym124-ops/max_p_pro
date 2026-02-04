const express = require('express');
const router = express.Router();
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { requireAuth } = require('../middleware/auth');

// Middleware to ensure user is agent/admin
router.use(requireAuth);

/**
 * GET /affiliates/settings
 * Fetch affiliate program settings for the current company
 */
router.get('/', async (req, res) => {
    try {
        const prisma = getSharedPrismaClient();
        const companyId = req.user.companyId;

        if (!companyId) {
            return res.status(400).json({ success: false, message: 'User does not belong to a company' });
        }

        let settings = await prisma.affiliateSetting.findUnique({
            where: { companyId }
        });

        // If no settings exist, return defaults (or create them)
        if (!settings) {
            settings = {
                commissionType: 'PERCENTAGE',
                commissionRate: 5.0,
                cookieDuration: 30,
                termsAndConditions: '',
                isActive: true
            };
        }

        res.json({ success: true, data: settings });
    } catch (error) {
        console.error('Error fetching affiliate settings:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch settings' });
    }
});

/**
 * PUT /affiliates/settings
 * Update affiliate program settings
 */
router.put('/', async (req, res) => {
    try {
        const prisma = getSharedPrismaClient();
        const companyId = req.user.companyId;
        const { commissionType, commissionRate, cookieDuration, termsAndConditions, isActive } = req.body;

        if (!companyId) {
            return res.status(400).json({ success: false, message: 'User does not belong to a company' });
        }

        // Upsert settings
        const settings = await prisma.affiliateSetting.upsert({
            where: { companyId },
            update: {
                commissionType,
                commissionRate: parseFloat(commissionRate),
                cookieDuration: parseInt(cookieDuration),
                termsAndConditions,
                isActive
            },
            create: {
                companyId,
                commissionType,
                commissionRate: parseFloat(commissionRate),
                cookieDuration: parseInt(cookieDuration),
                termsAndConditions,
                isActive
            }
        });

        res.json({ success: true, message: 'Settings updated successfully', data: settings });
    } catch (error) {
        console.error('Error updating affiliate settings:', error);
        res.status(500).json({ success: false, message: 'Failed to update settings' });
    }
});

module.exports = router;
