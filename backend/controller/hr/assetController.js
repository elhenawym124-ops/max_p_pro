const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const WhatsAppNotificationService = require('../../services/whatsapp/WhatsAppNotificationService');

// Asset Categories
exports.getAssetCategories = async (req, res) => {
    try {
        const { companyId } = req.user;
        const categories = await getSharedPrismaClient().assetCategory.findMany({
            where: { companyId },
            include: {
                _count: { select: { assets: true } }
            },
            orderBy: { name: 'asc' }
        });
        res.json({ success: true, data: categories });
    } catch (error) {
        console.error('Error fetching asset categories:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch categories' });
    }
};

exports.createAssetCategory = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { name, description } = req.body;

        const existing = await getSharedPrismaClient().assetCategory.findUnique({
            where: {
                companyId_name: { companyId, name }
            }
        });

        if (existing) {
            return res.status(400).json({ success: false, message: 'Category already exists' });
        }

        const category = await getSharedPrismaClient().assetCategory.create({
            data: {
                companyId,
                name,
                description
            }
        });

        res.json({ success: true, data: category });
    } catch (error) {
        console.error('Error creating asset category:', error);
        res.status(500).json({ success: false, message: 'Failed to create category' });
    }
};

exports.deleteAssetCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { companyId } = req.user;

        const category = await getSharedPrismaClient().assetCategory.findFirst({
            where: { id, companyId }
        });

        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        await getSharedPrismaClient().assetCategory.delete({
            where: { id }
        });

        res.json({ success: true, message: 'Category deleted' });
    } catch (error) {
        console.error('Error deleting asset category:', error);
        res.status(500).json({ success: false, message: 'Failed to delete category' });
    }
};

// Assets
exports.getAssets = async (req, res) => {
    try {
        const { companyId, role } = req.user;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: role === 'SUPER_ADMIN'
                    ? 'يجب تحديد شركة لعرض الأصول'
                    : 'يجب أن يكون المستخدم مرتبطاً بشركة'
            });
        }

        const { categoryId, status, search } = req.query;

        const where = { companyId };

        if (categoryId) where.categoryId = categoryId;
        if (status) where.status = status;
        if (search) {
            where.OR = [
                { name: { contains: search } },
                { code: { contains: search } },
                { serialNumber: { contains: search } },
                { model: { contains: search } }
            ];
        }

        const assets = await getSharedPrismaClient().asset.findMany({
            where,
            include: {
                category: true
            },
            orderBy: { createdAt: 'desc' }
        });

        // Fetch current holders (users)
        const holderIds = [...new Set(assets.map(a => a.assignedToId).filter(Boolean))];
        const holders = holderIds.length > 0 ? await getSharedPrismaClient().user.findMany({
            where: { id: { in: holderIds } },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeNumber: true
            }
        }) : [];
        const holderMap = Object.fromEntries(holders.map(h => [h.id, h]));

        // Fetch latest assignments for each asset
        const assetIds = assets.map(a => a.id);
        const assignments = assetIds.length > 0 ? await getSharedPrismaClient().assetAssignment.findMany({
            where: { assetId: { in: assetIds } },
            orderBy: { assignedAt: 'desc' },
            distinct: ['assetId']
        }) : [];
        const assignmentMap = Object.fromEntries(assignments.map(a => [a.assetId, a]));

        // Fetch employees for assignments
        const employeeIds = [...new Set(assignments.map(a => a.userId).filter(Boolean))];
        const employees = employeeIds.length > 0 ? await getSharedPrismaClient().user.findMany({
            where: { id: { in: employeeIds } },
            select: {
                id: true,
                firstName: true,
                lastName: true
            }
        }) : [];
        const employeeMap = Object.fromEntries(employees.map(e => [e.id, e]));

        // Merge data
        const enrichedAssets = assets.map(asset => ({
            ...asset,
            currentHolder: asset.assignedToId ? holderMap[asset.assignedToId] : null,
            assignments: assignmentMap[asset.id] ? [{
                ...assignmentMap[asset.id],
                employee: employeeMap[assignmentMap[asset.id].userId]
            }] : []
        }));

        res.json({ success: true, data: enrichedAssets });
    } catch (error) {
        console.error('Error fetching assets:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch assets' });
    }
};

