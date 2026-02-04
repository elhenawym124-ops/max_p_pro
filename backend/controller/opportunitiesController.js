const { getSharedPrismaClient } = require('../services/sharedDatabase');

// Mock data for opportunities (since there's no Opportunity model in Prisma schema)
const mockOpportunities = [
  {
    id: '1',
    title: 'فرصة بيع منتجات تقنية',
    customerId: '1',
    customerName: 'أحمد محمد',
    value: 15000,
    currency: 'EGP',
    stage: 'QUALIFIED',
    probability: 75,
    expectedCloseDate: '2024-02-15',
    source: 'facebook',
    assignedTo: '1',
    assignedToName: 'مدير المبيعات',
    description: 'فرصة لبيع مجموعة من المنتجات التقنية للعميل',
    products: [
      { id: '1', name: 'لابتوب Dell', quantity: 2, price: 5000 },
      { id: '2', name: 'ماوس Logitech', quantity: 5, price: 1000 }
    ],
    activities: [
      { id: '1', type: 'call', description: 'مكالمة مع العميل', date: '2024-01-15', userId: '1' },
      { id: '2', type: 'email', description: 'إرسال عرض سعر', date: '2024-01-20', userId: '1' }
    ],
    tags: ['تقنية', 'مربح'],
    createdAt: '2024-01-10',
    updatedAt: '2024-01-20'
  },
  {
    id: '2',
    title: 'عقد خدمات استشارية',
    customerId: '2',
    customerName: 'شركة التسويق المتقدم',
    value: 25000,
    currency: 'EGP',
    stage: 'PROPOSAL',
    probability: 60,
    expectedCloseDate: '2024-03-01',
    source: 'website',
    assignedTo: '1',
    assignedToName: 'مدير المبيعات',
    description: 'عقد تقديم خدمات استشارية في التسويق الرقمي',
    products: [],
    activities: [
      { id: '3', type: 'meeting', description: 'اجتماع تعريفي', date: '2024-01-12', userId: '1' }
    ],
    tags: ['استشارات', 'تسويق'],
    createdAt: '2024-01-08',
    updatedAt: '2024-01-18'
  },
  {
    id: '3',
    title: 'بيع منتجات منزلية',
    customerId: '3',
    customerName: 'فاطمة علي',
    value: 8000,
    currency: 'EGP',
    stage: 'NEGOTIATION',
    probability: 80,
    expectedCloseDate: '2024-02-28',
    source: 'referral',
    assignedTo: '1',
    assignedToName: 'مدير المبيعات',
    description: 'مجموعة من المنتجات المنزلية والديكور',
    products: [
      { id: '3', name: 'طقم أدوات مطبخ', quantity: 1, price: 3000 },
      { id: '4', name: 'مفروشات غرفة معيشة', quantity: 1, price: 5000 }
    ],
    activities: [
      { id: '4', type: 'visit', description: 'زيارة المنزل', date: '2024-01-25', userId: '1' }
    ],
    tags: ['منزلية', 'ديكور'],
    createdAt: '2024-01-05',
    updatedAt: '2024-01-25'
  }
];

const stages = {
  LEAD: { name: 'عميل محتمل', color: 'bg-gray-100 text-gray-800' },
  QUALIFIED: { name: 'مؤهل', color: 'bg-blue-100 text-blue-800' },
  PROPOSAL: { name: 'عرض سعر', color: 'bg-yellow-100 text-yellow-800' },
  NEGOTIATION: { name: 'تفاوض', color: 'bg-orange-100 text-orange-800' },
  CLOSED_WON: { name: 'مغلق - فوز', color: 'bg-green-100 text-green-800' },
  CLOSED_LOST: { name: 'مغلق - خسارة', color: 'bg-red-100 text-red-800' },
};

/**
 * Get all opportunities with optional filtering
 */
const getAllOpportunities = async (req, res) => {
  try {
    //console.log('📊 [OPPORTUNITIES] Fetching opportunities list...');
    
    const { stage, source, assignedTo } = req.query;
    let filteredOpportunities = [...mockOpportunities];

    // Apply filters
    if (stage) {
      filteredOpportunities = filteredOpportunities.filter(opp => opp.stage === stage);
    }
    if (source) {
      filteredOpportunities = filteredOpportunities.filter(opp => opp.source === source);
    }
    if (assignedTo) {
      filteredOpportunities = filteredOpportunities.filter(opp => opp.assignedTo === assignedTo);
    }

    //console.log(`✅ [OPPORTUNITIES] Found ${filteredOpportunities.length} opportunities`);

    res.json({
      success: true,
      data: filteredOpportunities,
      total: filteredOpportunities.length,
      message: 'تم جلب الفرص التجارية بنجاح'
    });

  } catch (error) {
    console.error('❌ [OPPORTUNITIES] Error fetching opportunities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch opportunities',
      message: 'فشل في جلب الفرص التجارية'
    });
  }
};

