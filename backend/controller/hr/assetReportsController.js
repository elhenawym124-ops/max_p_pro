const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// تقرير: كل الأصول مع تفاصيلها
exports.getAllAssetsReport = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { format = 'json' } = req.query;

        const assets = await getSharedPrismaClient().asset.findMany({
            where: { companyId },
            include: {
                category: true,
                assignments: {
                    where: { returnedAt: null }
                },
                maintenance: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Get user data for assignments
        const userIds = [...new Set(assets.flatMap(a => a.assignments.map(assign => assign.userId)).filter(Boolean))];
        const users = await getSharedPrismaClient().user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, firstName: true, lastName: true, email: true }
        });
        const userMap = new Map(users.map(u => [u.id, u]));

        const reportData = assets.map(asset => {
            const assignment = asset.assignments[0];
            const user = assignment ? userMap.get(assignment.userId) : null;
            return {
                code: asset.code || 'N/A',
                name: asset.name,
                category: asset.category?.name || 'غير محدد',
                serialNumber: asset.serialNumber || 'N/A',
                brand: asset.brand || 'N/A',
                model: asset.model || 'N/A',
                status: asset.status,
                condition: asset.condition,
                purchaseDate: asset.purchaseDate,
                purchaseValue: asset.purchaseValue ? parseFloat(asset.purchaseValue) : 0,
                currentBookValue: asset.currentBookValue ? parseFloat(asset.currentBookValue) : 0,
                location: asset.location || 'N/A',
                assignedTo: user ? `${user.firstName} ${user.lastName}` : 'غير معين',
                warrantyEndDate: asset.warrantyEndDate,
                notes: asset.notes || ''
            };
        });

        if (format === 'excel') {
            return await generateExcelReport(res, reportData, 'جميع_الأصول', [
                { header: 'الكود', key: 'code', width: 15 },
                { header: 'الاسم', key: 'name', width: 25 },
                { header: 'الفئة', key: 'category', width: 20 },
                { header: 'الرقم التسلسلي', key: 'serialNumber', width: 20 },
                { header: 'العلامة التجارية', key: 'brand', width: 20 },
                { header: 'الموديل', key: 'model', width: 20 },
                { header: 'الحالة', key: 'status', width: 15 },
                { header: 'الوضع', key: 'condition', width: 15 },
                { header: 'تاريخ الشراء', key: 'purchaseDate', width: 15 },
                { header: 'قيمة الشراء', key: 'purchaseValue', width: 15 },
                { header: 'القيمة الدفترية', key: 'currentBookValue', width: 15 },
                { header: 'الموقع', key: 'location', width: 20 },
                { header: 'معين لـ', key: 'assignedTo', width: 25 },
                { header: 'انتهاء الضمان', key: 'warrantyEndDate', width: 15 },
                { header: 'ملاحظات', key: 'notes', width: 30 }
            ]);
        }

        if (format === 'pdf') {
            return await generatePDFReport(res, reportData, 'تقرير جميع الأصول', [
                'الكود', 'الاسم', 'الفئة', 'الحالة', 'معين لـ'
            ]);
        }

        res.json({
            success: true,
            data: {
                assets: reportData,
                summary: {
                    total: assets.length,
                    totalValue: reportData.reduce((sum, a) => sum + a.purchaseValue, 0),
                    currentValue: reportData.reduce((sum, a) => sum + a.currentBookValue, 0)
                }
            }
        });

    } catch (error) {
        console.error('Error generating all assets report:', error);
        res.status(500).json({ success: false, message: 'فشل في إنشاء التقرير', error: error.message });
    }
};