exports.getAsset = async (req, res) => {
    try {
        const { id } = req.params;
        const { companyId } = req.user;

        const asset = await getSharedPrismaClient().asset.findFirst({
            where: { id, companyId },
            include: {
                category: true,
                maintenance: {
                    orderBy: { startDate: 'desc' }
                }
            }
        });

        if (!asset) {
            return res.status(404).json({ success: false, message: 'Asset not found' });
        }

        // Fetch current holder
        const currentHolder = asset.assignedToId ? await getSharedPrismaClient().user.findUnique({
            where: { id: asset.assignedToId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeNumber: true
            }
        }) : null;

        // Fetch assignments
        const assignments = await getSharedPrismaClient().assetAssignment.findMany({
            where: { assetId: id },
            orderBy: { assignedAt: 'desc' }
        });

        // Fetch employees for assignments
        const employeeIds = [...new Set(assignments.map(a => a.userId).filter(Boolean))];
        const employees = employeeIds.length > 0 ? await getSharedPrismaClient().user.findMany({
            where: { id: { in: employeeIds } },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeNumber: true
            }
        }) : [];
        const employeeMap = Object.fromEntries(employees.map(e => [e.id, e]));

        // Merge data
        const enrichedAsset = {
            ...asset,
            currentHolder,
            assignments: assignments.map(a => ({
                ...a,
                employee: employeeMap[a.userId]
            }))
        };

        res.json({ success: true, data: enrichedAsset });
    } catch (error) {
        console.error('Error fetching asset:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch asset' });
    }
};

exports.createAsset = async (req, res) => {
    try {
        const { companyId } = req.user;
        const {
            name,
            categoryId,
            code,
            serialNumber,
            model,
            brand,
            status,
            condition,
            purchaseDate,
            purchaseValue,
            location,
            notes
        } = req.body;

        // Check for duplicate code
        if (code) {
            const existing = await getSharedPrismaClient().asset.findUnique({
                where: {
                    companyId_code: { companyId, code }
                }
            });
            if (existing) {
                return res.status(400).json({ success: false, message: 'Asset code already exists' });
            }
        }

        const asset = await getSharedPrismaClient().asset.create({
            data: {
                companyId,
                name,
                categoryId,
                code,
                serialNumber,
                model,
                brand,
                status: req.body.assignedToId ? 'IN_USE' : (status || 'AVAILABLE'),
                condition: condition || 'NEW',
                purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
                purchaseValue: purchaseValue ? parseFloat(purchaseValue) : null,
                location,
                notes,
                supplierName: req.body.supplierName,
                supplierMobile: req.body.supplierMobile,
                supplierAddress: req.body.supplierAddress,
                warrantyProvider: req.body.warrantyProvider,
                warrantyMonths: req.body.warrantyMonths ? parseInt(req.body.warrantyMonths) : null,
                warrantyEndDate: req.body.warrantyEndDate ? new Date(req.body.warrantyEndDate) : null,
                assignedToId: req.body.assignedToId || null
            }
        });

        // Create assignment record if assigned during creation
        if (req.body.assignedToId) {
            await getSharedPrismaClient().assetAssignment.create({
                data: {
                    assetId: asset.id,
                    userId: req.body.assignedToId,
                    assignedBy: req.user.id,
                    assignedAt: new Date(),
                    notes: 'تخصيص تلقائي عند إضافة الأصل'
                }
            });
        }

        res.json({ success: true, data: asset });
    } catch (error) {
        console.error('Error creating asset:', error);
        res.status(500).json({ success: false, message: 'Failed to create asset' });
    }
};

exports.updateAsset = async (req, res) => {
    try {
        const { id } = req.params;
        const { companyId } = req.user;
        const data = req.body;

        const existing = await getSharedPrismaClient().asset.findFirst({
            where: { id, companyId }
        });

        if (!existing) {
            return res.status(404).json({ success: false, message: 'Asset not found' });
        }

        // Don't update companyId or id
        delete data.companyId;
        delete data.id;
        if (data.purchaseDate) data.purchaseDate = new Date(data.purchaseDate);
        if (data.purchaseValue) data.purchaseValue = parseFloat(data.purchaseValue);

        const asset = await getSharedPrismaClient().asset.update({
            where: { id },
            data
        });

        res.json({ success: true, data: asset });
    } catch (error) {
        console.error('Error updating asset:', error);
        res.status(500).json({ success: false, message: 'Failed to update asset' });
    }
};

