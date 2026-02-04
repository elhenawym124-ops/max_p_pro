/**
 * Image Extractor Module
 * 
 * هذا الـ module يحتوي على منطق استخراج الصور من:
 * 1. RAG data (المنتجات والصور)
 * 2. قاعدة البيانات (fallback)
 * 3. فلترة الصور حسب اللون
 * 
 * ملاحظة: هذا الـ module للرجوع فقط - لا يتم استخدامه في الملف الرئيسي حالياً
 */

const { getSharedPrismaClient } = require('../sharedDatabase');

class ImageExtractor {
  constructor() {
    this.prisma = getSharedPrismaClient();
  }

  /**
   * استخراج الصور من RAG data بذكاء
   * @param {Array} ragData - بيانات RAG
   * @param {string} customerMessage - رسالة العميل
   * @param {string} companyId - معرف الشركة
   * @param {Function} generateAIResponse - دالة توليد رد AI (يتم تمريرها من الملف الرئيسي)
   * @param {Function} filterImagesByColor - دالة فلترة الصور حسب اللون (يتم تمريرها من الملف الرئيسي)
   * @param {Function} getProductImagesFromDB - دالة جلب الصور من قاعدة البيانات (يتم تمريرها من الملف الرئيسي)
   * @returns {Promise<Array>} - مصفوفة الصور
   */
  async extractImagesFromRAGData(ragData, customerMessage, companyId, generateAIResponse, filterImagesByColor, getProductImagesFromDB) {
    try {
      if (ragData.length === 0) {
        return [];
      }

      // كشف طلب "كل المنتجات" أو عدد محدد من المنتجات
      const msgLc = (customerMessage || '').toLowerCase();
      const isAllProductsRequest = (
        msgLc.includes('كل المنتجات') ||
        msgLc.includes('المنتجات كلها') ||
        msgLc.includes('كل الصور') ||
        msgLc.includes('الصور كلها') ||
        (msgLc.includes('صور') && msgLc.includes('كل')) ||
        msgLc.includes('كل ال')
      );

      // عدد المنتجات المطلوب إذا ذُكر رقم صراحة
      let requestedCount = 0;
      const numberPatterns = [
        { value: 2, words: ['منتجين', 'اتنين', 'اثنين', '2', '٢'] },
        { value: 3, words: ['ثلاث', 'ثلاثة', 'تلاتة', 'تلاته', '3', '٣'] },
        { value: 4, words: ['اربعه', 'أربعة', 'اربعة', '4', '٤'] },
        { value: 5, words: ['خمسه', 'خمسة', '5', '٥'] }
      ];
      for (const pat of numberPatterns) {
        if (pat.words.some(w => msgLc.includes(w))) {
          requestedCount = pat.value;
          break;
        }
      }

      if (isAllProductsRequest || requestedCount > 1) {
        const productItems = ragData.filter(item => item.type === 'product' && item.metadata);
        if (productItems.length === 0) {
          return [];
        }

        // Helper: بناء صور لمنتج واحد
        const buildImagesForProduct = async (prodItem) => {
          const out = [];
          if (prodItem.metadata.product_variants && prodItem.metadata.product_variants.length > 0) {
            for (const variant of prodItem.metadata.product_variants) {
              if (variant.images && variant.images.length > 0) {
                const firstVariantImage = variant.images[0];
                out.push({
                  type: 'image',
                  payload: {
                    url: firstVariantImage,
                    title: `${prodItem.metadata.name || 'منتج'} - اللون ${variant.name}`,
                    variantName: variant.name,
                    variantType: variant.type
                  }
                });
              }
            }
          }
          if (out.length === 0) {
            const general = prodItem.metadata.images || [];
            if (general.length > 0) {
              const firstGeneralImage = general[0];
              out.push({
                type: 'image',
                payload: {
                  url: firstGeneralImage,
                  title: `${prodItem.metadata.name || 'منتج'}`
                }
              });
            }
          }
          // Fallback: لو مفيش صور في RAG metadata، حاول تجيب من قاعدة البيانات
          if (out.length === 0 && prodItem.metadata?.id && getProductImagesFromDB) {
            try {
              const dbImages = await getProductImagesFromDB(prodItem.metadata.id);
              if (Array.isArray(dbImages) && dbImages.length > 0) {
                out.push(...dbImages);
              }
            } catch (e) {
              // ignore DB fallback errors
            }
          }
          return out;
        };

        const selectedItems = (requestedCount > 1 && !isAllProductsRequest)
          ? productItems.slice(0, requestedCount)
          : productItems;

        let allImages = [];
        for (const item of selectedItems) {
          const imgs = await buildImagesForProduct(item);
          allImages.push(...imgs);
        }

        if (allImages.length === 0) {
          return [];
        }

        // فلترة حسب اللون إن وُجد
        if (filterImagesByColor) {
          const filteredAll = await filterImagesByColor(allImages, customerMessage);
          return filteredAll;
        }
        return allImages;
      }

      // استخدام AI لتحديد أفضل منتج مطابق للطلب
      const productAnalysisPrompt = `
أنت خبير في مطابقة طلبات العملاء مع المنتجات المتاحة.

طلب العميل: "${customerMessage}"

المنتجات المتاحة:
${ragData.filter(item => item.type === 'product' && item.metadata)
          .map((item, index) => `${index + 1}. ${item.metadata.name || 'منتج'} - ${item.content || 'لا يوجد وصف'}`)
          .join('\n')}

حدد أفضل منتج يطابق طلب العميل:
- إذا كان هناك منتج مطابق بوضوح، اذكر رقمه
- إذا لم يكن هناك مطابقة واضحة، قل "لا يوجد"

الرد:`;

      const aiResponse = await generateAIResponse(productAnalysisPrompt, [], false, null, companyId);

      // ✅ FIX: Handle both string and object response formats
      const aiContent = typeof aiResponse === 'string' ? aiResponse : aiResponse?.content;

      const responseText = (aiContent || '').trim().toLowerCase();

      let selectedProduct = null;

      // البحث عن رقم المنتج في الرد
      const numberMatch = responseText.match(/(\d+)/);
      if (numberMatch && !responseText.includes('لا يوجد')) {
        const productIndex = parseInt(numberMatch[1]) - 1;
        const productItems = ragData.filter(item => item.type === 'product' && item.metadata);

        if (productIndex >= 0 && productIndex < productItems.length) {
          selectedProduct = productItems[productIndex];
        }
      }

      // لا نستخدم fallback - إذا لم يجد AI منتج مطابق، نرجع قائمة فارغة
      if (!selectedProduct) {
        console.log(`⚠️ [IMAGE-EXTRACTOR] لم يتم العثور على منتج محدد من AI - سيتم طلب اسم المنتج أو صورته من العميل`);

        // محاولة مطابقة مباشرة بالاسم إذا كان customerMessage يحتوي على اسم منتج واضح
        const productItems = ragData.filter(item => item.type === 'product' && item.metadata);
        const normalizedMessage = (customerMessage || '').toLowerCase().trim();

        const directMatch = productItems.find(item => {
          const productName = (item.metadata?.name || '').toLowerCase();
          return productName.includes(normalizedMessage) ||
            normalizedMessage.includes(productName) ||
            productName === normalizedMessage;
        });

        if (directMatch) {
          console.log(`✅ [IMAGE-EXTRACTOR] تم العثور على مطابقة مباشرة: ${directMatch.metadata?.name}`);
          selectedProduct = directMatch;
        } else {
          console.log(`⚠️ [IMAGE-EXTRACTOR] لا توجد مطابقة مباشرة - لن نرسل منتج خاطئ`);
          return [];
        }
      }

      if (!selectedProduct) {
        return [];
      }

      // استخراج الصور من المنتج المختار
      let productImages = [];

      // أولاً: فحص صور المتغيرات
      if (selectedProduct.metadata.product_variants && selectedProduct.metadata.product_variants.length > 0) {
        for (const variant of selectedProduct.metadata.product_variants) {
          if (variant.images && variant.images.length > 0) {
            const firstVariantImage = variant.images[0];
            productImages.push({
              type: 'image',
              payload: {
                url: firstVariantImage,
                title: `${selectedProduct.metadata.name || 'منتج'} - اللون ${variant.name}`,
                variantName: variant.name,
                variantType: variant.type
              }
            });
          }
        }
      }

      // ثانياً: إذا لم نجد صور في المتغيرات، استخدم صور المنتج العامة
      if (productImages.length === 0) {
        const hasValidImages = selectedProduct.metadata.hasValidImages ?? (selectedProduct.metadata.images?.length > 0);
        const validImages = selectedProduct.metadata.images || [];

        if (hasValidImages && validImages.length > 0) {
          productImages = validImages.map((imageUrl, index) => ({
            type: 'image',
            payload: {
              url: imageUrl,
              title: `${selectedProduct.metadata.name || 'منتج'} - صورة ${index + 1}`
            }
          }));
        }
      }

      if (productImages.length === 0) {
        return [];
      }

      // فلترة الصور بناءً على اللون إذا طلب العميل لون محدد
      if (filterImagesByColor) {
        const filteredImages = await filterImagesByColor(productImages, customerMessage);
        return filteredImages;
      }

      return productImages;

    } catch (error) {
      console.error(`❌ [IMAGE-EXTRACTOR] Error in intelligent image extraction:`, error);

      // في حالة الخطأ، نحاول إرجاع صور بديلة بسيطة
      try {
        const fallbackImages = ragData?.filter(item =>
          item.type === 'product' &&
          item.metadata?.images?.length > 0
        ).flatMap(item =>
          item.metadata.images.map(imageUrl => ({
            type: 'image',
            payload: {
              url: imageUrl,
              title: item.metadata.name || 'منتج'
            }
          }))
        ) || [];

        return fallbackImages;
      } catch (fallbackError) {
        console.error(`❌ [IMAGE-EXTRACTOR] Fallback also failed:`, fallbackError);
        return [];
      }
    }
  }

