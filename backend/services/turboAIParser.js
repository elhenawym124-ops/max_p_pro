/**
 * Turbo AI Address Parser
 * استخدام Google Gemini AI لتحليل العناوين وتحديد المحافظة والمنطقة
 */

const axios = require('axios');
const { getSharedPrismaClient, safeQuery } = require('./sharedDatabase');
const TurboService = require('./turboService');

class TurboAIParser {
  constructor(apiKey = null, companyId = null) {
    this.apiKey = apiKey;
    this.companyId = companyId;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    this.timeout = 30000; // 30 ثانية
  }

  /**
   * جلب API Key من إعدادات الشركة
   */
  async getApiKey() {
    if (this.apiKey) {
      return this.apiKey;
    }

    if (!this.companyId) {
      throw new Error('Company ID is required to fetch API key');
    }

    try {
      const prisma = getSharedPrismaClient();
      const company = await safeQuery(async () => {
        return await prisma.company.findUnique({
          where: { id: this.companyId },
          select: { turboAIGeminiApiKey: true, turboEnabled: true }
        });
      }, 2);

      if (!company || !company.turboEnabled) {
        throw new Error('Turbo is not enabled for this company');
      }

      if (!company.turboAIGeminiApiKey) {
        throw new Error('Gemini API key is not configured for this company');
      }

      this.apiKey = company.turboAIGeminiApiKey;
      return this.apiKey;
    } catch (error) {
      console.error('❌ [TURBO-AI] Error fetching API key:', error);
      throw error;
    }
  }

  /**
   * جلب قائمة النماذج المتاحة من Google Gemini API
   */
  async getAvailableModels() {
    try {
      const apiKey = await this.getApiKey();
      
      // محاولة v1beta أولاً (الأحدث)، ثم v1 كبديل
      const apiUrls = [
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
        `https://generativelanguage.googleapis.com/v1/models?key=${encodeURIComponent(apiKey)}`
      ];

      let availableModels = {};

      for (const apiUrl of apiUrls) {
        try {
          const response = await axios.get(apiUrl, {
            timeout: 15,
            headers: {
              'Content-Type': 'application/json'
            }
          });

          if (response.data && response.data.models && Array.isArray(response.data.models)) {
            for (const model of response.data.models) {
              const modelName = model.name || '';
              if (!modelName) continue;

              // استخراج اسم النموذج فقط (بدون models/)
              const modelShortName = modelName.replace('models/', '');

              // تخطي النماذج المكررة
              if (availableModels[modelShortName]) {
                continue;
              }

              const supportedMethods = model.supportedGenerationMethods || [];

              // فقط النماذج التي تدعم generateContent
              if (supportedMethods.includes('generateContent')) {
                // تحديد نوع النموذج وإصداره
                let modelType = 'other';
                let modelVersion = 0;

                // استخراج الإصدار من الاسم
                const versionMatch = modelShortName.match(/gemini-(\d+)\.(\d+)/);
                if (versionMatch) {
                  modelVersion = parseFloat(`${versionMatch[1]}.${versionMatch[2]}`);
                  if (modelShortName.includes('flash')) {
                    modelType = 'flash';
                  } else if (modelShortName.includes('pro')) {
                    modelType = 'pro';
                  }
                } else {
                  const versionMatch2 = modelShortName.match(/gemini-(\d+)/);
                  if (versionMatch2) {
                    modelVersion = parseFloat(versionMatch2[1]);
                    if (modelShortName.includes('flash')) {
                      modelType = 'flash';
                    } else if (modelShortName.includes('pro')) {
                      modelType = 'pro';
                    }
                  }
                }

                availableModels[modelShortName] = {
                  name: modelShortName,
                  displayName: model.displayName || modelShortName,
                  description: model.description || '',
                  version: modelVersion,
                  type: modelType,
                  supportedMethods: supportedMethods
                };
              }
            }

            // إذا حصلنا على نماذج، نتوقف
            if (Object.keys(availableModels).length > 0) {
              break;
            }
          }
        } catch (error) {
          console.warn(`⚠️ [TURBO-AI] Error fetching models from ${apiUrl}:`, error.message);
          continue;
        }
      }

      if (Object.keys(availableModels).length === 0) {
        return false;
      }

      // ترتيب النماذج: الأحدث أولاً، ثم Pro قبل Flash
      const sortedModels = Object.values(availableModels).sort((a, b) => {
        if (a.version !== b.version) {
          return b.version - a.version; // الأحدث أولاً
        }
        if (a.type !== b.type) {
          if (a.type === 'pro') return -1;
          if (b.type === 'pro') return 1;
        }
        return a.name.localeCompare(b.name);
      });

      return sortedModels;
    } catch (error) {
      console.error('❌ [TURBO-AI] Error getting available models:', error);
      return false;
    }
  }