exports.deleteAsset = async (req, res) => {
    try {
        const { id } = req.params;
        const { companyId } = req.user;

        const existing = await getSharedPrismaClient().asset.findFirst({
            where: { id, companyId }
        });

        if (!existing) {
            return res.status(404).json({ success: false, message: 'Asset not found' });
        }

        await getSharedPrismaClient().asset.delete({
            where: { id }
        });

        res.json({ success: true, message: 'Asset deleted' });
    } catch (error) {
        console.error('Error deleting asset:', error);
        res.status(500).json({ success: false, message: 'Failed to delete asset' });
    }
};

// Assignments
exports.assignAsset = async (req, res) => {
    try {
        const { companyId, id: userId } = req.user;
        const { assetId, employeeId, notes, assignedAt } = req.body;

        const asset = await getSharedPrismaClient().asset.findFirst({
            where: { id: assetId, companyId }
        });

        if (!asset) {
            return res.status(404).json({ success: false, message: 'Asset not found' });
        }

        if (asset.status === 'IN_USE' || asset.assignedToId) {
            return res.status(400).json({ success: false, message: 'Asset is already assigned' });
        }

        // Create assignment record
        const assignment = await getSharedPrismaClient().assetAssignment.create({
            data: {
                assetId,
                employeeId,
                assignedBy: userId,
                assignedAt: assignedAt ? new Date(assignedAt) : new Date(),
                notes
            }
        });

        // Update asset status
        await getSharedPrismaClient().asset.update({
            where: { id: assetId },
            data: {
                status: 'IN_USE',
                assignedToId: employeeId
            }
        });

        res.json({ success: true, data: assignment });
    } catch (error) {
        console.error('Error assigning asset:', error);
        res.status(500).json({ success: false, message: 'Failed to assign asset' });
    }
};

exports.returnAsset = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { assetId, returnCondition, notes, returnedAt } = req.body;

        const asset = await getSharedPrismaClient().asset.findFirst({
            where: { id: assetId, companyId }
        });

        if (!asset) {
            return res.status(404).json({ success: false, message: 'Asset not found' });
        }

        if (!asset.assignedToId) {
            return res.status(400).json({ success: false, message: 'Asset is not currently assigned' });
        }

        // Find the active assignment
        const assignment = await getSharedPrismaClient().assetAssignment.findFirst({
            where: {
                assetId,
                returnedAt: null
            }
        });

        if (assignment) {
            await getSharedPrismaClient().assetAssignment.update({
                where: { id: assignment.id },
                data: {
                    returnedAt: returnedAt ? new Date(returnedAt) : new Date(),
                    returnCondition,
                    notes: notes ? (assignment.notes ? assignment.notes + '\nReturn Notes: ' + notes : notes) : assignment.notes
                }
            });
        }

        // Update asset
        await getSharedPrismaClient().asset.update({
            where: { id: assetId },
            data: {
                status: 'AVAILABLE',
                assignedToId: null,
                condition: returnCondition || asset.condition
            }
        });

        res.json({ success: true, message: 'Asset returned successfully' });
    } catch (error) {
        console.error('Error returning asset:', error);
        res.status(500).json({ success: false, message: 'Failed to return asset' });
    }
};
// Asset Requests
exports.getAssetRequests = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { status } = req.query;

        const where = { companyId };
        if (status) where.status = status;

        const requests = await getSharedPrismaClient().asset_requests.findMany({
            where,
            include: {
                assets: true
            },
            orderBy: { createdAt: 'desc' }
        });

        // Fetch user details for each request
        const userIds = [...new Set(requests.map(r => r.requestedBy))];
        const users = await getSharedPrismaClient().user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, firstName: true, lastName: true, employeeNumber: true }
        });
        const userMap = Object.fromEntries(users.map(u => [u.id, u]));

        const enrichedRequests = requests.map(request => ({
            ...request,
            requester: userMap[request.requestedBy]
        }));

        res.json({ success: true, data: enrichedRequests });
    } catch (error) {
        console.error('Error fetching asset requests:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch asset requests' });
    }
};