/**
 * Get pipeline statistics
 */
const getPipelineStats = async (req, res) => {
  try {
    //console.log('📈 [OPPORTUNITIES] Calculating pipeline statistics...');

    const pipelineStats = {
      stages: {},
      totals: {
        count: mockOpportunities.length,
        value: 0,
        weightedValue: 0,
        averageValue: 0
      }
    };

    // Initialize stages
    Object.keys(stages).forEach(stageKey => {
      pipelineStats.stages[stageKey] = {
        count: 0,
        value: 0,
        opportunities: []
      };
    });

    // Process opportunities
    mockOpportunities.forEach(opp => {
      const stage = opp.stage;
      
      // Add to stage stats
      if (pipelineStats.stages[stage]) {
        pipelineStats.stages[stage].count++;
        pipelineStats.stages[stage].value += opp.value;
        pipelineStats.stages[stage].opportunities.push(opp);
      }

      // Add to totals
      pipelineStats.totals.value += opp.value;
      pipelineStats.totals.weightedValue += (opp.value * opp.probability / 100);
    });

    // Calculate average
    if (pipelineStats.totals.count > 0) {
      pipelineStats.totals.averageValue = pipelineStats.totals.value / pipelineStats.totals.count;
    }

    //console.log('✅ [OPPORTUNITIES] Pipeline statistics calculated successfully');

    res.json({
      success: true,
      data: pipelineStats,
      message: 'تم حساب إحصائيات المسار بنجاح'
    });

  } catch (error) {
    console.error('❌ [OPPORTUNITIES] Error calculating pipeline stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate pipeline statistics',
      message: 'فشل في حساب إحصائيات المسار'
    });
  }
};

/**
 * Update opportunity stage
 */
const updateOpportunityStage = async (req, res) => {
  try {
    const { id } = req.params;
    const { stage } = req.body;

    //console.log(`🔄 [OPPORTUNITIES] Updating opportunity ${id} stage to ${stage}`);

    // Find opportunity in mock data
    const opportunityIndex = mockOpportunities.findIndex(opp => opp.id === id);
    
    if (opportunityIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Opportunity not found',
        message: 'الفرصة التجارية غير موجودة'
      });
    }

    // Validate stage
    if (!stages[stage]) {
      return res.status(400).json({
        success: false,
        error: 'Invalid stage',
        message: 'مرحلة غير صحيحة'
      });
    }

    // Update opportunity
    mockOpportunities[opportunityIndex].stage = stage;
    mockOpportunities[opportunityIndex].updatedAt = new Date().toISOString();

    //console.log(`✅ [OPPORTUNITIES] Opportunity ${id} updated successfully`);

    res.json({
      success: true,
      data: mockOpportunities[opportunityIndex],
      message: 'تم تحديث مرحلة الفرصة بنجاح'
    });

  } catch (error) {
    console.error('❌ [OPPORTUNITIES] Error updating opportunity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update opportunity',
      message: 'فشل في تحديث الفرصة التجارية'
    });
  }
};

/**
 * Get single opportunity by ID
 */
const getOpportunityById = async (req, res) => {
  try {
    const { id } = req.params;
    
    //console.log(`🔍 [OPPORTUNITIES] Fetching opportunity ${id}`);

    const opportunity = mockOpportunities.find(opp => opp.id === id);
    
    if (!opportunity) {
      return res.status(404).json({
        success: false,
        error: 'Opportunity not found',
        message: 'الفرصة التجارية غير موجودة'
      });
    }

    //console.log(`✅ [OPPORTUNITIES] Opportunity ${id} found`);

    res.json({
      success: true,
      data: opportunity,
      message: 'تم جلب الفرصة التجارية بنجاح'
    });

  } catch (error) {
    console.error('❌ [OPPORTUNITIES] Error fetching opportunity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch opportunity',
      message: 'فشل في جلب الفرصة التجارية'
    });
  }
};

module.exports = {
  getAllOpportunities,
  getPipelineStats,
  updateOpportunityStage,
  getOpportunityById
};