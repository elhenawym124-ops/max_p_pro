const { getSharedPrismaClient, safeQuery } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

// Get all inventory items with filters
exports.getInventory = async (req, res) => {
  try {
    const { warehouseId, lowStock, outOfStock, search } = req.query;
    const companyId = req.user.companyId;

    // Build the WHERE clause for Products
    const productWhere = {
      companyId: companyId,
      isActive: true
    };

    if (search) {
      productWhere.OR = [
        { name: { contains: search } },
        { sku: { contains: search } }
      ];
    }

    // Build the WHERE clause for Inventory (nested)
    const inventoryWhere = {};
    if (warehouseId) {
      inventoryWhere.warehouseId = warehouseId;
    }

    // If we are filtering by stock status, we might need a different approach 
    // but for now let's fetch products and their related inventory
    const products = await getSharedPrismaClient().product.findMany({
      where: productWhere,
      include: {
        inventory: {
          where: inventoryWhere,
          include: {
            warehouses: {
              select: {
                id: true,
                name: true,
                location: true
              }
            }
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // Transform products into a flat inventory-like structure for the frontend
    // If a product has no inventory records, we show it with 0 quantities
    const flatInventory = [];

    products.forEach(product => {
      // If product has inventory records, create entries for each
      if (product.inventory && product.inventory.length > 0) {
        product.inventory.forEach(inv => {
          flatInventory.push({
            id: inv.id,
            productId: product.id,
            warehouseId: inv.warehouseId,
            quantity: inv.quantity,
            available: inv.available,
            reserved: inv.reserved,
            minStock: inv.minStock,
            reorderPoint: inv.reorderPoint,
            batchNumber: inv.batchNumber,
            expiryDate: inv.expiryDate,
            updatedAt: inv.updatedAt,
            products: {
              id: product.id,
              name: product.name,
              sku: product.sku,
              price: product.price,
              images: product.images
            },
            warehouses: inv.warehouses
          });
        });
      } else {
        // Product exists but no stock records yet - add a "virtual" entry
        flatInventory.push({
          id: `virtual-${product.id}`,
          productId: product.id,
          warehouseId: warehouseId || 'INITIAL', // Use requested WH or placeholder
          quantity: 0,
          available: 0,
          reserved: 0,
          minStock: 0,
          reorderPoint: 0,
          batchNumber: null,
          expiryDate: null,
          updatedAt: product.updatedAt,
          products: {
            id: product.id,
            name: product.name,
            sku: product.sku,
            price: product.price,
            images: product.images
          },
          warehouses: {
            id: 'NONE',
            name: 'لم يتم التخصيص',
            location: ''
          }
        });
      }
    });

    // Post-aggregation filtering for stock status (if requested)
    let filteredResults = flatInventory;
    if (lowStock === 'true') {
      filteredResults = filteredResults.filter(item => item.available <= (item.reorderPoint || 0));
    }
    if (outOfStock === 'true') {
      filteredResults = filteredResults.filter(item => item.available === 0);
    }

    res.json({
      success: true,
      data: filteredResults
    });
  } catch (error) {
    console.error('❌ [INVENTORY] Error fetching inventory:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب المخزون',
      error: error.message
    });
  }
};

// Get inventory alerts (low stock / out of stock)
exports.getAlerts = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    // Get low stock items
    const lowStockItems = await getSharedPrismaClient().$queryRaw`
      SELECT 
        i.id,
        i.productId,
        i.warehouseId,
        i.quantity,
        i.available,
        i.minStock,
        i.reorderPoint,
        p.name as productName,
        p.sku,
        w.name as warehouseName
      FROM inventory i
      INNER JOIN products p ON i.productId = p.id
      INNER JOIN warehouses w ON i.warehouseId = w.id
      WHERE w.companyId = ${companyId}
      AND i.available <= i.reorderPoint
      AND i.available > 0
      ORDER BY i.available ASC
    `;

    // Get out of stock items
    const outOfStockItems = await getSharedPrismaClient().$queryRaw`
      SELECT 
        i.id,
        i.productId,
        i.warehouseId,
        i.quantity,
        i.available,
        p.name as productName,
        p.sku,
        w.name as warehouseName
      FROM inventory i
      INNER JOIN products p ON i.productId = p.id
      INNER JOIN warehouses w ON i.warehouseId = w.id
      WHERE w.companyId = ${companyId}
      AND i.available = 0
      ORDER BY i.updatedAt DESC
    `;

    res.json({
      success: true,
      data: {
        lowStock: lowStockItems,
        outOfStock: outOfStockItems,
        total: lowStockItems.length + outOfStockItems.length
      }
    });
  } catch (error) {
    console.error('❌ [INVENTORY] Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب التنبيهات',
      error: error.message
    });
  }
};

// Update stock quantity
exports.updateStock = async (req, res) => {
  try {
    const { productId, warehouseId, quantity, type, reason, notes, batchNumber, expiryDate, isApproved = true } = req.body;
    const companyId = req.user.companyId;

    // Verify warehouse belongs to company
    const warehouse = await getSharedPrismaClient().warehouse.findFirst({
      where: {
        id: warehouseId,
        companyId: companyId
      }
    });

    if (!warehouse) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بتحديث هذا المخزن'
      });
    }

    let updatedInventory = null;

    // Only update Inventory counts if approved
    if (isApproved) {
      // Get or create inventory record (including batch)
      let inventory = await getSharedPrismaClient().inventory.findUnique({
        where: {
          productId_warehouseId_batchNumber: {
            productId,
            warehouseId,
            batchNumber: batchNumber || null
          }
        }
      });

      if (!inventory) {
        inventory = await getSharedPrismaClient().inventory.create({
          data: {
            productId,
            warehouseId,
            batchNumber: batchNumber || null,
            expiryDate: expiryDate ? new Date(expiryDate) : null,
            quantity: 0,
            available: 0,
            reserved: 0
          }
        });
      }

      // Calculate new quantity based on type
      let newQuantity = inventory.quantity;
      let newAvailable = inventory.available;

      if (['IN', 'PURCHASE', 'RETURN', 'ADJUSTMENT_IN'].includes(type)) {
        newQuantity += quantity;
        newAvailable += quantity;
      } else if (['OUT', 'SALE', 'DAMAGE', 'ADJUSTMENT_OUT'].includes(type)) {
        newQuantity -= quantity;
        newAvailable -= quantity;
      }

      // Update inventory
      updatedInventory = await getSharedPrismaClient().inventory.update({
        where: { id: inventory.id },
        data: {
          quantity: Math.max(0, newQuantity),
          available: Math.max(0, newAvailable),
          updatedAt: new Date()
        },
        include: {
          products: true,
          warehouses: true
        }
      });
    }

    // Create stock movement record (always created, but flagged if not approved)
    const movement = await getSharedPrismaClient().stockMovement.create({
      data: {
        productId,
        warehouseId,
        type,
        reason,
        quantity,
        notes,
        batchNumber: batchNumber || null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        isApproved,
        userId: req.user.id,
        userName: req.user.name,
        approvedBy: isApproved ? req.user.id : null,
        approvedAt: isApproved ? new Date() : null
      }
    });

    res.json({
      success: true,
      message: isApproved ? 'تم تحديث المخزون بنجاح' : 'تم تسجيل الطلب بانتظار الموافقة',
      data: {
        inventory: updatedInventory,
        movement
      }
    });
  } catch (error) {
    console.error('❌ [INVENTORY] Error updating stock:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في تحديث المخزون',
      error: error.message
    });
  }
};