  /**
   * تحليل العنوان باستخدام Google Gemini AI
   * @param {String} address - العنوان الكامل
   * @param {String} orderId - رقم الطلب (اختياري)
   * @returns {Object} النتائج مع government_id, government_name, area_id, area_name
   */
  async parseAddress(address, orderId = null) {
    try {
      const apiKey = await this.getApiKey();

      if (!address || !address.trim()) {
        throw new Error('Address is required');
      }

      console.log('🤖 [TURBO-AI] Parsing address:', address.substring(0, 50) + '...');

      // جلب النموذج المختار من إعدادات الشركة
      let selectedModel = 'gemini-2.5-flash'; // افتراضي
      if (this.companyId) {
        try {
          const prisma = getSharedPrismaClient();
          const company = await safeQuery(async () => {
            return await prisma.company.findUnique({
              where: { id: this.companyId },
              select: { turboAIGeminiModel: true }
            });
          }, 2);
          if (company && company.turboAIGeminiModel) {
            selectedModel = company.turboAIGeminiModel;
          }
        } catch (e) {
          console.warn('⚠️ [TURBO-AI] Could not fetch selected model, using default');
        }
      }

      // بناء prompt محسّن
      const prompt = `أنت خبير في تحليل العناوين المصرية.

⚠️ قواعد مهمة جداً:
1. المنطقة/المركز قد تكون في بداية العنوان (مثل: امبابه، كرداسه، مدينة نصر) أو في نهايته (مثل: المنيل، الزمالك، مصر الجديدة).
2. أولوية عالية جداً للكلمات المذكورة مباشرة في العنوان (في البداية أو النهاية).
3. تجاهل الكلمات الشائعة: شارع، طريق، عمارة، دور، شقة، رقم، بجانب، امام، خلف، عزبه، عزبة، عبد، العزيز، آل، سعود.
4. المحافظة عادة ما تكون في نهاية العنوان أو قريبة من النهاية.
5. إذا كان العنوان يحتوي على اسم منطقة معروف (مثل: المنيل، المعادي، الزمالك)، استخدمه مباشرة.
6. إذا كان العنوان يبدأ باسم منطقة (مثل: امبابه، كرداسه)، استخدمه مباشرة.

العنوان: ${address}

أجب بصيغة JSON فقط:
{"government":"اسم المحافظة","area":"اسم المنطقة/المركز"}

أمثلة:
العنوان: 'امبابه عزبه الصعايدة - شارع المزارع'
الإجابة: {"government":"الجيزة","area":"امبابه"}

العنوان: '٨٥ ب شارع عبد العزيز آل سعود - المنيل'
الإجابة: {"government":"القاهرة","area":"المنيل"}

إذا غير متأكد، اترك القيمة فارغة ""`;

      const apiUrl = `${this.baseUrl}/models/${selectedModel}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ]
      };

      console.log(`🔄 [TURBO-AI] Sending request to Gemini API (model: ${selectedModel})`);

      const response = await axios.post(apiUrl, requestBody, {
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.data || !response.data.candidates || !response.data.candidates[0]) {
        throw new Error('Invalid response from Gemini API');
      }

      const aiResponseText = response.data.candidates[0].content.parts[0].text;

      // تنظيف النص من markdown code blocks
      let cleanedText = aiResponseText
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();

      console.log('📝 [TURBO-AI] Raw AI response:', cleanedText.substring(0, 200));

      // محاولة استخراج JSON
      let aiResult = null;

      // محاولة 1: البحث عن JSON object كامل
      const jsonMatch1 = cleanedText.match(/\{[^{}]*"government"[^{}]*"area"[^{}]*\}/);
      if (jsonMatch1) {
        try {
          aiResult = JSON.parse(jsonMatch1[0]);
        } catch (e) {
          // Ignore
        }
      }

      // محاولة 2: البحث عن JSON object متعدد الأسطر
      if (!aiResult) {
        const jsonMatch2 = cleanedText.match(/\{[\s\S]*?"government"[\s\S]*?"area"[\s\S]*?\}/);
        if (jsonMatch2) {
          try {
            aiResult = JSON.parse(jsonMatch2[0]);
          } catch (e) {
            // Ignore
          }
        }
      }

      // محاولة 3: parse النص كله
      if (!aiResult) {
        try {
          aiResult = JSON.parse(cleanedText);
        } catch (e) {
          // Ignore
        }
      }

      // محاولة 4: استخراج يدوي
      if (!aiResult || !aiResult.government) {
        aiResult = this.extractFromText(cleanedText);
      }

      if (!aiResult || !aiResult.government) {
        throw new Error('Could not extract government/area from AI response');
      }

      const governmentName = (aiResult.government || '').trim();
      const areaName = (aiResult.area || '').trim();

      console.log(`✅ [TURBO-AI] Extracted - government: ${governmentName}, area: ${areaName}`);

      // مطابقة النتائج مع قائمة Turbo
      const turboService = new TurboService(null, this.companyId);
      const governmentsResult = await turboService.getGovernments();
      
      if (!governmentsResult || !governmentsResult.governments) {
        throw new Error('Failed to fetch governments from Turbo API');
      }

      const governments = governmentsResult.governments;
      let matchedGovernment = null;

      // البحث عن المحافظة المطابقة
      for (const gov of governments) {
        const govName = gov.name.toLowerCase();
        if (govName === governmentName.toLowerCase() ||
            govName.includes(governmentName.toLowerCase()) ||
            governmentName.toLowerCase().includes(govName)) {
          matchedGovernment = gov;
          break;
        }
      }

      if (!matchedGovernment) {
        throw new Error(`Government "${governmentName}" not found in Turbo API`);
      }

      // جلب المناطق للمحافظة المطابقة
      let matchedArea = null;
      if (areaName) {
        const areasResult = await turboService.getAreas(matchedGovernment.id);
        if (areasResult && areasResult.areas) {
          for (const area of areasResult.areas) {
            const areaNameLower = area.name.toLowerCase();
            if (areaNameLower === areaName.toLowerCase() ||
                areaNameLower.includes(areaName.toLowerCase()) ||
                areaName.toLowerCase().includes(areaNameLower)) {
              matchedArea = area;
              break;
            }
          }
        }
      }

      console.log(`✅ [TURBO-AI] Matched - government: ${matchedGovernment.name} (ID: ${matchedGovernment.id}), area: ${matchedArea ? matchedArea.name + ' (ID: ' + matchedArea.id + ')' : 'N/A'}`);

      return {
        success: true,
        government_id: matchedGovernment.id,
        government_name: matchedGovernment.name,
        area_id: matchedArea ? matchedArea.id : null,
        area_name: matchedArea ? matchedArea.name : null,
        original_government: governmentName,
        original_area: areaName
      };
    } catch (error) {
      console.error('❌ [TURBO-AI] Error parsing address:', error);
      throw error;
    }
  }

  /**
   * استخراج المعلومات يدوياً من النص
   */
  extractFromText(text) {
    const result = {
      government: '',
      area: ''
    };

    // البحث عن government
    const govMatch = text.match(/"government"\s*:\s*"([^"]+)"/i) || 
                     text.match(/government["\s:]+([^",}\n]+)/i);
    if (govMatch) {
      result.government = govMatch[1].trim();
    }

    // البحث عن area
    const areaMatch = text.match(/"area"\s*:\s*"([^"]+)"/i) || 
                      text.match(/area["\s:]+([^",}\n]+)/i);
    if (areaMatch) {
      result.area = areaMatch[1].trim();
    }

    return result;
  }
}

module.exports = TurboAIParser;