  /**
   * فلترة الصور بناءً على اللون المطلوب
   * @param {Array} images - مصفوفة الصور
   * @param {string} customerMessage - رسالة العميل
   * @param {Function} searchImagesByColorInDatabase - دالة البحث في قاعدة البيانات (اختياري)
   * @returns {Promise<Array>} - مصفوفة الصور المفلترة
   */
  async filterImagesByColor(images, customerMessage, searchImagesByColorInDatabase = null) {
    try {
      // كشف الألوان المطلوبة
      const colorKeywords = {
        'ابيض': ['أبيض', 'ابيض', 'الابيض', 'الأبيض', 'white'],
        'اسود': ['أسود', 'اسود', 'الاسود', 'الأسود', 'black'],
        'احمر': ['أحمر', 'احمر', 'الاحمر', 'الأحمر', 'red'],
        'ازرق': ['أزرق', 'ازرق', 'الازرق', 'الأزرق', 'blue'],
        'اخضر': ['أخضر', 'اخضر', 'الاخضر', 'الأخضر', 'green'],
        'اصفر': ['أصفر', 'اصفر', 'الاصفر', 'الأصفر', 'yellow'],
        'بني': ['بني', 'البني', 'brown'],
        'رمادي': ['رمادي', 'الرمادي', 'gray', 'grey'],
        'بيج': ['بيج', 'البيج', 'beige']
      };

      const normalizedMessage = customerMessage.toLowerCase();
      let requestedColor = null;

      // البحث عن اللون المطلوب
      for (const [color, variants] of Object.entries(colorKeywords)) {
        const found = variants.some(variant => {
          return normalizedMessage.includes(variant.toLowerCase());
        });

        if (found) {
          requestedColor = color;
          break;
        }
      }

      // إذا لم يتم طلب لون محدد، أرجع جميع الصور
      if (!requestedColor) {
        return images;
      }

      // البحث عن صور تحتوي على اللون المطلوب
      let filteredImages = images.filter((image) => {
        const title = image.payload.title.toLowerCase();
        const url = image.payload.url.toLowerCase();
        const variantName = image.payload.variantName?.toLowerCase() || '';

        const colorVariants = colorKeywords[requestedColor];
        let matched = false;

        const foundMatch = colorVariants.some(variant => {
          const variantLower = variant.toLowerCase();
          const titleMatch = title.includes(variantLower);
          const urlMatch = url.includes(variantLower);
          const variantMatch = variantName.includes(variantLower) || variantName === variantLower;

          if (titleMatch || urlMatch || variantMatch) {
            matched = true;
          }

          return titleMatch || urlMatch || variantMatch;
        });

        return foundMatch;
      });

      // إذا لم نجد صور بالون المطلوب، نبحث في قاعدة البيانات
      if (filteredImages.length === 0 && searchImagesByColorInDatabase) {
        filteredImages = await searchImagesByColorInDatabase(requestedColor, images);
      }

      // إذا لم نجد أي صور بالون المطلوب، نرجع مصفوفة فارغة
      if (filteredImages.length === 0) {
        return [];
      }

      // تحديث عناوين الصور المفلترة
      filteredImages.forEach((image) => {
        if (image.payload && image.payload.title) {
          if (!image.payload.title.toLowerCase().includes(requestedColor)) {
            image.payload.title += ` - اللون ${requestedColor}`;
          }
        }
      });

      return filteredImages;

    } catch (error) {
      console.error(`❌ [IMAGE-EXTRACTOR] Error in color filtering:`, error);
      return images; // في حالة الخطأ، نرجع جميع الصور
    }
  }

