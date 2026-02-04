const { getSharedPrismaClient } = require('../../services/sharedDatabase');

// Get all asset requests (for HR/Admin)
exports.getAllRequests = async (req, res) => {
    try {
        const { companyId, role } = req.user;
        const { status, priority } = req.query;

        const where = { companyId };
        if (status) where.status = status;
        if (priority) where.priority = priority;

        const requests = await getSharedPrismaClient().assetRequest.findMany({
            where,
            include: {
                asset: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        status: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, data: requests });
    } catch (error) {
        console.error('Error fetching asset requests:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch requests' });
    }
};

// Get my requests (for employee)
exports.getMyRequests = async (req, res) => {
    try {
        const { id: userId } = req.user;

        const requests = await getSharedPrismaClient().assetRequest.findMany({
            where: { requestedBy: userId },
            include: {
                asset: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        status: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, data: requests });
    } catch (error) {
        console.error('Error fetching my requests:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch requests' });
    }
};

// Create new asset request
exports.createRequest = async (req, res) => {
    try {
        const { id: userId, companyId } = req.user;
        const { assetType, category, reason, priority } = req.body;

        if (!assetType || !reason) {
            return res.status(400).json({ 
                success: false, 
                message: 'Asset type and reason are required' 
            });
        }

        const request = await getSharedPrismaClient().assetRequest.create({
            data: {
                companyId,
                requestedBy: userId,
                assetType,
                category,
                reason,
                priority: priority || 'NORMAL',
                status: 'PENDING'
            }
        });

        // TODO: Send notification to manager/HR

        res.json({ success: true, data: request });
    } catch (error) {
        console.error('Error creating asset request:', error);
        res.status(500).json({ success: false, message: 'Failed to create request' });
    }
};

// Approve request
exports.approveRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { id: userId, companyId } = req.user;
        const { notes } = req.body;

        const request = await getSharedPrismaClient().assetRequest.findFirst({
            where: { id, companyId }
        });

        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        if (request.status !== 'PENDING') {
            return res.status(400).json({ 
                success: false, 
                message: 'Request already processed' 
            });
        }

        const updated = await getSharedPrismaClient().assetRequest.update({
            where: { id },
            data: {
                status: 'APPROVED',
                approvedBy: userId,
                approvedAt: new Date(),
                notes
            }
        });

        // TODO: Send notification to requester

        res.json({ success: true, data: updated });
    } catch (error) {
        console.error('Error approving request:', error);
        res.status(500).json({ success: false, message: 'Failed to approve request' });
    }
};

// Reject request
exports.rejectRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { id: userId, companyId } = req.user;
        const { rejectionReason } = req.body;

        if (!rejectionReason) {
            return res.status(400).json({ 
                success: false, 
                message: 'Rejection reason is required' 
            });
        }

        const request = await getSharedPrismaClient().assetRequest.findFirst({
            where: { id, companyId }
        });

        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        if (request.status !== 'PENDING' && request.status !== 'APPROVED') {
            return res.status(400).json({ 
                success: false, 
                message: 'Request already processed' 
            });
        }

        const updated = await getSharedPrismaClient().assetRequest.update({
            where: { id },
            data: {
                status: 'REJECTED',
                rejectedBy: userId,
                rejectedAt: new Date(),
                rejectionReason
            }
        });

        // TODO: Send notification to requester

        res.json({ success: true, data: updated });
    } catch (error) {
        console.error('Error rejecting request:', error);
        res.status(500).json({ success: false, message: 'Failed to reject request' });
    }
};

// Fulfill request (assign asset)
exports.fulfillRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { id: userId, companyId } = req.user;
        const { assetId } = req.body;

        if (!assetId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Asset ID is required' 
            });
        }

        const request = await getSharedPrismaClient().assetRequest.findFirst({
            where: { id, companyId }
        });

        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        if (request.status !== 'APPROVED') {
            return res.status(400).json({ 
                success: false, 
                message: 'Request must be approved first' 
            });
        }

        // Check if asset is available
        const asset = await getSharedPrismaClient().asset.findFirst({
            where: { id: assetId, companyId }
        });

        if (!asset) {
            return res.status(404).json({ success: false, message: 'Asset not found' });
        }

        if (asset.status !== 'AVAILABLE') {
            return res.status(400).json({ 
                success: false, 
                message: 'Asset is not available' 
            });
        }

        // Update request
        const updated = await getSharedPrismaClient().assetRequest.update({
            where: { id },
            data: {
                status: 'FULFILLED',
                assetId,
                fulfilledBy: userId,
                fulfilledAt: new Date()
            }
        });

        // Assign asset to requester
        await getSharedPrismaClient().asset.update({
            where: { id: assetId },
            data: {
                status: 'IN_USE',
                assignedToId: request.requestedBy
            }
        });

        // Create custody history
        await getSharedPrismaClient().assetCustodyHistory.create({
            data: {
                assetId,
                userId: request.requestedBy,
                assignedBy: userId,
                action: 'ASSIGNED',
                assignedAt: new Date()
            }
        });

        // Create assignment record
        await getSharedPrismaClient().assetAssignment.create({
            data: {
                assetId,
                userId: request.requestedBy,
                assignedBy: userId,
                assignedAt: new Date()
            }
        });

        // TODO: Send notification to requester

        res.json({ success: true, data: updated });
    } catch (error) {
        console.error('Error fulfilling request:', error);
        res.status(500).json({ success: false, message: 'Failed to fulfill request' });
    }
};

// Get request statistics
exports.getRequestStats = async (req, res) => {
    try {
        const { companyId } = req.user;

        const [total, pending, approved, rejected, fulfilled] = await Promise.all([
            getSharedPrismaClient().assetRequest.count({ where: { companyId } }),
            getSharedPrismaClient().assetRequest.count({ where: { companyId, status: 'PENDING' } }),
            getSharedPrismaClient().assetRequest.count({ where: { companyId, status: 'APPROVED' } }),
            getSharedPrismaClient().assetRequest.count({ where: { companyId, status: 'REJECTED' } }),
            getSharedPrismaClient().assetRequest.count({ where: { companyId, status: 'FULFILLED' } })
        ]);

        res.json({
            success: true,
            data: {
                total,
                pending,
                approved,
                rejected,
                fulfilled
            }
        });
    } catch (error) {
        console.error('Error fetching request stats:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch stats' });
    }
};
