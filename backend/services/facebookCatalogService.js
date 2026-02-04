/**
 * Facebook Catalog Service
 * 
 * Service للتعامل مع Facebook Product Catalog API
 * يسمح بإنشاء وإدارة Product Catalogs و Dynamic Ads
 */

const axios = require('axios');
const crypto = require('crypto');
const { getSharedPrismaClient } = require('./sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

class FacebookCatalogService {
  constructor(accessToken, adAccountId = null) {
    this.accessToken = accessToken;
    this.adAccountId = adAccountId;
    this.apiVersion = 'v22.0'; // ✅ Updated to v22.0
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
  }

  /**
   * ============================================
   * Product Catalog Methods
   * ============================================
   */

  /**
   * إنشاء Product Catalog جديد
   */
  async createCatalog(data) {
    try {
      const {
        name,
        businessId, // Facebook Business ID
        catalogType = 'PRODUCTS'
      } = data;

      if (!businessId) {
        throw new Error('Business ID is required');
      }

      const response = await axios.post(
        `${this.baseUrl}/${businessId}/owned_product_catalogs`,
        {
          name,
          vertical: catalogType === 'PRODUCTS' ? 'commerce' : catalogType.toLowerCase()
        },
        {
          params: {
            access_token: this.accessToken
          }
        }
      );

      return {
        success: true,
        catalogId: response.data.id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error creating Facebook catalog:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * جلب Product Catalog
   */
  async getCatalog(catalogId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${catalogId}`,
        {
          params: {
            access_token: this.accessToken,
            fields: 'id,name,vertical,product_count,is_catalog_segment'
          }
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error fetching Facebook catalog:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * جلب جميع Catalogs للـ Business
   */
  async getCatalogs(businessId) {
    try {
      if (!businessId) {
        throw new Error('Business ID is required');
      }

      const response = await axios.get(
        `${this.baseUrl}/${businessId}/owned_product_catalogs`,
        {
          params: {
            access_token: this.accessToken,
            fields: 'id,name,vertical,product_count,is_catalog_segment'
          }
        }
      );

      return {
        success: true,
        data: response.data.data || []
      };
    } catch (error) {
      console.error('❌ Error fetching Facebook catalogs:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * تحديث Product Catalog
   */
  async updateCatalog(catalogId, data) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/${catalogId}`,
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
      console.error('❌ Error updating Facebook catalog:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * حذف Product Catalog
   */
  async deleteCatalog(catalogId) {
    try {
      const response = await axios.delete(
        `${this.baseUrl}/${catalogId}`,
        {
          params: {
            access_token: this.accessToken
          }
        }
      );

      return {
        success: response.data.success || true
      };
    } catch (error) {
      console.error('❌ Error deleting Facebook catalog:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * ============================================
   * Product Feed Methods
   * ============================================
   */

  /**
   * إنشاء Product Feed
   */
  async createFeed(catalogId, data) {
    try {
      const {
        name,
        schedule = 'HOURLY',
        feedUrl,
        format = 'CSV'
      } = data;

      const response = await axios.post(
        `${this.baseUrl}/${catalogId}/product_feeds`,
        {
          name,
          schedule,
          update_schedule: schedule,
          ...(feedUrl && { file_url: feedUrl }),
          ...(format && { format })
        },
        {
          params: {
            access_token: this.accessToken
          }
        }
      );

      return {
        success: true,
        feedId: response.data.id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error creating Facebook product feed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * جلب Product Feeds للـ Catalog
   */
  async getFeeds(catalogId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${catalogId}/product_feeds`,
        {
          params: {
            access_token: this.accessToken,
            fields: 'id,name,schedule,file_url,update_schedule,format'
          }
        }
      );

      return {
        success: true,
        data: response.data.data || []
      };
    } catch (error) {
      console.error('❌ Error fetching Facebook product feeds:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * ============================================
   * Product Methods (Catalog Products)
   * ============================================
   */

  /**
   * إضافة/تحديث منتج في Catalog
   */
  async uploadProduct(catalogId, productData) {
    try {
      const {
        name,
        description,
        imageUrl,
        linkUrl,
        brand,
        category,
        price,
        currency = 'USD',
        availability = 'in stock',
        retailerId, // SKU or unique identifier
        additionalImages = []
      } = productData;

      // تحضير البيانات للمنتج
      const product = {
        name,
        description,
        image_url: imageUrl,
        url: linkUrl,
        availability: availability,
        price: `${price} ${currency}`,
        currency: currency,
        retailer_id: retailerId || crypto.randomUUID(),
        ...(brand && { brand }),
        ...(category && { category }),
        ...(additionalImages.length > 0 && { additional_image_urls: additionalImages })
      };

      const response = await axios.post(
        `${this.baseUrl}/${catalogId}/products`,
        product,
        {
          params: {
            access_token: this.accessToken
          }
        }
      );

      return {
        success: true,
        productId: response.data.id || response.data.product_id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error uploading product to catalog:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * رفع منتجات متعددة (Batch)
   */
  async uploadProductsBatch(catalogId, products) {
    try {
      const results = [];
      const batchSize = 50; // Facebook allows up to 50 products per batch

      for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);
        
        const batchData = batch.map(product => {
          const {
            name,
            description,
            imageUrl,
            linkUrl,
            brand,
            category,
            price,
            currency = 'USD',
            availability = 'in stock',
            retailerId,
            additionalImages = []
          } = product;

          return {
            method: 'CREATE',
            retailer_id: retailerId || crypto.randomUUID(),
            data: {
              name,
              description,
              image_url: imageUrl,
              url: linkUrl,
              availability: availability,
              price: `${price} ${currency}`,
              currency: currency,
              ...(brand && { brand }),
              ...(category && { category }),
              ...(additionalImages.length > 0 && { additional_image_urls: additionalImages })
            }
          };
        });

        const response = await axios.post(
          `${this.baseUrl}/${catalogId}/product_feeds`,
          {
            name: `Batch Upload ${Date.now()}`,
            update_method: 'BATCH_API',
            items: batchData
          },
          {
            params: {
              access_token: this.accessToken
            }
          }
        );

        results.push({
          success: true,
          batchId: response.data.id,
          count: batch.length
        });
      }

      return {
        success: true,
        batches: results,
        totalProducts: products.length
      };
    } catch (error) {
      console.error('❌ Error uploading products batch:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * جلب منتج من Catalog
   */
  async getProduct(catalogId, productId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${productId}`,
        {
          params: {
            access_token: this.accessToken,
            fields: 'id,name,description,image_url,url,availability,price,currency,brand,category,retailer_id'
          }
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error fetching product from catalog:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * جلب جميع المنتجات من Catalog
   */
  async getProducts(catalogId, limit = 100) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${catalogId}/products`,
        {
          params: {
            access_token: this.accessToken,
            fields: 'id,name,description,image_url,url,availability,price,currency,brand,category,retailer_id',
            limit
          }
        }
      );

      return {
        success: true,
        data: response.data.data || [],
        paging: response.data.paging || null
      };
    } catch (error) {
      console.error('❌ Error fetching products from catalog:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * حذف منتج من Catalog
   */
  async deleteProduct(catalogId, productId) {
    try {
      const response = await axios.delete(
        `${this.baseUrl}/${productId}`,
        {
          params: {
            access_token: this.accessToken
          }
        }
      );

      return {
        success: response.data.success || true
      };
    } catch (error) {
      console.error('❌ Error deleting product from catalog:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * ============================================
   * Product Set Methods
   * ============================================
   */

  /**
   * إنشاء Product Set (مجموعة منتجات للاستهداف)
   */
  async createProductSet(catalogId, data) {
    try {
      const {
        name,
        productIds = [], // Array of product IDs or retailer IDs
        filter = {} // Filter criteria
      } = data;

      const productSetData = {
        name,
        ...(productIds.length > 0 && { product_ids: productIds })
      };

      // Add filter if provided
      if (Object.keys(filter).length > 0) {
        productSetData.filter = filter;
      }

      const response = await axios.post(
        `${this.baseUrl}/${catalogId}/product_sets`,
        productSetData,
        {
          params: {
            access_token: this.accessToken
          }
        }
      );

      return {
        success: true,
        productSetId: response.data.id,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error creating product set:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * جلب Product Sets للـ Catalog
   */
  async getProductSets(catalogId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${catalogId}/product_sets`,
        {
          params: {
            access_token: this.accessToken,
            fields: 'id,name,product_count'
          }
        }
      );

      return {
        success: true,
        data: response.data.data || []
      };
    } catch (error) {
      console.error('❌ Error fetching product sets:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * ============================================
   * Dynamic Ad Methods
   * ============================================
   */

  /**
   * إنشاء Dynamic Product Ad
   */
  async createDynamicAd(adSetId, data) {
    try {
      const {
        name,
        catalogId,
        productSetId,
        templateUrl,
        status = 'PAUSED',
        headline,
        description,
        callToAction = 'SHOP_NOW'
      } = data;

      // إنشاء Creative
      const creativeData = {
        product_set_id: productSetId,
        ...(templateUrl && { template_url: templateUrl }),
        ...(headline && { name: headline }),
        ...(description && { body: description }),
        call_to_action_type: callToAction
      };

      const creativeResponse = await axios.post(
        `${this.baseUrl}/${adSetId}/adcreatives`,
        creativeData,
        {
          params: {
            access_token: this.accessToken
          }
        }
      );

      if (!creativeResponse.data.id) {
        throw new Error('Failed to create creative');
      }

      // إنشاء Ad
      const adData = {
        name,
        adset_id: adSetId,
        creative: { creative_id: creativeResponse.data.id },
        status
      };

      const adResponse = await axios.post(
        `${this.baseUrl}/${adSetId}/ads`,
        adData,
        {
          params: {
            access_token: this.accessToken
          }
        }
      );

      return {
        success: true,
        adId: adResponse.data.id,
        creativeId: creativeResponse.data.id,
        data: adResponse.data
      };
    } catch (error) {
      console.error('❌ Error creating dynamic ad:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }
}

module.exports = FacebookCatalogService;