  /**
   * جلب صور منتج من قاعدة البيانات
   * @param {string} productId - معرف المنتج
   * @returns {Promise<Array>} - مصفوفة الصور
   */
  async getProductImagesFromDB(productId) {
    try {
      if (!productId) {
        return [];
      }

      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        include: {
          product_variants: {
            include: {
              images: true
            }
          },
          images: true
        }
      });

      if (!product) {
        return [];
      }

      const images = [];

      // إضافة صور المتغيرات أولاً
      if (product.product_variants && product.product_variants.length > 0) {
        for (const variant of product.product_variants) {
          if (variant.images && variant.images.length > 0) {
            for (const image of variant.images) {
              images.push({
                type: 'image',
                payload: {
                  url: image.url,
                  title: `${product.name || 'منتج'} - ${variant.name || 'متغير'}`,
                  variantName: variant.name,
                  variantType: variant.type
                }
              });
            }
          }
        }
      }

      // إضافة الصور العامة للمنتج
      if (product.images && product.images.length > 0) {
        for (const image of product.images) {
          images.push({
            type: 'image',
            payload: {
              url: image.url,
              title: `${product.name || 'منتج'}`
            }
          });
        }
      }

      return images;

    } catch (error) {
      console.error(`❌ [IMAGE-EXTRACTOR] Error fetching product images from DB:`, error);
      return [];
    }
  }
}

module.exports = new ImageExtractor();