// Get inventory for specific product
exports.getProductInventory = async (req, res) => {
  try {
    const { productId } = req.params;
    const companyId = req.user.companyId;

    const inventory = await getSharedPrismaClient().inventory.findMany({
      where: {
        productId,
        warehouses: {
          companyId
        }
      },
      include: {
        warehouses: true,
        products: true
      }
    });

    // Calculate totals
    const totals = inventory.reduce((acc, item) => ({
      quantity: acc.quantity + item.quantity,
      available: acc.available + item.available,
      reserved: acc.reserved + item.reserved
    }), { quantity: 0, available: 0, reserved: 0 });

    res.json({
      success: true,
      data: {
        inventory,
        totals
      }
    });
  } catch (error) {
    console.error('❌ [INVENTORY] Error fetching product inventory:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب مخزون المنتج',
      error: error.message
    });
  }
};

// Get stock movements
exports.getStockMovements = async (req, res) => {
  try {
    const { productId, warehouseId, type, startDate, endDate } = req.query;
    const companyId = req.user.companyId;

    const where = {
      warehouses: {
        companyId
      }
    };

    if (productId) where.productId = productId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (type) where.type = type;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const movements = await getSharedPrismaClient().stockMovement.findMany({
      where,
      include: {
        products: {
          select: {
            name: true,
            sku: true
          }
        },
        warehouses: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100
    });

    res.json({
      success: true,
      data: movements
    });
  } catch (error) {
    console.error('❌ [INVENTORY] Error fetching movements:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب حركات المخزون',
      error: error.message
    });
  }
};

