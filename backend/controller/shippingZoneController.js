// Use shared database service instead of creating new PrismaClient
const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

/**
 * Shipping Zone Controller
 * Handles shipping zones with governorate name variations for AI matching
 */

// Get all shipping zones for a company
const getShippingZones = async (req, res) => {
  try {
    const { companyId } = req.user;

    const zones = await getSharedPrismaClient().shippingZone.findMany({
      where: { companyId },
      orderBy: [
        { isActive: 'desc' },
        { price: 'asc' }
      ]
    });

    res.json({
      success: true,
      data: zones
    });
  } catch (error) {
    console.error('Error fetching shipping zones:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ZONES_ERROR',
        message: 'فشل في تحميل مناطق الشحن',
        details: error.message
      }
    });
  }
};

// Get single shipping zone by ID
const getShippingZoneById = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.user;

    const zone = await getSharedPrismaClient().shippingZone.findFirst({
      where: {
        id,
        companyId
      }
    });

    if (!zone) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ZONE_NOT_FOUND',
          message: 'منطقة الشحن غير موجودة'
        }
      });
    }

    res.json({
      success: true,
      data: zone
    });
  } catch (error) {
    console.error('Error fetching shipping zone:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ZONE_ERROR',
        message: 'فشل في تحميل منطقة الشحن',
        details: error.message
      }
    });
  }
};

// Create new shipping zone
const createShippingZone = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { 
      name,
      governorateIds,
      governorates, 
      pricingType,
      price, 
      pricingTiers,
      deliveryTime,
      deliveryTimeType,
      freeShippingThreshold,
      isActive 
    } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'يرجى إدخال اسم المنطقة'
        }
      });
    }

    if (!governorates || !Array.isArray(governorates) || governorates.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'يرجى إضافة محافظة واحدة على الأقل'
        }
      });
    }

    const finalPricingType = pricingType || 'flat';

    if (finalPricingType === 'flat' && (!price || price <= 0)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'يرجى إدخال سعر صحيح'
        }
      });
    }

    if (finalPricingType === 'tiered' && (!pricingTiers || !Array.isArray(pricingTiers) || pricingTiers.length === 0)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'يرجى إضافة شريحة سعر واحدة على الأقل'
        }
      });
    }

    if (!deliveryTime) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'يرجى إدخال مدة التوصيل'
        }
      });
    }

    const zone = await getSharedPrismaClient().shippingZone.create({
      data: {
        name: name.trim(),
        governorateIds: governorateIds || [],
        governorates: governorates,
        pricingType: finalPricingType,
        price: price ? parseFloat(price) : 0,
        pricingTiers: pricingTiers || [],
        deliveryTime,
        deliveryTimeType: deliveryTimeType || 'custom',
        freeShippingThreshold: freeShippingThreshold ? parseFloat(freeShippingThreshold) : null,
        isActive: isActive !== undefined ? isActive : true,
        companyId
      }
    });

    res.status(201).json({
      success: true,
      data: zone,
      message: 'تم إضافة منطقة الشحن بنجاح'
    });
  } catch (error) {
    console.error('Error creating shipping zone:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_ZONE_ERROR',
        message: 'فشل في إضافة منطقة الشحن',
        details: error.message
      }
    });
  }
};

