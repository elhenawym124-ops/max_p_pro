/**
 * 💰 Advance Request Controller
 * التحكم في طلبات السلف
 */

const advanceService = require('../services/hr/advanceService');

/**
 * إنشاء طلب سلفة جديد
 */
exports.createAdvanceRequest = async (req, res) => {
    try {
        const { companyId } = req.user;
        const request = await advanceService.createRequest(companyId, req.body);

        res.status(201).json({
            success: true,
            message: 'تم إنشاء طلب السلفة بنجاح',
            data: request
        });
    } catch (error) {
        console.error('Error creating advance request:', error);

        // Check for known validation error messages
        const isValidationError = error.message && (
            error.message.includes('يجب') ||
            error.message.includes('الحد الأقصى') ||
            error.message.includes('لديك سلفة') ||
            error.message.includes('يرجى ضبط') ||
            error.message.includes('الموظف غير موجود')
        );

        res.status(isValidationError ? 400 : 500).json({
            success: false,
            error: error.message || 'حدث خطأ أثناء إنشاء الطلب'
        });
    }
};

/**
 * الموافقة على طلب سلفة
 */
exports.approveAdvanceRequest = async (req, res) => {
    try {
        const { companyId, id: userId } = req.user;
        const { id } = req.params;

        const request = await advanceService.approveRequest(companyId, id, userId);

        res.json({
            success: true,
            message: 'تم الموافقة على الطلب بنجاح',
            data: request
        });
    } catch (error) {
        console.error('Error approving advance request:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'حدث خطأ أثناء الموافقة على الطلب'
        });
    }
};

/**
 * رفض طلب سلفة
 */
exports.rejectAdvanceRequest = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { id } = req.params;
        const { rejectionReason } = req.body;

        const request = await advanceService.rejectRequest(companyId, id, rejectionReason);

        res.json({
            success: true,
            message: 'تم رفض الطلب',
            data: request
        });
    } catch (error) {
        console.error('Error rejecting advance request:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'حدث خطأ أثناء رفض الطلب'
        });
    }
};

/**
 * جلب طلبات السلف للموظف الحالي
 */
exports.getMyAdvances = async (req, res) => {
    try {
        const { companyId, id: userId } = req.user;

        // Pass userId directly (service uses it as userId internally)
        const requests = await advanceService.getMyAdvances(companyId, userId);

        res.json({
            success: true,
            data: requests
        });
    } catch (error) {
        console.error('Error fetching my advances:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'حدث خطأ أثناء جلب البيانات'
        });
    }
};

/**
 * جلب جميع طلبات السلف (للإدارة)
 */
exports.getAllAdvances = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { status, page, limit } = req.query;

        const result = await advanceService.getAllAdvances(companyId, {
            status,
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20
        });

        res.json({
            success: true,
            data: result.requests,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('Error fetching all advances:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'حدث خطأ أثناء جلب البيانات'
        });
    }
};

module.exports = exports;