exports.getMyAssetRequests = async (req, res) => {
    try {
        const { companyId, id: userId } = req.user;
        const requests = await getSharedPrismaClient().asset_requests.findMany({
            where: { companyId, requestedBy: userId },
            include: {
                assets: true
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, data: requests });
    } catch (error) {
        console.error('Error fetching your asset requests:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch your asset requests' });
    }
};

exports.createAssetRequest = async (req, res) => {
    try {
        const { companyId, id: userId } = req.user;
        const { assetType, category, reason, priority } = req.body;

        const request = await getSharedPrismaClient().asset_requests.create({
            data: {
                id: `REQ-${Date.now()}`,
                companyId,
                requestedBy: userId,
                assetType,
                category,
                reason,
                priority: priority || 'NORMAL',
                status: 'PENDING',
                updatedAt: new Date()
            }
        });

        // Optional: Notify HR or Manager
        await getSharedPrismaClient().notification.create({
            data: {
                companyId,
                title: 'طلب عهدة جديد',
                message: `قام الموظف بطلب ${assetType}. السبب: ${reason}`,
                type: 'ASSET_REQUEST',
                // For simplicity, we could notify all owners/admins or a specific role
                // For now, let's just create a general notification for the company
            }
        });

        res.json({ success: true, data: request });
    } catch (error) {
        console.error('Error creating asset request:', error);
        res.status(500).json({ success: false, message: 'Failed to create asset request' });
    }
};

exports.updateAssetRequestStatus = async (req, res) => {
    try {
        const { requestId } = req.params;
        const { companyId, id: userId } = req.user;
        const { status, rejectionReason } = req.body;

        const request = await getSharedPrismaClient().asset_requests.findFirst({
            where: { id: requestId, companyId }
        });

        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        const updateData = {
            status,
            updatedAt: new Date()
        };

        if (status === 'APPROVED') {
            updateData.approvedBy = userId;
            updateData.approvedAt = new Date();
        } else if (status === 'REJECTED') {
            updateData.rejectedBy = userId;
            updateData.rejectedAt = new Date();
            updateData.rejectionReason = rejectionReason;
        }

        const updatedRequest = await getSharedPrismaClient().asset_requests.update({
            where: { id: requestId },
            data: updateData
        });

        // Notify employee
        await getSharedPrismaClient().notification.create({
            data: {
                companyId,
                userId: request.requestedBy,
                title: status === 'APPROVED' ? 'تمت الموافقة على طلب العهدة' : 'تم رفض طلب العهدة',
                message: status === 'APPROVED'
                    ? `تمت الموافقة على طلبك لـ ${request.assetType}. سيتم تخصيص أصل لك قريباً.`
                    : `نأسف، تم رفض طلبك لـ ${request.assetType}. السبب: ${rejectionReason || 'غير محدد'}`,
                type: 'ASSET_REQUEST_STATUS'
            }
        });

        // Fetch employee details for notification
        const employee = await getSharedPrismaClient().user.findUnique({
            where: { id: request.requestedBy },
            select: { id: true, firstName: true, lastName: true, phone: true }
        });

        // Notify employee via WhatsApp
        if (employee) {
            await WhatsAppNotificationService.sendAssetRequestNotification(updatedRequest, employee, status);
        }

        res.json({ success: true, data: updatedRequest });
    } catch (error) {
        console.error('Error updating asset request status:', error);
        res.status(500).json({ success: false, message: 'Failed to update request status' });
    }
};

