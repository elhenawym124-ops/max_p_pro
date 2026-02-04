// Use shared database service instead of creating new PrismaClient
const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

/**
 * Branch Controller
 * Handles all branch-related operations with company isolation
 */

// Get all branches for a company
const getBranches = async (req, res) => {
  try {
    const { companyId } = req.user;

    const branches = await getSharedPrismaClient().branch.findMany({
      where: { companyId },
      orderBy: [
        { isActive: 'desc' },
        { name: 'asc' }
      ]
    });

    res.json({
      success: true,
      data: branches
    });
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_BRANCHES_ERROR',
        message: 'فشل في تحميل الفروع',
        details: error.message
      }
    });
  }
};

// Get single branch by ID
const getBranchById = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.user;

    const branch = await getSharedPrismaClient().branch.findFirst({
      where: {
        id,
        companyId // Company isolation
      }
    });

    if (!branch) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'BRANCH_NOT_FOUND',
          message: 'الفرع غير موجود'
        }
      });
    }

    res.json({
      success: true,
      data: branch
    });
  } catch (error) {
    console.error('Error fetching branch:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_BRANCH_ERROR',
        message: 'فشل في تحميل الفرع',
        details: error.message
      }
    });
  }
};

// Create new branch
const createBranch = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { name, address, city, phone, email, workingHours, isActive } = req.body;

    // Validation
    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'يرجى ملء جميع الحقول المطلوبة (الاسم، الهاتف)'
        }
      });
    }

    const branch = await getSharedPrismaClient().branch.create({
      data: {
        name,
        address: address || null,
        city: city || null,
        phone,
        email: email || null,
        workingHours: workingHours || null,
        isActive: isActive !== undefined ? isActive : true,
        companyId
      }
    });

    res.status(201).json({
      success: true,
      data: branch,
      message: 'تم إضافة الفرع بنجاح'
    });
  } catch (error) {
    console.error('Error creating branch:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_BRANCH_ERROR',
        message: 'فشل في إضافة الفرع',
        details: error.message
      }
    });
  }
};

// Update branch
const updateBranch = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.user;
    const { name, address, city, phone, email, workingHours, isActive } = req.body;

    // Check if branch exists and belongs to company
    const existingBranch = await getSharedPrismaClient().branch.findFirst({
      where: {
        id,
        companyId
      }
    });

    if (!existingBranch) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'BRANCH_NOT_FOUND',
          message: 'الفرع غير موجود'
        }
      });
    }

    // Validation
    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'يرجى ملء جميع الحقول المطلوبة (الاسم، الهاتف)'
        }
      });
    }

    const branch = await getSharedPrismaClient().branch.update({
      where: { id },
      data: {
        name,
        address: address || null,
        city: city || null,
        phone,
        email: email || null,
        workingHours: workingHours || null,
        isActive: isActive !== undefined ? isActive : existingBranch.isActive
      }
    });

    res.json({
      success: true,
      data: branch,
      message: 'تم تحديث الفرع بنجاح'
    });
  } catch (error) {
    console.error('Error updating branch:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_BRANCH_ERROR',
        message: 'فشل في تحديث الفرع',
        details: error.message
      }
    });
  }
};

// Delete branch
const deleteBranch = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.user;

    // Check if branch exists and belongs to company
    const existingBranch = await getSharedPrismaClient().branch.findFirst({
      where: {
        id,
        companyId
      }
    });

    if (!existingBranch) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'BRANCH_NOT_FOUND',
          message: 'الفرع غير موجود'
        }
      });
    }

    await getSharedPrismaClient().branch.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'تم حذف الفرع بنجاح'
    });
  } catch (error) {
    console.error('Error deleting branch:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_BRANCH_ERROR',
        message: 'فشل في حذف الفرع',
        details: error.message
      }
    });
  }
};

// Toggle branch active status
const toggleBranchStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.user;

    const branch = await getSharedPrismaClient().branch.findFirst({
      where: {
        id,
        companyId
      }
    });

    if (!branch) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'BRANCH_NOT_FOUND',
          message: 'الفرع غير موجود'
        }
      });
    }

    const updatedBranch = await getSharedPrismaClient().branch.update({
      where: { id },
      data: {
        isActive: !branch.isActive
      }
    });

    res.json({
      success: true,
      data: updatedBranch,
      message: `تم ${updatedBranch.isActive ? 'تفعيل' : 'تعطيل'} الفرع بنجاح`
    });
  } catch (error) {
    console.error('Error toggling branch status:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TOGGLE_STATUS_ERROR',
        message: 'فشل في تغيير حالة الفرع',
        details: error.message
      }
    });
  }
};

// Get active branches only
const getActiveBranches = async (req, res) => {
  try {
    const { companyId } = req.user;

    const branches = await getSharedPrismaClient().branch.findMany({
      where: {
        companyId,
        isActive: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    res.json({
      success: true,
      data: branches
    });
  } catch (error) {
    console.error('Error fetching active branches:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ACTIVE_BRANCHES_ERROR',
        message: 'فشل في تحميل الفروع النشطة',
        details: error.message
      }
    });
  }
};

module.exports = {
  getBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
  toggleBranchStatus,
  getActiveBranches
};
