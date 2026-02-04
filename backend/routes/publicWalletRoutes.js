const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const WalletService = require('../services/walletService');

// Public Wallet Routes (requires CUSTOMER token)

router.get('/balance', verifyToken.authenticateToken, async (req, res) => {
  try {
    if (req.user?.role !== 'CUSTOMER') {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح'
      });
    }

    const customerId = req.user.customerId || req.user.userId || req.user.id;
    const companyId = req.user.companyId;

    if (!customerId || !companyId) {
      return res.status(401).json({
        success: false,
        message: 'رمز المصادقة غير صحيح'
      });
    }

    await WalletService.createWallet(customerId, companyId);
    const balance = await WalletService.getWalletBalance(customerId);

    return res.json({
      success: true,
      data: {
        balance,
        currency: 'EGP'
      }
    });
  } catch (error) {
    console.error('❌ [PUBLIC-WALLET] Error fetching balance:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'حدث خطأ أثناء جلب الرصيد'
    });
  }
});

router.get('/transactions', verifyToken.authenticateToken, async (req, res) => {
  try {
    if (req.user?.role !== 'CUSTOMER') {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح'
      });
    }

    const customerId = req.user.customerId || req.user.userId || req.user.id;
    const companyId = req.user.companyId;

    if (!customerId || !companyId) {
      return res.status(401).json({
        success: false,
        message: 'رمز المصادقة غير صحيح'
      });
    }

    await WalletService.createWallet(customerId, companyId);

    const page = parseInt(req.query.page || '1');
    const limit = parseInt(req.query.limit || '20');
    const type = req.query.type;

    const data = await WalletService.getWalletTransactions(customerId, {
      page,
      limit,
      type
    });

    return res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('❌ [PUBLIC-WALLET] Error fetching transactions:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'حدث خطأ أثناء جلب المعاملات'
    });
  }
});

module.exports = router;