// تقرير: العهد الحالية لكل موظف
exports.getEmployeeCustodyReport = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { format = 'json' } = req.query;

        const assignments = await getSharedPrismaClient().assetAssignment.findMany({
            where: {
                asset: { companyId },
                returnedAt: null
            },
            include: {
                asset: {
                    include: {
                        category: true
                    }
                }
            },
            orderBy: { assignedAt: 'desc' }
        });

        // Get user data
        const userIds = [...new Set(assignments.map(a => a.userId))];
        const users = await getSharedPrismaClient().user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, firstName: true, lastName: true, email: true, phone: true, department: true }
        });
        const userMap = new Map(users.map(u => [u.id, u]));

        // Group by employee
        const employeeMap = new Map();
        assignments.forEach(assignment => {
            const userId = assignment.userId;
            const user = userMap.get(userId);
            if (!user) return;
            
            if (!employeeMap.has(userId)) {
                employeeMap.set(userId, {
                    employeeName: `${user.firstName} ${user.lastName}`,
                    email: user.email,
                    phone: user.phone || 'N/A',
                    department: user.department || 'N/A',
                    assets: [],
                    totalValue: 0
                });
            }
            const employee = employeeMap.get(userId);
            const assetValue = assignment.asset.purchaseValue ? parseFloat(assignment.asset.purchaseValue) : 0;
            employee.assets.push({
                code: assignment.asset.code || 'N/A',
                name: assignment.asset.name,
                category: assignment.asset.category?.name || 'غير محدد',
                serialNumber: assignment.asset.serialNumber || 'N/A',
                assignedAt: assignment.assignedAt,
                value: assetValue,
                condition: assignment.asset.condition
            });
            employee.totalValue += assetValue;
        });

        const reportData = Array.from(employeeMap.values());

        if (format === 'excel') {
            const flatData = [];
            reportData.forEach(emp => {
                emp.assets.forEach(asset => {
                    flatData.push({
                        employeeName: emp.employeeName,
                        email: emp.email,
                        phone: emp.phone,
                        department: emp.department,
                        assetCode: asset.code,
                        assetName: asset.name,
                        category: asset.category,
                        serialNumber: asset.serialNumber,
                        assignedAt: asset.assignedAt,
                        value: asset.value,
                        condition: asset.condition
                    });
                });
            });

            return await generateExcelReport(res, flatData, 'العهد_الحالية', [
                { header: 'اسم الموظف', key: 'employeeName', width: 25 },
                { header: 'البريد الإلكتروني', key: 'email', width: 30 },
                { header: 'الهاتف', key: 'phone', width: 15 },
                { header: 'القسم', key: 'department', width: 20 },
                { header: 'كود الأصل', key: 'assetCode', width: 15 },
                { header: 'اسم الأصل', key: 'assetName', width: 25 },
                { header: 'الفئة', key: 'category', width: 20 },
                { header: 'الرقم التسلسلي', key: 'serialNumber', width: 20 },
                { header: 'تاريخ التعيين', key: 'assignedAt', width: 15 },
                { header: 'القيمة', key: 'value', width: 15 },
                { header: 'الحالة', key: 'condition', width: 15 }
            ]);
        }

        res.json({
            success: true,
            data: {
                employees: reportData,
                summary: {
                    totalEmployees: reportData.length,
                    totalAssets: assignments.length,
                    totalValue: reportData.reduce((sum, emp) => sum + emp.totalValue, 0)
                }
            }
        });

    } catch (error) {
        console.error('Error generating employee custody report:', error);
        res.status(500).json({ success: false, message: 'فشل في إنشاء التقرير', error: error.message });
    }
};

// تقرير: الأصول المتاحة
exports.getAvailableAssetsReport = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { format = 'json' } = req.query;

        const assets = await getSharedPrismaClient().asset.findMany({
            where: {
                companyId,
                status: 'AVAILABLE'
            },
            include: {
                category: true
            },
            orderBy: { name: 'asc' }
        });

        const reportData = assets.map(asset => ({
            code: asset.code || 'N/A',
            name: asset.name,
            category: asset.category?.name || 'غير محدد',
            serialNumber: asset.serialNumber || 'N/A',
            brand: asset.brand || 'N/A',
            model: asset.model || 'N/A',
            condition: asset.condition,
            purchaseValue: asset.purchaseValue ? parseFloat(asset.purchaseValue) : 0,
            location: asset.location || 'N/A',
            warrantyEndDate: asset.warrantyEndDate
        }));

        if (format === 'excel') {
            return await generateExcelReport(res, reportData, 'الأصول_المتاحة', [
                { header: 'الكود', key: 'code', width: 15 },
                { header: 'الاسم', key: 'name', width: 25 },
                { header: 'الفئة', key: 'category', width: 20 },
                { header: 'الرقم التسلسلي', key: 'serialNumber', width: 20 },
                { header: 'العلامة التجارية', key: 'brand', width: 20 },
                { header: 'الموديل', key: 'model', width: 20 },
                { header: 'الحالة', key: 'condition', width: 15 },
                { header: 'القيمة', key: 'purchaseValue', width: 15 },
                { header: 'الموقع', key: 'location', width: 20 },
                { header: 'انتهاء الضمان', key: 'warrantyEndDate', width: 15 }
            ]);
        }

        res.json({
            success: true,
            data: {
                assets: reportData,
                summary: {
                    total: assets.length,
                    totalValue: reportData.reduce((sum, a) => sum + a.purchaseValue, 0)
                }
            }
        });

    } catch (error) {
        console.error('Error generating available assets report:', error);
        res.status(500).json({ success: false, message: 'فشل في إنشاء التقرير', error: error.message });
    }
};