// Approve a pending stock movement
exports.approveMovement = async (req, res) => {
  try {
    const { movementId } = req.body;
    const companyId = req.user.companyId;

    // 1. Find the movement
    const movement = await getSharedPrismaClient().stockMovement.findUnique({
      where: { id: movementId },
      include: {
        warehouses: true
      }
    });

    if (!movement || !movement.warehouses || movement.warehouses.companyId !== companyId) {
      return res.status(404).json({ success: false, message: 'الحركة غير موجودة' });
    }

    if (movement.isApproved) {
      return res.status(400).json({ success: false, message: 'هذه الحركة معتمدة بالفعل' });
    }

    // 2. Perform atomic transaction: Approve and Update Inventory
    const result = await getSharedPrismaClient().$transaction(async (prisma) => {
      // Get or create inventory record
      let inventory = await prisma.inventory.findUnique({
        where: {
          productId_warehouseId_batchNumber: {
            productId: movement.productId,
            warehouseId: movement.warehouseId,
            batchNumber: movement.batchNumber || null
          }
        }
      });

      if (!inventory) {
        inventory = await prisma.inventory.create({
          data: {
            productId: movement.productId,
            warehouseId: movement.warehouseId,
            batchNumber: movement.batchNumber || null,
            expiryDate: movement.expiryDate || null,
            quantity: 0,
            available: 0,
            reserved: 0
          }
        });
      }

      // Calculate new quantity
      let newQuantity = inventory.quantity;
      let newAvailable = inventory.available;

      if (['IN', 'PURCHASE', 'RETURN', 'ADJUSTMENT_IN'].includes(movement.type)) {
        newQuantity += movement.quantity;
        newAvailable += movement.quantity;
      } else if (['OUT', 'SALE', 'DAMAGE', 'ADJUSTMENT_OUT'].includes(movement.type)) {
        newQuantity -= movement.quantity;
        newAvailable -= movement.quantity;
      }

      // Update inventory
      const updatedInventory = await prisma.inventory.update({
        where: { id: inventory.id },
        data: {
          quantity: Math.max(0, newQuantity),
          available: Math.max(0, newAvailable),
          updatedAt: new Date()
        }
      });

      // Update movement
      const updatedMovement = await prisma.stockMovement.update({
        where: { id: movement.id },
        data: {
          isApproved: true,
          approvedBy: req.user.id,
          approvedAt: new Date()
        }
      });

      return { updatedInventory, updatedMovement };
    });

    res.json({
      success: true,
      message: 'تم اعتماد الحركة وتحديث المخزون',
      data: result
    });
  } catch (error) {
    console.error('❌ [INVENTORY] Error approving movement:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في اعتماد الحركة',
      error: error.message
    });
  }
};

// Transfer stock between warehouses
exports.transferStock = async (req, res) => {
  try {
    const { productId, fromWarehouseId, toWarehouseId, quantity, notes, batchNumber } = req.body;
    const companyId = req.user.companyId;

    if (fromWarehouseId === toWarehouseId) {
      return res.status(400).json({ success: false, message: 'مخزن المصدر والوجهة متطابقان' });
    }

    // Perform atomic transaction for transfer
    const result = await getSharedPrismaClient().$transaction(async (prisma) => {
      // 1. Deduct from source
      const sourceInv = await prisma.inventory.findUnique({
        where: {
          productId_warehouseId_batchNumber: {
            productId,
            warehouseId: fromWarehouseId,
            batchNumber: batchNumber || null
          }
        }
      });

      if (!sourceInv || sourceInv.available < quantity) {
        throw new Error('مخزون غير كاف في مخزن المصدر');
      }

      await prisma.inventory.update({
        where: { id: sourceInv.id },
        data: {
          quantity: { decrement: quantity },
          available: { decrement: quantity }
        }
      });

      // 2. Add to destination
      let destInv = await prisma.inventory.findUnique({
        where: {
          productId_warehouseId_batchNumber: {
            productId,
            warehouseId: toWarehouseId,
            batchNumber: batchNumber || null
          }
        }
      });

      if (!destInv) {
        destInv = await prisma.inventory.create({
          data: {
            productId,
            warehouseId: toWarehouseId,
            batchNumber: batchNumber || null,
            expiryDate: sourceInv.expiryDate || null,
            quantity: quantity,
            available: quantity,
            reserved: 0
          }
        });
      } else {
        await prisma.inventory.update({
          where: { id: destInv.id },
          data: {
            quantity: { increment: quantity },
            available: { increment: quantity }
          }
        });
      }

      // 3. Create movement logs
      await prisma.stockMovement.create({
        data: {
          productId,
          warehouseId: fromWarehouseId,
          type: 'TRANSFER_OUT',
          reason: 'TRANSFER',
          quantity: quantity,
          notes: `نقل إلى الوجهة. ${notes || ''}`,
          batchNumber: batchNumber || null,
          isApproved: true,
          userId: req.user.id,
          userName: req.user.name
        }
      });

      await prisma.stockMovement.create({
        data: {
          productId,
          warehouseId: toWarehouseId,
          type: 'TRANSFER_IN',
          reason: 'TRANSFER',
          quantity: quantity,
          notes: `استلام من المصدر. ${notes || ''}`,
          batchNumber: batchNumber || null,
          isApproved: true,
          userId: req.user.id,
          userName: req.user.name
        }
      });

      return { success: true };
    });

    res.json({
      success: true,
      message: 'تم نقل المخزون بنجاح'
    });
  } catch (error) {
    console.error('❌ [INVENTORY] Error transferring stock:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في نقل المخزون',
      error: error.message
    });
  }
};

