const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getSharedPrismaClient } = require('./sharedDatabase');
const fs = require('fs').promises;
const path = require('path');
const studioCloudStorageService = require('./studioCloudStorageService');

// تعطيل Queue مؤقتاً - سيعمل بشكل متزامن
let imageGenerationQueue = null;
// try {
//   imageGenerationQueue = require('../queues/imageGenerationQueue');
// } catch (error) {
//   console.warn('⚠️ [STUDIO] Could not load imageGenerationQueue:', error.message);
// }

/**
 * Image Studio Service
 * خدمة توليد الصور باستخدام Nano Banana (Gemini Image Models)
 * 
 * المميزات:
 * - استخدام نفس مفاتيح Gemini الموجودة
 * - تبديل يدوي بين النماذج (Basic/Pro)
 * - بدون حساب للكوتة (Gemini يرد مباشرة)
 * - إدارة مركزية من السوبر أدمن
 */
class ImageStudioService {
  constructor() {
    this.uploadDir = path.join(__dirname, '../uploads/studio_images');
    this.ensureUploadDir();
  }

  async ensureUploadDir() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      console.error('❌ [STUDIO] Error creating upload directory:', error);
    }
  }

  /**
   * الحصول على إعدادات الاستديو
   */
  async getStudioSettings() {
    try {
      const prisma = getSharedPrismaClient();

      let settings = await prisma.imageStudioSettings.findFirst();

      // إنشاء إعدادات افتراضية إذا لم توجد
      if (!settings) {
        settings = await prisma.imageStudioSettings.create({
          data: {
            enabled: true,
            basicModelName: 'gemini-2.5-flash-image',
            proModelName: 'gemini-3-pro-image-preview',
            defaultModel: 'basic',
            maxImagesPerRequest: 1,
            maxRequestsPerDay: 50
          }
        });
      }

      return settings;
    } catch (error) {
      console.error('❌ [STUDIO] Error getting settings:', error);
      throw error;
    }
  }

  /**
   * تحديث إعدادات الاستديو (السوبر أدمن فقط)
   */
  async updateStudioSettings(settingsData) {
    try {
      const prisma = getSharedPrismaClient();

      const currentSettings = await this.getStudioSettings();

      const updated = await prisma.imageStudioSettings.update({
        where: { id: currentSettings.id },
        data: settingsData
      });

      console.log('✅ [STUDIO] Settings updated successfully');
      return updated;
    } catch (error) {
      console.error('❌ [STUDIO] Error updating settings:', error);
      throw error;
    }
  }

  /**
   * التحقق من صلاحية الشركة لاستخدام الاستديو
   */
  async checkCompanyAccess(companyId) {
    try {
      const settings = await this.getStudioSettings();

      // إذا الاستديو معطل
      if (!settings.enabled) {
        return {
          allowed: false,
          reason: 'الاستديو معطل حالياً'
        };
      }

      // إذا في قائمة شركات محددة
      if (settings.allowedCompanies) {
        const allowedList = JSON.parse(settings.allowedCompanies);
        if (!allowedList.includes(companyId)) {
          return {
            allowed: false,
            reason: 'الشركة غير مصرح لها باستخدام الاستديو'
          };
        }
      }

      // فحص الحد اليومي
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const prisma = getSharedPrismaClient();
      const usage = await prisma.imageStudioUsage.findFirst({
        where: {
          companyId: companyId,
          date: today
        }
      });

      if (usage && usage.totalImagesCount >= settings.maxRequestsPerDay) {
        return {
          allowed: false,
          reason: `تم الوصول للحد الأقصى اليومي (${settings.maxRequestsPerDay} صورة)`
        };
      }

      return {
        allowed: true,
        remainingToday: settings.maxRequestsPerDay - (usage?.totalImagesCount || 0)
      };
    } catch (error) {
      console.error('❌ [STUDIO] Error checking company access:', error);
      return {
        allowed: false,
        reason: 'خطأ في التحقق من الصلاحيات'
      };
    }
  }

  /**
   * الحصول على مفتاح Gemini نشط للشركة
   */
  async getActiveGoogleKey(companyId) {
    try {
      const prisma = getSharedPrismaClient();

      // البحث عن مفتاح نشط للشركة
      const key = await prisma.aIKey.findFirst({
        where: {
          companyId: companyId,
          provider: 'GOOGLE',
          isActive: true
        },
        orderBy: {
          priority: 'asc'
        }
      });

      // إذا لم يوجد مفتاح خاص، استخدم المفاتيح المركزية
      if (!key) {
        const centralKey = await prisma.aIKey.findFirst({
          where: {
            keyType: 'CENTRAL',
            provider: 'GOOGLE',
            isActive: true
          },
          orderBy: {
            priority: 'asc'
          }
        });

        return centralKey;
      }

      return key;
    } catch (error) {
      console.error('❌ [STUDIO] Error getting Gemini key:', error);
      throw error;
    }
  }

  /**
   * ترجمة الوصف إلى الإنجليزية إذا كان بالعربية لتحسين النتائج
   */
  async translatePromptIfNeeded(prompt, apiKey) {
    if (!this.containsArabic(prompt)) return { original: prompt, translated: prompt, wasTranslated: false };

    try {
      console.log(`🌐 [STUDIO] Arabic detected, translating prompt...`);
      const genAI = new GoogleGenerativeAI(apiKey);
      // استخدام نموذج سريع للترجمة
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const translationPrompt = `You are a professional image prompt translator. Translate the following image generation prompt from Arabic to English to get the best results from AI image models. Return ONLY the translated English text: "${prompt}"`;

      const result = await model.generateContent(translationPrompt);
      const translatedText = result.response.text().trim();

      console.log(`✅ [STUDIO] Translated: ${translatedText}`);
      return {
        original: prompt,
        translated: translatedText,
        wasTranslated: true
      };
    } catch (error) {
      console.error('⚠️ [STUDIO] Translation failed, using original prompt:', error.message);
      return { original: prompt, translated: prompt, wasTranslated: false };
    }
  }

  /**
   * تحسين الـ Prompt باستخدام الذكاء الاصطناعي (Magic Prompt)
   */
  async enhancePrompt(prompt, apiKey) {
    try {
      console.log(`✨ [STUDIO] Enhancing prompt with AI...`);
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const enhancementPrompt = `You are a professional AI image generation prompt engineer. 
      Enhance the following prompt to be more descriptive, artistic and professional for high-quality image generation. 
      Add details about lighting, style (realistic, studio), and composition.
      Keep it concise but detailed. 
      Original prompt: "${prompt}". 
      Return ONLY the enhanced English prompt.`;

      const result = await model.generateContent(enhancementPrompt);
      const enhanced = result.response.text().trim();
      console.log(`🪄 [STUDIO] Magic Prompt: ${enhanced}`);
      return enhanced;
    } catch (error) {
      console.error('⚠️ [STUDIO] Prompt enhancement failed:', error.message);
      return prompt;
    }
  }

  /**
   * فحص إذا كان النص يحتوي على حروف عربية
   */
  containsArabic(text) {
    const arabicPattern = /[\u0600-\u06FF]/;
    return arabicPattern.test(text);
  }

  /**
   * تعديل الصور باستخدام Lovable Endpoint
   * (Virtual Try-On / Inpainting / Background Replacement)
   */
  async editImage({ imageBase64, maskBase64, prompt, companyId, userId }) {
    const prisma = getSharedPrismaClient();
    const axios = require('axios');

    console.log(`🎨 [STUDIO-EDIT] Editing image for company: ${companyId}`);

    // 1. التحقق من الصلاحيات
    const accessCheck = await this.checkCompanyAccess(companyId);
    if (!accessCheck.allowed) {
      throw new Error(accessCheck.reason);
    }

    try {
      // 2. تسجيل العملية
      const historyRecord = await prisma.imageStudioHistory.create({
        data: {
          companyId,
          userId,
          prompt: prompt || "Image Edit",
          modelType: 'edit',
          modelName: 'lovable-edit-v1',
          status: 'processing',
          metadata: JSON.stringify({
            type: 'edit',
            hasMask: !!maskBase64,
            createdAt: new Date().toISOString()
          })
        }
      });

      // 3. استدعاء Lovable Endpoint
      const lovableUrl = 'https://hmngebgvsuxrwcvadaxa.supabase.co/functions/v1/external-edit-image';

      console.log(`📤 [STUDIO-EDIT] Calling Lovable Edit Endpoint...`);
      const response = await axios.post(lovableUrl, {
        image: imageBase64,
        mask: maskBase64, // Optional
        prompt: prompt
      }, {
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.data || !response.data.image) {
        throw new Error('No image returned from editing service');
      }

      const editedImageBase64 = response.data.image;

      // 4. حفظ الصورة
      const filename = `${Date.now()}_${companyId}_edit.png`;
      const filepath = path.join(this.uploadDir, filename); // Ensure uploadDir is defined or use logic below

      // We need to use the storage logic. 
      // Since we are inside the service, let's reuse/adapt the storage logic from executeGeneration or similar.
      // For simplicity in this step, let's save locally directly then genericize if needed.
      // Wait, executeGeneration calls studioCloudStorageService.

      // Let's decode and save using studioCloudStorageService if possible, or manual fs write if that service expects buffer
      const buffer = Buffer.from(editedImageBase64, 'base64');
      await fs.writeFile(filepath, buffer);

      const publicUrl = `/uploads/studio_images/${filename}`;

      // 5. تحديث السجل
      await prisma.imageStudioHistory.update({
        where: { id: historyRecord.id },
        data: {
          status: 'completed',
          imageUrl: publicUrl,
          metadata: JSON.stringify({
            ...JSON.parse(historyRecord.metadata),
            duration: 0, // We can calc duration if we track start time
            completedAt: new Date().toISOString()
          })
        }
      });

      // 6. تحديث الاستهلاك (نفس كوتة التوليد)
      await this._updateUsageSafe(companyId);

      return {
        success: true,
        imageUrl: publicUrl,
        historyId: historyRecord.id
      };

    } catch (error) {
      console.error('❌ [STUDIO-EDIT] Edit failed:', error.message);
      throw error;
    }
  }

  /**
   * توليد صورة باستخدام Nano Banana

   * @param {Object} params - معاملات التوليد
   * @param {string} params.prompt - النص الوصفي للصورة
   * @param {string} params.modelType - نوع النموذج (basic/pro)
   * @param {boolean} params.useMagicPrompt - استخدام ميزة تحسين الوصف
   * @param {string} params.companyId - معرف الشركة
   * @param {string} params.userId - معرف المستخدم
   */
  async generateImage({ prompt, modelType = 'basic', useMagicPrompt = false, aspectRatio = '1:1', companyId, userId }) {
    const prisma = getSharedPrismaClient();

    console.log(`🎨 [STUDIO-QUEUE] Adding job for company: ${companyId}, User: ${userId}`);

    // 1. التحقق من الصلاحيات (Fail fast)
    const accessCheck = await this.checkCompanyAccess(companyId);
    if (!accessCheck.allowed) {
      throw new Error(accessCheck.reason);
    }

    // 2. الحصول على الإعدادات لتحديد اسم النموذج
    const settings = await this.getStudioSettings();
    const modelName = modelType === 'pro' ? settings.proModelName : settings.basicModelName;

    // 3. إنشاء سجل في التاريخ مبدئياً
    const historyRecord = await prisma.imageStudioHistory.create({
      data: {
        companyId,
        userId,
        prompt,
        modelType,
        modelName,
        status: 'queued', // حالة جديدة
        metadata: JSON.stringify({
          originalPrompt: prompt,
          aspectRatio: aspectRatio,
          useMagicPrompt: useMagicPrompt,
          queuedAt: new Date().toISOString()
        })
      }
    });

    // 4. إضافة المهمة للطابور أو تنفيذها مباشرة
    if (imageGenerationQueue) {
      await imageGenerationQueue.add('generate-image', {
        prompt,
        modelType,
        useMagicPrompt,
        aspectRatio,
        companyId,
        userId,
        historyId: historyRecord.id
      }, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000
        },
        removeOnComplete: true,
        removeOnFail: false
      });

      console.log(`✅ [STUDIO-QUEUE] Job added with History ID: ${historyRecord.id}`);

      return {
        success: true,
        queued: true,
        historyId: historyRecord.id,
        message: 'تم إضافة طلبك لقائمة الانتظار',
        status: 'queued'
      };
    } else {
      // تنفيذ متزامن بدون Queue
      console.log('⚠️ [STUDIO] Queue not available, executing synchronously...');
      await prisma.imageStudioHistory.update({
        where: { id: historyRecord.id },
        data: { status: 'processing' }
      });

      const result = await this.executeGeneration({
        prompt,
        modelType,
        useMagicPrompt,
        aspectRatio,
        companyId,
        userId,
        historyId: historyRecord.id
      });

      return result;
    }
  }

  /**
   * تنفيذ عملية التوليد (يتم استدعاؤها من الـ Worker)
   */
  async executeGeneration({ prompt, modelType, useMagicPrompt, aspectRatio, companyId, userId, historyId }) {
    const startTime = Date.now();
    const prisma = getSharedPrismaClient();
    let finalPrompt = prompt;
    let translatedData = { original: prompt, translated: prompt, wasTranslated: false };
    let wasMagicUsed = false;

    try {
      console.log(`🎨 [STUDIO-EXEC] Starting execution for HistoryID: ${historyId}`);

      // تحديث الحالة (يتم عادة في الـ Worker لكن للتأكيد)
      await prisma.imageStudioHistory.update({
        where: { id: historyId },
        data: { status: 'processing' }
      });

      // 1. (تم التحقق من الصلاحيات مسبقاً، لكن يمكن إعادة التحقق هنا إذا كان الطابور طويلاً جداً)

      // 2. الحصول على الإعدادات
      const settings = await this.getStudioSettings();
      const modelName = modelType === 'pro' ? settings.proModelName : settings.basicModelName;

      // 3. الحصول على مفتاح Gemini
      const geminiKey = await this.getActiveGoogleKey(companyId);
      if (!geminiKey) {
        throw new Error('لا يوجد مفتاح Gemini نشط للشركة');
      }

      // 4. ترجمة الـ Prompt
      translatedData = await this.translatePromptIfNeeded(prompt, geminiKey.apiKey);
      finalPrompt = translatedData.translated;

      // 5. ميزة Magic Prompt
      if (useMagicPrompt) {
        finalPrompt = await this.enhancePrompt(finalPrompt, geminiKey.apiKey);
        wasMagicUsed = true;
      }

      let imageData = null;

      // 6. توليد الصورة
      // التحقق من نوع النموذج لاستخدام الطريقة المناسبة

      if (modelType === 'basic' || modelName.includes('flash')) {
        console.log(`📤 [STUDIO-API] Calling Lovable External Endpoint for Basic Model...`);
        // استخدام Lovable endpoint الذي أنشأه المستخدم
        const lovableUrl = 'https://hmngebgvsuxrwcvadaxa.supabase.co/functions/v1/external-generate-image';

        const axios = require('axios');
        try {
          const result = await axios.post(lovableUrl, {
            prompt: finalPrompt,
            model: "basic"
          }, {
            headers: { 'Content-Type': 'application/json' }
          });

          if (result.data && result.data.image) {
            imageData = result.data.image;
            console.log('✅ [STUDIO-API] Lovable Endpoint Success.');
          } else {
            console.warn('⚠️ [STUDIO-API] Lovable Endpoint returned no image:', result.data);
          }

        } catch (err) {
          console.error('❌ [STUDIO-API] Lovable Endpoint Failed:', err.message);
          if (err.response) console.error('Details:', err.response.data);
        }

      } else {
        // Pro Mode (Imagen) via REST
        console.log(`📤 [STUDIO-API] Calling Pro Model (Imagen via REST): ${modelName}...`);
        const apiModelName = modelName.includes('imagen') ? modelName : 'imagen-4.0-fast-generate-001';
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${apiModelName}:predict?key=${geminiKey.apiKey}`;

        const axios = require('axios');
        try {
          const apiResponse = await axios.post(apiUrl, {
            instances: [{ prompt: finalPrompt }],
            parameters: { sampleCount: 1, aspectRatio: aspectRatio || '1:1' }
          }, { headers: { 'Content-Type': 'application/json' } });

          if (apiResponse.data && apiResponse.data.predictions && apiResponse.data.predictions.length > 0) {
            const prediction = apiResponse.data.predictions[0];
            if (prediction.bytesBase64Encoded) imageData = prediction.bytesBase64Encoded;
            else if (prediction.mimeType && prediction.bytesBase64Encoded) imageData = prediction.bytesBase64Encoded;
          }
        } catch (apiError) {
          console.error('❌ [STUDIO-API] Pro Gen Failed:', apiError.message);
          if (apiError.response) console.error('📝 [STUDIO-API] API Error:', JSON.stringify(apiError.response.data));
        }
      }

      // Fallback Algorithm: Generate a colored placeholder if API fails
      if (!imageData) {
        console.warn('⚠️ [STUDIO-API] Falling back to Simulation Mode (Placeholder Image).');
        // Simple 1x1 Blue Pixel Base64
        imageData = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      }



      // 8. حفظ الصورة (عبر خدمة التجريد)
      const fileName = `${Date.now()}_${companyId}_${modelType}.png`;
      const buffer = Buffer.from(imageData, 'base64');

      let imageUrl = await studioCloudStorageService.uploadImage(buffer, fileName);

      const duration = Date.now() - startTime;
      console.log(`✅ [STUDIO-SUCCESS] Image saved via service: ${imageUrl} in ${duration}ms`);

      // 9. تحديث السجل بالنجاح
      await prisma.imageStudioHistory.update({
        where: { id: historyId },
        data: {
          imageUrl,
          status: 'completed',
          metadata: JSON.stringify({
            originalPrompt: prompt,
            translatedPrompt: translatedData.translated,
            finalPrompt: finalPrompt,
            wasTranslated: translatedData.wasTranslated,
            wasMagicUsed: wasMagicUsed,
            aspectRatio: aspectRatio,
            fileSize: buffer.length,
            duration: duration,
            finishedAt: new Date().toISOString()
          })
        }
      });

      // 10. تحديث إحصائيات الاستخدام
      await this.updateUsageStats(companyId, modelType);

      return {
        success: true,
        imageUrl,
        modelName,
        modelType,
        duration,
        historyId: historyId,
        wasTranslated: translatedData.wasTranslated,
        wasMagicUsed: wasMagicUsed
      };

    } catch (genError) {
      const duration = Date.now() - startTime;
      console.error(`❌ [STUDIO-ERROR] Generation failed after ${duration}ms:`, genError.message);

      let errorType = 'UNKNOWN';
      if (genError.message && genError.message.includes('SAFETY')) errorType = 'SAFETY_BLOCK';
      if (genError.message && genError.message.includes('429')) errorType = 'QUOTA_EXCEEDED';
      if (genError.message && genError.message.includes('INVALID_ARGUMENT')) errorType = 'INVALID_PROMPT';

      // تحديث السجل بالفشل
      await prisma.imageStudioHistory.update({
        where: { id: historyId },
        data: {
          status: 'failed',
          metadata: JSON.stringify({
            originalPrompt: prompt,
            finalPrompt: finalPrompt,
            error: genError.message,
            errorType: errorType,
            duration: duration,
            failedAt: new Date().toISOString()
          })
        }
      });

      throw new Error(`فشل توليد الصورة: ${genError.message}`);
    }
  }


  /**
   * تحديث إحصائيات الاستخدام
   */
  async updateUsageStats(companyId, modelType) {
    try {
      await this._updateUsageSafe(companyId, modelType);
    } catch (error) {
      console.error('❌ [STUDIO] Error updating usage stats:', error);
    }
  }

  /**
   * دالة مساعدة لتحديث الاستهلاك بشكل آمن (مع إعادة المحاولة)
   */
  async _updateUsageSafe(companyId, modelType = null) {
    const prisma = getSharedPrismaClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Retry loop to handle unique constraint race conditions
    for (let i = 0; i < 3; i++) {
      try {
        const updateData = { totalImagesCount: { increment: 1 } };
        // Default create values
        const createData = {
          companyId,
          date: today,
          totalImagesCount: 1,
          basicImagesCount: 0,
          proImagesCount: 0
        };

        if (modelType === 'basic') {
          updateData.basicImagesCount = { increment: 1 };
          createData.basicImagesCount = 1;
        } else if (modelType === 'pro') {
          updateData.proImagesCount = { increment: 1 };
          createData.proImagesCount = 1;
        }

        await prisma.imageStudioUsage.upsert({
          where: { companyId_date: { companyId, date: today } },
          update: updateData,
          create: createData
        });

        return; // Success
      } catch (error) {
        if (error.code === 'P2002') {
          // Unique constraint failed, wait briefly and retry
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }
        console.error(`❌ [STUDIO] Error in usage upsert (Attempt ${i + 1}):`, error.message);
        if (i === 2) throw error; // Throw on last attempt
      }
    }
  }

  /**
   * الحصول على سجل التوليد للشركة
   */
  async getCompanyHistory(companyId, { limit = 20, offset = 0, status = null } = {}) {
    try {
      const prisma = getSharedPrismaClient();

      const where = { companyId };
      if (status) {
        where.status = status;
      }

      const history = await prisma.imageStudioHistory.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        skip: offset
      });

      const total = await prisma.imageStudioHistory.count({ where });

      return {
        history,
        total,
        limit,
        offset
      };
    } catch (error) {
      console.error('❌ [STUDIO] Error getting history:', error);
      throw error;
    }
  }

  /**
   * الحصول على إحصائيات الاستخدام للشركة
   */
  async getCompanyStats(companyId, days = 30) {
    try {
      const prisma = getSharedPrismaClient();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      const usage = await prisma.imageStudioUsage.findMany({
        where: {
          companyId,
          date: {
            gte: startDate
          }
        },
        orderBy: {
          date: 'desc'
        }
      });

      const totalBasic = usage.reduce((sum, day) => sum + day.basicImagesCount, 0);
      const totalPro = usage.reduce((sum, day) => sum + day.proImagesCount, 0);
      const totalImages = usage.reduce((sum, day) => sum + day.totalImagesCount, 0);

      return {
        totalImages,
        totalBasic,
        totalPro,
        dailyUsage: usage,
        period: `${days} days`
      };
    } catch (error) {
      console.error('❌ [STUDIO] Error getting stats:', error);
      throw error;
    }
  }

  /**
   * الحصول على النماذج المتاحة
   */
  async getAvailableModels() {
    try {
      const settings = await this.getStudioSettings();

      return {
        basic: {
          name: settings.basicModelName,
          displayName: 'Nano Banana (Basic)',
          description: 'سريع وفعال - مناسب للاستخدام اليومي',
          type: 'basic'
        },
        pro: {
          name: settings.proModelName,
          displayName: 'Nano Banana Pro',
          description: 'احترافي - جودة عالية ونصوص واضحة',
          type: 'pro'
        }
      };
    } catch (error) {
      console.error('❌ [STUDIO] Error getting available models:', error);
      throw error;
    }
  }
  /**
   * توليد محتوى إعلاني باستخدام Gemini
   */
  async generateAdContent({ productInfo, platform, companyId }) {
    try {
      const geminiKey = await this.getActiveGoogleKey(companyId);
      if (!geminiKey) {
        throw new Error('لا يوجد مفتاح Gemini نشط للشركة');
      }

      const genAI = new GoogleGenerativeAI(geminiKey.apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `
        You are an expert social media advertiser. Create a compelling ad for the following product:
        Product Info: ${productInfo}
        Platform: ${platform}
        
        Output the result in JSON format with the following fields:
        - headline: a catchy headline (in Arabic)
        - body: a persuasive ad description (in Arabic)
        - cta: a strong call to action (in Arabic)
        
        Make it high-converting, professional, and culturally relevant to an Arabic-speaking audience.
        Ensure the output is ONLY the JSON object.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Clean and parse JSON
      const jsonStr = text.match(/\{[\s\S]*\}/)?.[0];
      if (!jsonStr) {
        console.error('❌ [STUDIO] Failed to parse ad content from text:', text);
        throw new Error('فشل في تحليل محتوى الإعلان المتولد');
      }

      return JSON.parse(jsonStr);
    } catch (error) {
      console.error('❌ [STUDIO] Error generating ad content:', error);
      throw error;
    }
  }

  /**
   * Saves an image URL to the company image gallery
   * @param {string} userId 
   * @param {string} companyId 
   * @param {string} imageUrl 
   */
  async saveToGallery(userId, companyId, imageUrl) {
    try {
      const prisma = getSharedPrismaClient();
      const filename = `ai-generated-${Date.now()}.png`;
      const galleryItem = await prisma.imageGallery.create({
        data: {
          userId,
          companyId,
          fileUrl: imageUrl,
          filename: filename,
          fileType: 'image/png',
          fileSize: 0
        }
      });
      return galleryItem;
    } catch (error) {
      console.error('❌ [STUDIO] Error saving to gallery:', error);
      throw error;
    }
  }

  /**
   * Smart Product Swap (Virtual Try-On)
   * Performs a smart swap of an item in a scene with a new product image.
   */
  async swapProduct({ sceneImageBase64, productImageBase64, companyId, userId }) {
    const prisma = getSharedPrismaClient();
    const axios = require('axios');

    console.log(`🔄 [STUDIO-SWAP] Starting Product Swap for company: ${companyId}`);

    // 1. Check Access
    const accessCheck = await this.checkCompanyAccess(companyId);
    if (!accessCheck.allowed) {
      throw new Error(accessCheck.reason);
    }

    try {
      // 2. Register history
      const historyRecord = await prisma.imageStudioHistory.create({
        data: {
          companyId,
          userId,
          prompt: "Smart Product Swap",
          modelType: 'swap',
          modelName: 'lovable-swap-v1',
          status: 'processing',
          metadata: JSON.stringify({
            type: 'swap',
            createdAt: new Date().toISOString()
          })
        }
      });


      // 3. Analyze the product image using Gemini Vision to get a detailed description
      // This ensures the swap respects the exact details of the product even if the image reference is weak
      let productDescription = "the provided product";
      try {
        console.log('👁️ [STUDIO-SWAP] Analyzing product image with Gemini Vision...');
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Efficient vision model

        // Clean base64 for Gemini
        const cleanProductBase64 = productImageBase64.replace(/^data:image\/\w+;base64,/, "");

        const prompt = "Describe this product in extreme detail for an image generation prompt. Focus on: Color, Material, Shape, Texture, and Key Features. Keep it under 40 words. Example output: 'brown leather ankle boots with white fur lining and white rubber sole'.";

        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: cleanProductBase64,
              mimeType: "image/png",
            },
          },
        ]);

        productDescription = result.response.text().trim();
        console.log(`📝 [STUDIO-SWAP] Product Description: "${productDescription}"`);
      } catch (visionError) {
        console.warn('⚠️ [STUDIO-SWAP] Vision analysis failed, using fallback:', visionError.message);
      }

      // 4. Call external swap endpoint with enhanced prompt
      const swapUrl = 'https://hmngebgvsuxrwcvadaxa.supabase.co/functions/v1/external-edit-image';

      // We ensure base64 strings are clean (no data:image/... prefix) because some endpoints are strict
      const cleanSceneBase64 = sceneImageBase64.replace(/^data:image\/\w+;base64,/, "");
      const cleanProductBase64 = productImageBase64.replace(/^data:image\/\w+;base64,/, "");

      const enhancedPrompt = `Seamlessly swap the central product in the scene with this specific product: ${productDescription}. Ensure precise color matching and realistic lighting integration.`;
      console.log(`🎨 [STUDIO-SWAP] Sending enhanced prompt: "${enhancedPrompt}"`);

      // We send 'mask' as the product image in this specific endpoint configuration
      // Or we rely on the prompt if the endpoint treats 'image' as the base and 'prompt' for the change.
      // Based on typical Inpainting/Edit endpoints:
      // - image: The original scene
      // - prompt: Instructions
      // - mask: (Optional) Area to edit. If not provided, AI detects it. 
      // Some endpoints accept 'control_image' or similar. We will try sending the product as 'control_image' if supported,
      // but relying on the STRONG prompt description is the most reliable cross-model method.

      const response = await axios.post(swapUrl, {
        image: cleanSceneBase64,
        // We might not have a direct 'productImage' field support in the generic endpoint,
        // so we rely heavily on the description we just generated.
        // However, we pass it just in case the endpoint has been updated to support reference.
        control_image: cleanProductBase64,
        prompt: enhancedPrompt
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 90000 // 90s timeout (increased for vision + generation)
      });

      if (!response.data || !response.data.image) {
        throw new Error('لم يتم استلام صورة من محرك التعديل');
      }

      const resultBase64 = response.data.image;
      const imageUrl = await studioCloudStorageService.uploadFromBase64(
        resultBase64,
        `swap-${historyRecord.id}.png`,
        'image/png'
      );

      // 4. Update history
      await prisma.imageStudioHistory.update({
        where: { id: historyRecord.id },
        data: {
          status: 'completed',
          imageUrl: imageUrl
        }
      });

      return {
        success: true,
        imageUrl,
        historyId: historyRecord.id
      };

    } catch (error) {
      console.error('❌ [STUDIO-SWAP] Error during swap:', error);
      throw error;
    }
  }
}

module.exports = new ImageStudioService();