// تقرير: الأصول في الصيانة
exports.getMaintenanceAssetsReport = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { format = 'json' } = req.query;

        const assets = await getSharedPrismaClient().asset.findMany({
            where: {
                companyId,
                status: 'MAINTENANCE'
            },
            include: {
                category: true,
                maintenance: {
                    where: { completionDate: null },
                    orderBy: { createdAt: 'desc' }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        const reportData = assets.map(asset => {
            const currentMaintenance = asset.maintenance[0];
            return {
                code: asset.code || 'N/A',
                name: asset.name,
                category: asset.category?.name || 'غير محدد',
                serialNumber: asset.serialNumber || 'N/A',
                maintenanceType: currentMaintenance?.type || 'N/A',
                maintenanceDescription: currentMaintenance?.description || 'N/A',
                startDate: currentMaintenance?.createdAt,
                estimatedCost: currentMaintenance?.estimatedCost ? parseFloat(currentMaintenance.estimatedCost) : 0,
                provider: currentMaintenance?.provider || 'N/A',
                location: asset.location || 'N/A'
            };
        });

        if (format === 'excel') {
            return await generateExcelReport(res, reportData, 'الأصول_في_الصيانة', [
                { header: 'الكود', key: 'code', width: 15 },
                { header: 'الاسم', key: 'name', width: 25 },
                { header: 'الفئة', key: 'category', width: 20 },
                { header: 'الرقم التسلسلي', key: 'serialNumber', width: 20 },
                { header: 'نوع الصيانة', key: 'maintenanceType', width: 20 },
                { header: 'الوصف', key: 'maintenanceDescription', width: 30 },
                { header: 'تاريخ البدء', key: 'startDate', width: 15 },
                { header: 'التكلفة المقدرة', key: 'estimatedCost', width: 15 },
                { header: 'مزود الخدمة', key: 'provider', width: 25 },
                { header: 'الموقع', key: 'location', width: 20 }
            ]);
        }

        res.json({
            success: true,
            data: {
                assets: reportData,
                summary: {
                    total: assets.length,
                    totalEstimatedCost: reportData.reduce((sum, a) => sum + a.estimatedCost, 0)
                }
            }
        });

    } catch (error) {
        console.error('Error generating maintenance assets report:', error);
        res.status(500).json({ success: false, message: 'فشل في إنشاء التقرير', error: error.message });
    }
};

// تقرير: الأصول المفقودة/التالفة
exports.getLostDamagedAssetsReport = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { format = 'json' } = req.query;

        const assets = await getSharedPrismaClient().asset.findMany({
            where: {
                companyId,
                OR: [
                    { status: 'LOST' },
                    { condition: 'DAMAGED' }
                ]
            },
            include: {
                category: true,
                assignments: {
                    orderBy: { assignedAt: 'desc' },
                    take: 1
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        // Get user data
        const userIds = [...new Set(assets.flatMap(a => a.assignments.map(assign => assign.userId)).filter(Boolean))];
        const users = await getSharedPrismaClient().user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, firstName: true, lastName: true, email: true }
        });
        const userMap = new Map(users.map(u => [u.id, u]));

        const reportData = assets.map(asset => {
            const assignment = asset.assignments[0];
            const user = assignment ? userMap.get(assignment.userId) : null;
            return {
                code: asset.code || 'N/A',
                name: asset.name,
                category: asset.category?.name || 'غير محدد',
                serialNumber: asset.serialNumber || 'N/A',
                status: asset.status,
                condition: asset.condition,
                purchaseValue: asset.purchaseValue ? parseFloat(asset.purchaseValue) : 0,
                lastAssignedTo: user ? `${user.firstName} ${user.lastName}` : 'N/A',
                lastAssignedAt: assignment?.assignedAt,
                notes: asset.notes || '',
                updatedAt: asset.updatedAt
            };
        });

        if (format === 'excel') {
            return await generateExcelReport(res, reportData, 'الأصول_المفقودة_التالفة', [
                { header: 'الكود', key: 'code', width: 15 },
                { header: 'الاسم', key: 'name', width: 25 },
                { header: 'الفئة', key: 'category', width: 20 },
                { header: 'الرقم التسلسلي', key: 'serialNumber', width: 20 },
                { header: 'الحالة', key: 'status', width: 15 },
                { header: 'الوضع', key: 'condition', width: 15 },
                { header: 'القيمة', key: 'purchaseValue', width: 15 },
                { header: 'آخر معين لـ', key: 'lastAssignedTo', width: 25 },
                { header: 'تاريخ التعيين', key: 'lastAssignedAt', width: 15 },
                { header: 'ملاحظات', key: 'notes', width: 30 },
                { header: 'آخر تحديث', key: 'updatedAt', width: 15 }
            ]);
        }

        res.json({
            success: true,
            data: {
                assets: reportData,
                summary: {
                    total: assets.length,
                    lost: assets.filter(a => a.status === 'LOST').length,
                    damaged: assets.filter(a => a.status === 'DAMAGED').length,
                    totalLostValue: reportData.filter(a => a.status === 'LOST').reduce((sum, a) => sum + a.purchaseValue, 0),
                    totalDamagedValue: reportData.filter(a => a.status === 'DAMAGED').reduce((sum, a) => sum + a.purchaseValue, 0)
                }
            }
        });

    } catch (error) {
        console.error('Error generating lost/damaged assets report:', error);
        res.status(500).json({ success: false, message: 'فشل في إنشاء التقرير', error: error.message });
    }
};

// تقرير: القيمة الإجمالية للأصول
exports.getTotalValueReport = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { format = 'json' } = req.query;

        const assets = await getSharedPrismaClient().asset.findMany({
            where: { companyId },
            include: {
                category: true
            }
        });

        // Group by category
        const categoryMap = new Map();
        let totalPurchaseValue = 0;
        let totalCurrentValue = 0;

        assets.forEach(asset => {
            const categoryName = asset.category?.name || 'غير مصنف';
            const purchaseValue = asset.purchaseValue ? parseFloat(asset.purchaseValue) : 0;
            const currentValue = asset.currentBookValue ? parseFloat(asset.currentBookValue) : purchaseValue;

            if (!categoryMap.has(categoryName)) {
                categoryMap.set(categoryName, {
                    category: categoryName,
                    count: 0,
                    purchaseValue: 0,
                    currentValue: 0,
                    depreciation: 0
                });
            }

            const cat = categoryMap.get(categoryName);
            cat.count++;
            cat.purchaseValue += purchaseValue;
            cat.currentValue += currentValue;
            cat.depreciation = cat.purchaseValue - cat.currentValue;

            totalPurchaseValue += purchaseValue;
            totalCurrentValue += currentValue;
        });

        const reportData = Array.from(categoryMap.values());

        // Status breakdown
        const statusBreakdown = {
            AVAILABLE: { count: 0, value: 0 },
            ASSIGNED: { count: 0, value: 0 },
            MAINTENANCE: { count: 0, value: 0 },
            LOST: { count: 0, value: 0 },
            DAMAGED: { count: 0, value: 0 },
            RETIRED: { count: 0, value: 0 }
        };

        assets.forEach(asset => {
            const value = asset.purchaseValue ? parseFloat(asset.purchaseValue) : 0;
            if (statusBreakdown[asset.status]) {
                statusBreakdown[asset.status].count++;
                statusBreakdown[asset.status].value += value;
            }
        });

        if (format === 'excel') {
            return await generateExcelReport(res, reportData, 'القيمة_الإجمالية_للأصول', [
                { header: 'الفئة', key: 'category', width: 25 },
                { header: 'العدد', key: 'count', width: 15 },
                { header: 'قيمة الشراء', key: 'purchaseValue', width: 20 },
                { header: 'القيمة الحالية', key: 'currentValue', width: 20 },
                { header: 'الإهلاك', key: 'depreciation', width: 20 }
            ]);
        }

        res.json({
            success: true,
            data: {
                byCategory: reportData,
                byStatus: Object.entries(statusBreakdown).map(([status, data]) => ({
                    status,
                    count: data.count,
                    value: data.value
                })),
                summary: {
                    totalAssets: assets.length,
                    totalPurchaseValue,
                    totalCurrentValue,
                    totalDepreciation: totalPurchaseValue - totalCurrentValue,
                    depreciationPercentage: totalPurchaseValue > 0 
                        ? ((totalPurchaseValue - totalCurrentValue) / totalPurchaseValue * 100).toFixed(2)
                        : 0
                }
            }
        });

    } catch (error) {
        console.error('Error generating total value report:', error);
        res.status(500).json({ success: false, message: 'فشل في إنشاء التقرير', error: error.message });
    }
};

// Helper function to generate Excel reports
async function generateExcelReport(res, data, filename, columns) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('التقرير');

    worksheet.columns = columns;

    // Style header
    worksheet.getRow(1).font = { bold: true, size: 12 };
    worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Add data
    data.forEach(row => {
        worksheet.addRow(row);
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
        column.alignment = { vertical: 'middle', horizontal: 'right' };
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="report_${Date.now()}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
}

// Helper function to generate PDF reports (simplified)
async function generatePDFReport(res, data, title, headers) {
    const doc = new PDFDocument({ margin: 50 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=report_${Date.now()}.pdf`);

    doc.pipe(res);

    // Add title
    doc.fontSize(20).text(title, { align: 'center' });
    doc.moveDown();

    // Add date
    doc.fontSize(10).text(`تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}`, { align: 'right' });
    doc.moveDown();

    // Add summary
    doc.fontSize(12).text(`إجمالي السجلات: ${data.length}`, { align: 'right' });
    doc.moveDown();

    doc.end();
}

module.exports = exports;
