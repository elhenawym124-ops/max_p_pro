/**
 * Facebook Ad Test Service
 * 
 * Service للتعامل مع A/B Testing للإعلانات على Facebook
 * يسمح بإنشاء وإدارة اختبارات A/B وإجراء التحليل الإحصائي
 */

const axios = require('axios');
const { getSharedPrismaClient } = require('./sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
const FacebookAdsService = require('./facebookAdsService');

class FacebookAdTestService {
  constructor(accessToken, adAccountId = null) {
    this.accessToken = accessToken;
    this.adAccountId = adAccountId;
    this.apiVersion = 'v22.0'; // ✅ Updated to v22.0
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
  }

  /**
   * ============================================
   * Statistical Analysis Methods
   * ============================================
   */

  /**
   * حساب P-value باستخدام Chi-square test
   */
  calculatePValue(variantA, variantB) {
    try {
      // Chi-square test for comparing two proportions
      const n1 = variantA.impressions || 1;
      const x1 = variantA.clicks || 0;
      const p1 = x1 / n1;

      const n2 = variantB.impressions || 1;
      const x2 = variantB.clicks || 0;
      const p2 = x2 / n2;

      // Pooled proportion
      const p = (x1 + x2) / (n1 + n2);
      const q = 1 - p;

      // Standard error
      const se = Math.sqrt(p * q * (1/n1 + 1/n2));

      // Z-score
      if (se === 0) return null;
      const z = Math.abs((p1 - p2) / se);

      // Approximate p-value using normal distribution
      // P-value for two-tailed test
      const pValue = 2 * (1 - this.cumulativeNormalDistribution(z));

      return pValue;
    } catch (error) {
      console.error('❌ Error calculating p-value:', error);
      return null;
    }
  }

  /**
   * حساب Cumulative Normal Distribution (approximation)
   */
  cumulativeNormalDistribution(z) {
    // Approximation using error function
    return 0.5 * (1 + this.erf(z / Math.sqrt(2)));
  }

  /**
   * Error function approximation
   */
  erf(x) {
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
  }

  /**
   * حساب Confidence Level
   */
  calculateConfidenceLevel(pValue) {
    if (pValue === null) return null;
    return Math.max(0, Math.min(100, (1 - pValue) * 100));
  }

  /**
   * تحديد الفائز بناءً على الأداء
   */
  determineWinner(variantA, variantB) {
    const metricA = this.calculateMetric(variantA);
    const metricB = this.calculateMetric(variantB);

    // مقارنة الأداء
    if (metricA > metricB) {
      return {
        winner: 'VARIANT_A',
        winnerId: variantA.id,
        improvement: ((metricA - metricB) / metricB * 100).toFixed(2)
      };
    } else if (metricB > metricA) {
      return {
        winner: 'VARIANT_B',
        winnerId: variantB.id,
        improvement: ((metricB - metricA) / metricA * 100).toFixed(2)
      };
    }

    return null; // No clear winner
  }

  /**
   * حساب المقياس (CTR, CPA, أو ROAS)
   */
  calculateMetric(variant) {
    // استخدام CTR كمعيار رئيسي
    if (variant.impressions > 0) {
      return variant.ctr || (variant.clicks / variant.impressions);
    }
    return 0;
  }

  /**
   * ============================================
   * Test Creation Methods
   * ============================================
   */

  /**
   * إنشاء A/B Test
   */
  async createTest(testData) {
    try {
      const {
        name,
        description,
        testType,
        campaignId,
        variants,
        trafficSplit = 50,
        minimumResults = 100,
        autoPromote = false
      } = testData;

      // التحقق من البيانات
      if (!name || !testType || !variants || variants.length < 2) {
        return {
          success: false,
          error: 'Missing required fields: name, testType, and at least 2 variants'
        };
      }

      // التحقق من Test Type
      const validTestTypes = ['CREATIVE', 'TARGETING', 'BUDGET', 'PLACEMENT'];
      if (!validTestTypes.includes(testType)) {
        return {
          success: false,
          error: `Invalid test type. Must be one of: ${validTestTypes.join(', ')}`
        };
      }

      return {
        success: true,
        data: {
          name,
          description,
          testType,
          campaignId,
          variants,
          trafficSplit,
          minimumResults,
          autoPromote
        }
      };
    } catch (error) {
      console.error('❌ Error creating test:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * إنشاء Variants بناءً على Test Type
   */
  async createVariants(testType, baseConfig, variantsData) {
    try {
      const variants = [];
      const adsService = new FacebookAdsService(this.accessToken, this.adAccountId);

      for (let i = 0; i < variantsData.length; i++) {
        const variantData = variantsData[i];
        const variantType = i === 0 ? 'VARIANT_A' : (i === 1 ? 'VARIANT_B' : `VARIANT_${String.fromCharCode(67 + i)}`);

        let adSetId = null;
        let adId = null;

        switch (testType) {
          case 'CREATIVE':
            // إنشاء Ad Set واحد و Ad مختلف لكل Variant
            if (!baseConfig.adSetId) {
              return {
                success: false,
                error: 'AdSet ID is required for CREATIVE test'
              };
            }

            // إنشاء Ad جديد لكل Variant
            const creativeResult = await adsService.createAd(baseConfig.adSetId, {
              name: `${baseConfig.name} - ${variantType}`,
              status: 'PAUSED',
              ...variantData.creative
            });

            if (creativeResult.success) {
              adId = creativeResult.adId;
            }

            break;

          case 'TARGETING':
            // إنشاء AdSet مختلف لكل Variant
            if (!baseConfig.campaignId) {
              return {
                success: false,
                error: 'Campaign ID is required for TARGETING test'
              };
            }

            const adSetResult = await adsService.createAdSet(baseConfig.campaignId, {
              name: `${baseConfig.name} - ${variantType}`,
              status: 'PAUSED',
              targeting: variantData.targeting,
              ...baseConfig.adSetConfig
            });

            if (adSetResult.success) {
              adSetId = adSetResult.adSetId;
            }

            break;

          case 'BUDGET':
            // إنشاء AdSet مع budget مختلف
            if (!baseConfig.campaignId) {
              return {
                success: false,
                error: 'Campaign ID is required for BUDGET test'
              };
            }

            const budgetResult = await adsService.createAdSet(baseConfig.campaignId, {
              name: `${baseConfig.name} - ${variantType}`,
              status: 'PAUSED',
              budgetType: variantData.budgetType,
              budgetAmount: variantData.budgetAmount,
              ...baseConfig.adSetConfig
            });

            if (budgetResult.success) {
              adSetId = budgetResult.adSetId;
            }

            break;

          default:
            return {
              success: false,
              error: `Test type ${testType} not yet implemented`
            };
        }

        variants.push({
          variantType,
          variantData: JSON.stringify(variantData),
          adSetId,
          adId
        });
      }

      return {
        success: true,
        variants
      };
    } catch (error) {
      console.error('❌ Error creating variants:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * ============================================
   * Test Management Methods
   * ============================================
   */

  /**
   * بدء Test
   */
  async startTest(testId, variants) {
    try {
      // تفعيل جميع Variants
      for (const variant of variants) {
        if (variant.adSetId) {
          await this.updateAdSetStatus(variant.adSetId, 'ACTIVE');
        }
        if (variant.adId) {
          await this.updateAdStatus(variant.adId, 'ACTIVE');
        }
      }

      return {
        success: true,
        message: 'Test started successfully'
      };
    } catch (error) {
      console.error('❌ Error starting test:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * إيقاف Test
   */
  async pauseTest(testId, variants) {
    try {
      // إيقاف جميع Variants
      for (const variant of variants) {
        if (variant.adSetId) {
          await this.updateAdSetStatus(variant.adSetId, 'PAUSED');
        }
        if (variant.adId) {
          await this.updateAdStatus(variant.adId, 'PAUSED');
        }
      }

      return {
        success: true,
        message: 'Test paused successfully'
      };
    } catch (error) {
      console.error('❌ Error pausing test:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * تحديث حالة AdSet
   */
  async updateAdSetStatus(adSetId, status) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/${adSetId}`,
        { status },
        {
          params: {
            access_token: this.accessToken
          }
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error updating AdSet status:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * تحديث حالة Ad
   */
  async updateAdStatus(adId, status) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/${adId}`,
        { status },
        {
          params: {
            access_token: this.accessToken
          }
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error updating Ad status:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * ============================================
   * Results Analysis Methods
   * ============================================
   */

  /**
   * جلب نتائج Test من Facebook
   */
  async fetchTestResults(variants) {
    try {
      const results = [];

      for (const variant of variants) {
        let insights = null;

        if (variant.adId) {
          insights = await this.getAdInsights(variant.adId);
        } else if (variant.adSetId) {
          insights = await this.getAdSetInsights(variant.adSetId);
        }

        if (insights && insights.success) {
          const data = insights.data[0] || {};
          results.push({
            variantId: variant.id,
            impressions: parseInt(data.impressions || 0),
            clicks: parseInt(data.clicks || 0),
            conversions: parseInt(data.actions?.find(a => a.action_type === 'offsite_conversion')?.value || 0),
            spend: parseFloat(data.spend || 0),
            ctr: parseFloat(data.ctr || 0),
            cpc: parseFloat(data.cpc || 0),
            cpa: parseFloat(data.cost_per_action_type?.[0]?.value || 0),
            roas: parseFloat(data.revenue || 0) / parseFloat(data.spend || 1)
          });
        }
      }

      return {
        success: true,
        results
      };
    } catch (error) {
      console.error('❌ Error fetching test results:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * جلب Insights لـ Ad
   */
  async getAdInsights(adId, dateRange = null) {
    try {
      const params = {
        access_token: this.accessToken,
        fields: 'impressions,clicks,ctr,cpc,spend,actions,cost_per_action_type,revenue'
      };

      if (dateRange) {
        params.time_range = JSON.stringify(dateRange);
      }

      const response = await axios.get(
        `${this.baseUrl}/${adId}/insights`,
        { params }
      );

      return {
        success: true,
        data: response.data.data || []
      };
    } catch (error) {
      console.error('❌ Error fetching ad insights:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * جلب Insights لـ AdSet
   */
  async getAdSetInsights(adSetId, dateRange = null) {
    try {
      const params = {
        access_token: this.accessToken,
        fields: 'impressions,clicks,ctr,cpc,spend,actions,cost_per_action_type,revenue'
      };

      if (dateRange) {
        params.time_range = JSON.stringify(dateRange);
      }

      const response = await axios.get(
        `${this.baseUrl}/${adSetId}/insights`,
        { params }
      );

      return {
        success: true,
        data: response.data.data || []
      };
    } catch (error) {
      console.error('❌ Error fetching adset insights:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * تحليل نتائج Test
   */
  async analyzeTestResults(variants) {
    try {
      if (!variants || variants.length < 2) {
        return {
          success: false,
          error: 'At least 2 variants required for analysis'
        };
      }

      // جلب النتائج من Facebook
      const resultsData = await this.fetchTestResults(variants);
      if (!resultsData.success) {
        return resultsData;
      }

      const results = resultsData.results;
      if (results.length < 2) {
        return {
          success: false,
          error: 'Insufficient data for analysis'
        };
      }

      const variantA = results[0];
      const variantB = results[1];

      // حساب P-value
      const pValue = this.calculatePValue(variantA, variantB);

      // حساب Confidence Level
      const confidenceLevel = this.calculateConfidenceLevel(pValue);

      // تحديد الفائز
      const winner = this.determineWinner(variantA, variantB);

      // التحقق من Minimum Results
      const totalImpressions = variantA.impressions + variantB.impressions;
      const minimumMet = totalImpressions >= 100; // Default minimum

      return {
        success: true,
        analysis: {
          variantA,
          variantB,
          pValue,
          confidenceLevel,
          winner,
          minimumMet,
          isSignificant: pValue !== null && pValue < 0.05, // 95% confidence
          recommendation: minimumMet && pValue !== null && pValue < 0.05 && winner
            ? `Winner: ${winner.winner} with ${winner.improvement}% improvement (${confidenceLevel.toFixed(1)}% confidence)`
            : 'Need more data or no significant difference'
        }
      };
    } catch (error) {
      console.error('❌ Error analyzing test results:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * تعزيز الفائز (Promote Winner)
   */
  async promoteWinner(winnerVariant, loserVariants) {
    try {
      // إيقاف Variants الخاسرة
      for (const variant of loserVariants) {
        if (variant.adSetId) {
          await this.updateAdSetStatus(variant.adSetId, 'PAUSED');
        }
        if (variant.adId) {
          await this.updateAdStatus(variant.adId, 'PAUSED');
        }
      }

      // التأكد من أن الفائز نشط
      if (winnerVariant.adSetId) {
        await this.updateAdSetStatus(winnerVariant.adSetId, 'ACTIVE');
      }
      if (winnerVariant.adId) {
        await this.updateAdStatus(winnerVariant.adId, 'ACTIVE');
      }

      return {
        success: true,
        message: 'Winner promoted successfully'
      };
    } catch (error) {
      console.error('❌ Error promoting winner:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = FacebookAdTestService;


