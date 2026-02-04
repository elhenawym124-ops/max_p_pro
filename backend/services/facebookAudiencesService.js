/**
 * Facebook Audiences Service
 * 
 * Service للتعامل مع Facebook Custom Audiences و Lookalike Audiences
 */

const axios = require('axios');
const crypto = require('crypto');
const { getSharedPrismaClient } = require('./sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

class FacebookAudiencesService {
  constructor(accessToken, adAccountId = null) {
    this.accessToken = accessToken;
    this.adAccountId = adAccountId;
    this.apiVersion = 'v22.0'; // ✅ Updated to v22.0
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
  }

  /**
   * ============================================
   * Custom Audiences Methods
   * ============================================
   */

  /**
   * إنشاء Custom Audience من قائمة عملاء (Customer List)
   */
  async createCustomerListAudience(data) {
    try {
      const {
        name,
        description,
        customerList, // Array of {email, phone, firstName, lastName}
        adAccountId = this.adAccountId
      } = data;

      if (!adAccountId) {
        throw new Error('Ad Account ID is required');
      }

      // تحضير البيانات للـ Facebook (Hash)
      const schema = ['EMAIL', 'PHONE', 'FN', 'LN'];
      const formattedData = customerList.map(customer => [
        this.hashData(customer.email || ''),
        this.hashData(customer.phone || ''),
        this.hashData(customer.firstName || ''),
        this.hashData(customer.lastName || '')
      ]);

      // إنشاء Custom Audience
      const accountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
      
      const response = await axios.post(
        `${this.baseUrl}/${accountId}/customaudiences`,
        {
          name,
          description,
          subtype: 'CUSTOM',
          customer_file_source: 'USER_PROVIDED_ONLY'
        },
        {
          params: {
            access_token: this.accessToken
          }
        }
      );

      const audienceId = response.data.id;

      // رفع بيانات العملاء
      await this.addUsersToAudience(audienceId, formattedData, schema);

      return {
        success: true,
        audienceId: audienceId,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error creating customer list audience:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * إنشاء Website Custom Audience (Pixel-based)
   */
  async createWebsiteAudience(data) {
    try {
      const {
        name,
        description,
        pixelId,
        eventType = 'ALL_VISITORS',
        retentionDays = 30,
        adAccountId = this.adAccountId
      } = data;

      if (!adAccountId || !pixelId) {
        throw new Error('Ad Account ID and Pixel ID are required');
      }

      const accountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;

      const response = await axios.post(
        `${this.baseUrl}/${accountId}/customaudiences`,
        {
          name,
          description,
          subtype: 'WEBSITE',
          pixel_id: pixelId,
          retention_days: retentionDays,
          rule: {
            event: {
              i_contains: eventType // ALL_VISITORS, PURCHASE, ADD_TO_CART, etc.
            }
          }
        },
        {
          params: {
            access_token: this.accessToken
          }
        }
      );

      return {
        success: true,
        audienceId: response.data.id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error creating website audience:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * إنشاء Engagement Custom Audience
   */
  async createEngagementAudience(data) {
    try {
      const {
        name,
        description,
        engagementType, // PAGE_LIKES, POST_ENGAGEMENT, etc.
        adAccountId = this.adAccountId
      } = data;

      if (!adAccountId) {
        throw new Error('Ad Account ID is required');
      }

      const accountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;

      const response = await axios.post(
        `${this.baseUrl}/${accountId}/customaudiences`,
        {
          name,
          description,
          subtype: 'ENGAGEMENT',
          engagement_type: engagementType
        },
        {
          params: {
            access_token: this.accessToken
          }
        }
      );

      return {
        success: true,
        audienceId: response.data.id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error creating engagement audience:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * جلب جميع Custom Audiences
   */
  async getCustomAudiences(adAccountId = null) {
    try {
      const accountId = (adAccountId || this.adAccountId)?.startsWith('act_') 
        ? (adAccountId || this.adAccountId) 
        : `act_${adAccountId || this.adAccountId}`;

      const response = await axios.get(
        `${this.baseUrl}/${accountId}/customaudiences`,
        {
          params: {
            access_token: this.accessToken,
            fields: 'id,name,description,subtype,approximate_count,time_created,time_updated'
          }
        }
      );

      return {
        success: true,
        data: response.data.data || []
      };
    } catch (error) {
      console.error('❌ Error getting custom audiences:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * جلب معلومات Custom Audience
   */
  async getCustomAudience(audienceId, fields = ['id', 'name', 'description', 'approximate_count']) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${audienceId}`,
        {
          params: {
            access_token: this.accessToken,
            fields: fields.join(',')
          }
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error getting custom audience:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * تحديث Custom Audience
   */
  async updateCustomAudience(audienceId, data) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/${audienceId}`,
        data,
        {
          params: {
            access_token: this.accessToken
          }
        }
      );

      return {
        success: response.data.success || true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error updating custom audience:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * حذف Custom Audience
   */
  async deleteCustomAudience(audienceId) {
    try {
      const response = await axios.delete(
        `${this.baseUrl}/${audienceId}`,
        {
          params: {
            access_token: this.accessToken
          }
        }
      );

      return {
        success: response.data.success || true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error deleting custom audience:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * إضافة مستخدمين إلى Custom Audience
   */
  async addUsersToAudience(audienceId, usersData, schema) {
    try {
      // Facebook يتطلب تقسيم البيانات إلى batches من 10000 سجل
      const batchSize = 10000;
      const batches = [];
      
      for (let i = 0; i < usersData.length; i += batchSize) {
        batches.push(usersData.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        const payload = batch.map(row => row.join(',')).join('\n');
        
        const formData = new URLSearchParams();
        formData.append('payload', payload);
        formData.append('schema', schema.join(','));

        await axios.post(
          `${this.baseUrl}/${audienceId}/users`,
          formData.toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            params: {
              access_token: this.accessToken
            }
          }
        );
      }

      return {
        success: true
      };
    } catch (error) {
      console.error('❌ Error adding users to audience:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * ============================================
   * Lookalike Audiences Methods
   * ============================================
   */

  /**
   * إنشاء Lookalike Audience
   */
  async createLookalikeAudience(data) {
    try {
      const {
        name,
        description,
        sourceAudienceId, // Facebook Custom Audience ID
        country,
        ratio = 1, // 1-10%
        adAccountId = this.adAccountId
      } = data;

      if (!adAccountId || !sourceAudienceId || !country) {
        throw new Error('Ad Account ID, Source Audience ID, and Country are required');
      }

      const accountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;

      const response = await axios.post(
        `${this.baseUrl}/${accountId}/customaudiences`,
        {
          name,
          description,
          subtype: 'LOOKALIKE',
          lookalike_spec: {
            origin_audience_id: sourceAudienceId,
            country,
            ratio
          }
        },
        {
          params: {
            access_token: this.accessToken
          }
        }
      );

      return {
        success: true,
        audienceId: response.data.id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error creating lookalike audience:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * جلب جميع Lookalike Audiences
   */
  async getLookalikeAudiences(adAccountId = null) {
    try {
      const accountId = (adAccountId || this.adAccountId)?.startsWith('act_') 
        ? (adAccountId || this.adAccountId) 
        : `act_${adAccountId || this.adAccountId}`;

      const response = await axios.get(
        `${this.baseUrl}/${accountId}/customaudiences`,
        {
          params: {
            access_token: this.accessToken,
            fields: 'id,name,description,subtype,approximate_count,lookalike_spec',
            subtype: 'LOOKALIKE'
          }
        }
      );

      return {
        success: true,
        data: response.data.data || []
      };
    } catch (error) {
      console.error('❌ Error getting lookalike audiences:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * ============================================
   * Helper Methods
   * ============================================
   */

  /**
   * Hash البيانات حسب متطلبات Facebook
   */
  hashData(data) {
    if (!data) return '';
    return crypto.createHash('sha256').update(data.toLowerCase().trim()).digest('hex');
  }

  /**
   * جلب معلومات Audience Size
   */
  async getAudienceSize(audienceId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${audienceId}`,
        {
          params: {
            access_token: this.accessToken,
            fields: 'approximate_count'
          }
        }
      );

      return {
        success: true,
        size: response.data.approximate_count || 0
      };
    } catch (error) {
      return {
        success: false,
        size: 0
      };
    }
  }
}

module.exports = FacebookAudiencesService;


