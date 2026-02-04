import { envConfig } from '../config/environment';

// دالة مساعدة لتحويل روابط localhost إلى ngrok في الواجهة الأمامية
export const convertToPublicUrl = (url: string): string => {
  if (!url) return url;
  
  // التحقق من وجود localhost في الرابط
  if (url.includes('https://www.maxp-ai.pro')) {
    // استخدام الإعدادات من نظام البيئة
    const ngrokUrl = import.meta.env['VITE_NGROK_URL'] || 
                     'https://www.maxp-ai.pro'; // رابط احتياطي
    
    const convertedUrl = url.replace('https://www.maxp-ai.pro', ngrokUrl);
    
    console.log('🔄 [URL-CONVERTER] Converting localhost to public URL:', {
      original: url,
      converted: convertedUrl,
      ngrokUrl: ngrokUrl
    });
    
    return convertedUrl;
  }
  
  return url;
};

// دالة لمعالجة رسائل الصور مع ضمان الروابط الصحيحة
export const processImageMessage = (message: any) => {
  const processedMessage = { ...message };
  
  // معالجة رابط المحتوى
  if (processedMessage.content && processedMessage.content.includes('https://www.maxp-ai.pro')) {
    processedMessage.content = convertToPublicUrl(processedMessage.content);
  }
  
  // معالجة fileUrl
  if (processedMessage.fileUrl && processedMessage.fileUrl.includes('https://www.maxp-ai.pro')) {
    processedMessage.fileUrl = convertToPublicUrl(processedMessage.fileUrl);
  }
  
  // معالجة المرفقات
  if (processedMessage.attachments) {
    try {
      const attachments = typeof processedMessage.attachments === 'string' 
        ? JSON.parse(processedMessage.attachments) 
        : processedMessage.attachments;
        
      if (Array.isArray(attachments)) {
        const updatedAttachments = attachments.map(attachment => ({
          ...attachment,
          url: attachment.url ? convertToPublicUrl(attachment.url) : attachment.url
        }));
        
        processedMessage.attachments = updatedAttachments;
      }
    } catch (error) {
      console.warn('⚠️ [URL-CONVERTER] Failed to process attachments:', error);
    }
  }
  
  return processedMessage;
};

// دالة للحصول على رابط الصورة النهائي مع معالجة شاملة
export const getImageUrl = (message: any): string => {
  const processedMessage = processImageMessage(message);
  
  // ترتيب الأولوية: fileUrl ثم content
  let imageUrl = processedMessage.fileUrl || processedMessage.content;
  
  // ضمان التحويل النهائي
  if (imageUrl) {
    imageUrl = convertToPublicUrl(imageUrl);
    
    // إضافة معالجة خاصة للصور - استخدام proxy لجميع الصور من المخدم
    if (imageUrl.startsWith('https://www.maxp-ai.pro/') || 
        imageUrl.startsWith('https://files.easy-orders.net/') || 
        imageUrl.startsWith('https://scontent.') || 
        imageUrl.startsWith('https://platform-lookaside.fbsbx.com/')) {
      // في بيئة التطوير، استخدم رابط ال proxy المحلي
      if (envConfig.isDevelopment) {
        return `${envConfig.apiUrl.replace('/api/v1', '')}/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
      }
      // في بيئة الإنتاج، استخدم رابط ال proxy المناسب
      return `${envConfig.appUrl}/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
    }
  }
  
  return imageUrl || '';
};

export default {
  convertToPublicUrl,
  processImageMessage,
  getImageUrl
};