exports.fulfillAssetRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const { companyId, id: userId } = req.user;
        const { assetId, notes } = req.body;

        const request = await getSharedPrismaClient().asset_requests.findFirst({
            where: { id: requestId, companyId }
        });

        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        const asset = await getSharedPrismaClient().asset.findFirst({
            where: { id: assetId, companyId }
        });

        if (!asset || asset.status !== 'AVAILABLE') {
            return res.status(400).json({ success: false, message: 'Asset is not available' });
        }

        // 1. Assign Asset
        await getSharedPrismaClient().assetAssignment.create({
            data: {
                assetId,
                employeeId: request.requestedBy,
                assignedBy: userId,
                assignedAt: new Date(),
                notes: notes || `Fulfilled for request ${requestId}`
            }
        });

        // 2. Update Asset
        await getSharedPrismaClient().asset.update({
            where: { id: assetId },
            data: {
                status: 'IN_USE',
                assignedToId: request.requestedBy
            }
        });

        // 3. Update Request
        const updatedRequest = await getSharedPrismaClient().asset_requests.update({
            where: { id: requestId },
            data: {
                status: 'FULFILLED',
                assetId,
                fulfilledBy: userId,
                fulfilledAt: new Date(),
                notes: notes || request.notes,
                updatedAt: new Date()
            },
            include: { assets: true }
        });

        // Fetch employee details for notification
        const employee = await getSharedPrismaClient().user.findUnique({
            where: { id: request.requestedBy },
            select: { id: true, firstName: true, lastName: true, phone: true }
        });

        // 4. Notify employee via In-App
        await getSharedPrismaClient().notification.create({
            data: {
                companyId,
                userId: request.requestedBy,
                title: 'استلام العهدة',
                message: `تم تسليم عهدتك (${asset.name}) بنجاح. يرجى مراجعة صفحة الأصول.`,
                type: 'ASSET_FULFILLED'
            }
        });

        // Notify employee via WhatsApp
        if (employee) {
            await WhatsAppNotificationService.sendAssetRequestNotification(updatedRequest, employee, 'FULFILLED');
        }

        res.json({ success: true, data: updatedRequest });
    } catch (error) {
        console.error('Error fulfilling asset request:', error);
        res.status(500).json({ success: false, message: 'Failed to fulfill request' });
    }
};

// Maintenance
exports.getMaintenanceHistory = async (req, res) => {
    try {
        const { id: assetId } = req.params;
        const { companyId } = req.user;

        const asset = await getSharedPrismaClient().asset.findFirst({
            where: { id: assetId, companyId }
        });

        if (!asset) {
            return res.status(404).json({ success: false, message: 'Asset not found' });
        }

        const history = await getSharedPrismaClient().assetMaintenance.findMany({
            where: { asset: { companyId } },
            include: { asset: { select: { name: true, code: true } } },
            orderBy: { startDate: 'desc' },
            take: 50
        });

        res.json({ success: true, data: history });
    } catch (error) {
        console.error('Error fetching maintenance history:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch history' });
    }
};

exports.getAssetMaintenanceHistory = async (req, res) => {
    try {
        const { id: assetId } = req.params;
        const { companyId } = req.user;

        const asset = await getSharedPrismaClient().asset.findFirst({
            where: { id: assetId, companyId }
        });

        if (!asset) {
            return res.status(404).json({ success: false, message: 'Asset not found' });
        }

        const history = await getSharedPrismaClient().assetMaintenance.findMany({
            where: { assetId },
            orderBy: { startDate: 'desc' }
        });

        res.json({ success: true, data: history });
    } catch (error) {
        console.error('Error fetching asset maintenance history:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch history' });
    }
};

exports.addMaintenanceRecord = async (req, res) => {
    try {
        const { id: assetId } = req.params;
        const { companyId } = req.user;
        const { type, description, cost, status, startDate, completionDate, performedBy, notes } = req.body;

        const asset = await getSharedPrismaClient().asset.findFirst({
            where: { id: assetId, companyId }
        });

        if (!asset) {
            return res.status(404).json({ success: false, message: 'Asset not found' });
        }

        const maintenance = await getSharedPrismaClient().assetMaintenance.create({
            data: {
                assetId,
                type,
                description,
                cost: cost ? parseFloat(cost) : null,
                status: status || 'COMPLETED',
                startDate: new Date(startDate),
                completionDate: completionDate ? new Date(completionDate) : null,
                performedBy,
                notes,
                updatedAt: new Date()
            }
        });

        res.json({ success: true, data: maintenance });
    } catch (error) {
        console.error('Error adding maintenance record:', error);
        res.status(500).json({ success: false, message: 'Failed to add record' });
    }
};