// Update shipping zone
const updateShippingZone = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.user;
    const { 
      name,
      governorateIds,
      governorates, 
      pricingType,
      price, 
      pricingTiers,
      deliveryTime,
      deliveryTimeType,
      freeShippingThreshold,
      isActive 
    } = req.body;

    // Check if zone exists and belongs to company
    const existingZone = await getSharedPrismaClient().shippingZone.findFirst({
      where: {
        id,
        companyId
      }
    });

    if (!existingZone) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ZONE_NOT_FOUND',
          message: 'منطقة الشحن غير موجودة'
        }
      });
    }

    // Validation
    if (name !== undefined && !name.trim()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'يرجى إدخال اسم المنطقة'
        }
      });
    }

    if (governorates !== undefined && (!Array.isArray(governorates) || governorates.length === 0)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'يرجى إضافة محافظة واحدة على الأقل'
        }
      });
    }

    const finalPricingType = pricingType || existingZone.pricingType || 'flat';

    if (finalPricingType === 'flat' && price !== undefined && (!price || price <= 0)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'يرجى إدخال سعر صحيح'
        }
      });
    }

    if (finalPricingType === 'tiered' && pricingTiers !== undefined && (!Array.isArray(pricingTiers) || pricingTiers.length === 0)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'يرجى إضافة شريحة سعر واحدة على الأقل'
        }
      });
    }

    if (deliveryTime !== undefined && !deliveryTime) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'يرجى إدخال مدة التوصيل'
        }
      });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (governorateIds !== undefined) updateData.governorateIds = governorateIds;
    if (governorates !== undefined) updateData.governorates = governorates;
    if (pricingType !== undefined) updateData.pricingType = pricingType;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (pricingTiers !== undefined) updateData.pricingTiers = pricingTiers;
    if (deliveryTime !== undefined) updateData.deliveryTime = deliveryTime;
    if (deliveryTimeType !== undefined) updateData.deliveryTimeType = deliveryTimeType;
    if (freeShippingThreshold !== undefined) {
      updateData.freeShippingThreshold = freeShippingThreshold ? parseFloat(freeShippingThreshold) : null;
    }
    if (isActive !== undefined) updateData.isActive = isActive;

    const zone = await getSharedPrismaClient().shippingZone.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      data: zone,
      message: 'تم تحديث منطقة الشحن بنجاح'
    });
  } catch (error) {
    console.error('Error updating shipping zone:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ZONE_ERROR',
        message: 'فشل في تحديث منطقة الشحن',
        details: error.message
      }
    });
  }
};

// Delete shipping zone
const deleteShippingZone = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.user;

    // Check if zone exists and belongs to company
    const existingZone = await getSharedPrismaClient().shippingZone.findFirst({
      where: {
        id,
        companyId
      }
    });

    if (!existingZone) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ZONE_NOT_FOUND',
          message: 'منطقة الشحن غير موجودة'
        }
      });
    }

    await getSharedPrismaClient().shippingZone.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'تم حذف منطقة الشحن بنجاح'
    });
  } catch (error) {
    console.error('Error deleting shipping zone:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_ZONE_ERROR',
        message: 'فشل في حذف منطقة الشحن',
        details: error.message
      }
    });
  }
};

// Toggle shipping zone active status
const toggleZoneStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.user;

    const zone = await getSharedPrismaClient().shippingZone.findFirst({
      where: {
        id,
        companyId
      }
    });

    if (!zone) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ZONE_NOT_FOUND',
          message: 'منطقة الشحن غير موجودة'
        }
      });
    }

    const updatedZone = await getSharedPrismaClient().shippingZone.update({
      where: { id },
      data: {
        isActive: !zone.isActive
      }
    });

    res.json({
      success: true,
      data: updatedZone,
      message: `تم ${updatedZone.isActive ? 'تفعيل' : 'تعطيل'} منطقة الشحن بنجاح`
    });
  } catch (error) {
    console.error('Error toggling zone status:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TOGGLE_STATUS_ERROR',
        message: 'فشل في تغيير حالة منطقة الشحن',
        details: error.message
      }
    });
  }
};

