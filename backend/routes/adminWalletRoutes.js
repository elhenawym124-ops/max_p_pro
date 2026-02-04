const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requireSuperAdmin } = require('../middleware/superAdminMiddleware');
const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');
const Joi = require('joi');

// Validation schema
const addFundsSchema = Joi.object({
    companyId: Joi.string().required().messages({
        'string.empty': 'Company ID is required'
    }),
    amount: Joi.number().positive().required().messages({
        'number.positive': 'Amount must be positive'
    }),
    notes: Joi.string().optional().allow('').allow(null),
    bonus: Joi.number().min(0).default(0)
});

/**
 * @route POST /api/v1/admin/wallet/add-funds
 * @desc Manually add funds to a company wallet
 * @access Super Admin
 */
router.post('/add-funds', requireAuth, requireSuperAdmin, async (req, res) => {
    try {
        // Validate input
        const { error, value } = addFundsSchema.validate(req.body);

        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Invalid input data',
                errors: error.details
            });
        }

        const { companyId, amount, notes, bonus } = value;
        const totalAmount = amount + bonus;

        const result = await executeWithRetry(async () => {
            const prisma = getSharedPrismaClient();

            return await prisma.$transaction(async (tx) => {
                // 1. Find or Create Wallet
                let wallet = await tx.companyWallet.findUnique({
                    where: { companyId }
                });

                if (!wallet) {
                    wallet = await tx.companyWallet.create({
                        data: {
                            companyId,
                            balance: 0,
                            currency: 'EGP' // Default currency
                        }
                    });
                }

                // 2. Create Transaction Record
                const transaction = await tx.walletTransaction.create({
                    data: {
                        walletId: wallet.id,
                        companyId,
                        type: 'DEPOSIT', // Or 'ADJUSTMENT' or new enum value if supported
                        amount: totalAmount,
                        balanceBefore: wallet.balance,
                        balanceAfter: Number(wallet.balance) + totalAmount,
                        description: notes || `Manual Top-up by Admin (${amount} + ${bonus} Bonus)`,
                        paymentMethod: 'MANUAL_ADMIN',
                        paymentId: req.user.id, // Admin ID as payment reference check
                        metadata: JSON.stringify({
                            adminId: req.user.id,
                            baseAmount: amount,
                            bonusAmount: bonus,
                            manualNote: notes
                        })
                    }
                });

                // 3. Update Wallet Balance
                const updatedWallet = await tx.companyWallet.update({
                    where: { id: wallet.id },
                    data: {
                        balance: { increment: totalAmount },
                        totalDeposited: { increment: totalAmount }
                    }
                });

                return { wallet: updatedWallet, transaction };
            });
        });

        return res.json({
            success: true,
            message: 'Funds added successfully',
            data: result
        });

    } catch (error) {
        console.error('Error adding funds manually:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to add funds',
            error: error.message
        });
    }
});

/**
 * @route GET /api/v1/admin/wallet/companies
 * @desc Get all companies with their wallet details
 * @access Super Admin
 */
router.get('/companies', requireAuth, requireSuperAdmin, async (req, res) => {
    try {
        const prisma = getSharedPrismaClient();

        // Get all companies with their wallet
        const companies = await executeWithRetry(async () => {
            return await prisma.company.findMany({
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    wallet: true
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });
        });

        // Format response
        const data = companies.map(comp => ({
            companyId: comp.id,
            companyName: comp.name,
            companyEmail: comp.email,
            phone: comp.phone,
            walletId: comp.wallet?.id || null,
            balance: comp.wallet ? Number(comp.wallet.balance) : 0,
            currency: comp.wallet?.currency || 'EGP',
            totalDeposited: comp.wallet ? Number(comp.wallet.totalDeposited) : 0
        }));

        return res.json({
            success: true,
            data: data
        });

    } catch (error) {
        console.error('Error fetching company wallets:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch company wallets',
            error: error.message
        });
    }
});

module.exports = router;