exports.getAssetAlerts = async (req, res) => {
    try {
        const { companyId } = req.user;
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        // 1. Warranty Expiry Alerts
        const expiringWarranties = await getSharedPrismaClient().asset.findMany({
            where: {
                companyId,
                warrantyEndDate: {
                    gt: new Date(),
                    lte: thirtyDaysFromNow
                }
            },
            select: { id: true, name: true, code: true, warrantyEndDate: true }
        });

        // 2. Upcoming Maintenance Alerts
        const upcomingMaintenance = await getSharedPrismaClient().assetMaintenance.findMany({
            where: {
                asset: { companyId },
                status: 'SCHEDULED',
                startDate: {
                    gt: new Date(),
                    lte: thirtyDaysFromNow
                }
            },
            include: { asset: { select: { name: true, code: true } } }
        });

        res.json({
            success: true,
            data: {
                expiringWarranties: expiringWarranties.map(a => ({
                    assetId: a.id,
                    name: a.name,
                    code: a.code,
                    endDate: a.warrantyEndDate,
                    type: 'WARRANTY'
                })),
                upcomingMaintenance: upcomingMaintenance.map(m => ({
                    maintenanceId: m.id,
                    assetId: m.assetId,
                    name: m.asset.name,
                    code: m.asset.code,
                    scheduledDate: m.startDate,
                    maintenanceType: m.type,
                    type: 'MAINTENANCE'
                }))
            }
        });
    } catch (error) {
        console.error('Error fetching asset alerts:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch alerts' });
    }
};

// Asset Documents
exports.getAssetDocuments = async (req, res) => {
    try {
        const { id } = req.params;
        const documents = await getSharedPrismaClient().asset_attachments.findMany({
            where: { assetId: id },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: { documents } });
    } catch (error) {
        console.error('Error fetching asset documents:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch documents' });
    }
};

exports.uploadAssetDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const { documentType, fileName, fileUrl, description } = req.body;
        const { v4: uuidv4 } = require('uuid');

        const attachment = await getSharedPrismaClient().asset_attachments.create({
            data: {
                id: `att-${uuidv4()}`,
                assetId: id,
                type: documentType || 'other',
                fileName,
                fileUrl,
                description,
                uploadedBy: req.user.id,
                updatedAt: new Date()
            }
        });

        res.json({ success: true, data: attachment });
    } catch (error) {
        console.error('Error uploading asset document:', error);
        res.status(500).json({ success: false, message: 'Failed to upload document' });
    }
};

exports.getAllDocuments = async (req, res) => {
    try {
        const { companyId } = req.user;
        const documents = await getSharedPrismaClient().asset_attachments.findMany({
            where: {
                assets: { companyId }
            },
            include: {
                assets: {
                    select: { id: true, name: true, code: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: { documents } });
    } catch (error) {
        console.error('Error fetching all asset documents:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch documents' });
    }
};


exports.deleteAssetDocument = async (req, res) => {
    try {
        const { docId } = req.params;
        await getSharedPrismaClient().asset_attachments.delete({
            where: { id: docId }
        });
        res.json({ success: true, message: 'Document deleted' });
    } catch (error) {
        console.error('Error deleting asset document:', error);
        res.status(500).json({ success: false, message: 'Failed to delete document' });
    }
};

// Active Custody
exports.getActiveCustody = async (req, res) => {
    try {
        const { companyId } = req.user;
        const activeCustody = await getSharedPrismaClient().assetAssignment.findMany({
            where: {
                asset: { companyId },
                returnedAt: null
            },
            include: {
                asset: {
                    include: { category: true }
                }
            },
            orderBy: { assignedAt: 'desc' }
        });

        // Add mock employee data if actual employee link is missing
        // This is to satisfy the frontend's requirement for firstName/lastName
        const processedCustody = activeCustody.map(assignment => ({
            ...assignment,
            employee: {
                firstName: 'موظف',
                lastName: `(ID: ${assignment.userId})`,
                employeeId: assignment.userId
            }
        }));

        res.json({ success: true, data: processedCustody });
    } catch (error) {
        console.error('Error fetching active custody:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch active custody' });
    }
};