// Find shipping price for a governorate (used by AI)
const findShippingPrice = async (req, res) => {
  try {
    const { companyId } = req.user || {};
    const { governorate } = req.query;

    console.log('[findShippingPrice] Request:', { companyId, governorate });

    if (!companyId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'غير مصرح - لم يتم العثور على معرف الشركة'
        }
      });
    }

    if (!governorate) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'يرجى تحديد المحافظة'
        }
      });
    }

    const normalizedInput = governorate.trim().toLowerCase();

    // Get all active zones for the company
    const zones = await getSharedPrismaClient().shippingZone.findMany({
      where: {
        companyId,
        isActive: true
      }
    });
    
    console.log('[findShippingPrice] Found zones:', zones.length);

    // Find matching zone
    const matchedZone = zones.find(zone => {
      let governorates = zone.governorates;
      
      // Handle case where governorates might be a JSON string
      if (typeof governorates === 'string') {
        try {
          governorates = JSON.parse(governorates.trim());
        } catch (e) {
          console.error('[findShippingPrice] Failed to parse governorates:', e, 'Raw value:', governorates);
          return false;
        }
      }
      
      // Ensure governorates is an array
      if (!Array.isArray(governorates)) {
        console.error('[findShippingPrice] governorates is not an array:', typeof governorates);
        return false;
      }
      
      return governorates.some(gov => 
        gov.toLowerCase().trim() === normalizedInput
      );
    });

    if (matchedZone) {
      return res.json({
        success: true,
        data: {
          zoneId: matchedZone.id,
          price: parseFloat(matchedZone.price),
          deliveryTime: matchedZone.deliveryTime,
          governorate: matchedZone.governorates[0]
        }
      });
    }

    // No matching zone found
    res.json({
      success: true,
      data: {
        zoneId: null,
        price: 0,
        deliveryTime: 'غير محدد',
        governorate: null
      },
      message: 'لم يتم العثور على منطقة شحن مطابقة'
    });
  } catch (error) {
    console.error('Error finding shipping price:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FIND_PRICE_ERROR',
        message: 'فشل في البحث عن سعر الشحن',
        details: error.message
      }
    });
  }
};

// Get active shipping zones only
const getActiveShippingZones = async (req, res) => {
  try {
    const { companyId } = req.user;

    const zones = await getSharedPrismaClient().shippingZone.findMany({
      where: {
        companyId,
        isActive: true
      },
      orderBy: {
        price: 'asc'
      }
    });

    res.json({
      success: true,
      data: zones
    });
  } catch (error) {
    console.error('Error fetching active shipping zones:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ACTIVE_ZONES_ERROR',
        message: 'فشل في تحميل مناطق الشحن النشطة',
        details: error.message
      }
    });
  }
};

// Calculate shipping cost for public storefront (no authentication)
const calculatePublicShippingCost = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { governorate } = req.query;

    console.log('[calculatePublicShippingCost] Request:', { companyId, governorate });

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'معرف الشركة مطلوب'
        }
      });
    }

    if (!governorate) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'يرجى تحديد المحافظة'
        }
      });
    }

    const normalizedInput = governorate.trim().toLowerCase();

    // Get all active zones for the company
    const zones = await getSharedPrismaClient().shippingZone.findMany({
      where: {
        companyId,
        isActive: true
      }
    });
    
    console.log('[calculatePublicShippingCost] Found zones:', zones.length);

    // Find matching zone
    const matchedZone = zones.find(zone => {
      let governorates = zone.governorates;
      
      // Handle case where governorates might be a JSON string
      if (typeof governorates === 'string') {
        try {
          governorates = JSON.parse(governorates.trim());
        } catch (e) {
          console.error('[calculatePublicShippingCost] Failed to parse governorates:', e);
          return false;
        }
      }
      
      // Ensure governorates is an array
      if (!Array.isArray(governorates)) {
        console.error('[calculatePublicShippingCost] governorates is not an array:', typeof governorates);
        return false;
      }
      
      return governorates.some(gov => 
        gov.toLowerCase().trim() === normalizedInput
      );
    });

    if (matchedZone) {
      return res.json({
        success: true,
        data: {
          zoneId: matchedZone.id,
          price: parseFloat(matchedZone.price),
          deliveryTime: matchedZone.deliveryTime,
          governorate: matchedZone.governorates[0]
        }
      });
    }

    // No matching zone found - return 0 instead of error
    res.json({
      success: true,
      data: {
        zoneId: null,
        price: 0,
        deliveryTime: 'غير محدد',
        governorate: null
      },
      message: 'لم يتم العثور على منطقة شحن مطابقة'
    });
  } catch (error) {
    console.error('Error calculating public shipping cost:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CALCULATE_COST_ERROR',
        message: 'فشل في حساب تكلفة الشحن',
        details: error.message
      }
    });
  }
};

module.exports = {
  getShippingZones,
  getShippingZoneById,
  createShippingZone,
  updateShippingZone,
  deleteShippingZone,
  toggleZoneStatus,
  findShippingPrice,
  getActiveShippingZones,
  calculatePublicShippingCost
};

