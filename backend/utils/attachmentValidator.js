/**
 * مدقق المرفقات - يحمي من مشاكل JSON المعطوب
 */

class AttachmentValidator {
  
  /**
   * التحقق من صحة JSON للمرفقات
   */
  static validateAttachmentsJSON(attachments) {
    if (!attachments) return { isValid: true, data: null };
    
    try {
      // إذا كان string، جرب parse
      if (typeof attachments === 'string') {
        const parsed = JSON.parse(attachments);
        return { isValid: true, data: parsed };
      }
      
      // إذا كان object، جرب stringify ثم parse للتأكد
      if (typeof attachments === 'object') {
        const stringified = JSON.stringify(attachments);
        const parsed = JSON.parse(stringified);
        return { isValid: true, data: parsed };
      }
      
      return { isValid: false, error: 'Invalid attachments format' };
      
    } catch (error) {
      return { 
        isValid: false, 
        error: error.message,
        originalData: attachments 
      };
    }
  }
  
  /**
   * إصلاح المرفقات المعطوبة
   */
  static fixBrokenAttachments(attachments, contentUrl = null) {
    const validation = this.validateAttachmentsJSON(attachments);
    
    if (validation.isValid) {
      return validation.data;
    }
    
    //console.log('🔧 [ATTACHMENT-FIX] Attempting to fix broken attachments...');
    //console.log('❌ [ATTACHMENT-FIX] Error:', validation.error);
    
    // محاولة استخراج URL من البيانات المعطوبة
    if (typeof attachments === 'string') {
      // البحث عن URLs في النص
      const urlMatches = attachments.match(/https?:\/\/[^\s"'}]+/g);
      
      if (urlMatches && urlMatches.length > 0) {
        //console.log('🔧 [ATTACHMENT-FIX] Found URLs in broken data:', urlMatches.length);
        
        return urlMatches.map(url => ({
          type: this.guessAttachmentType(url),
          url: this.cleanUrl(url),
          title: null,
          recovered: true
        }));
      }
    }
    
    // إذا كان لدينا content URL، استخدمه
    if (contentUrl) {
      //console.log('🔧 [ATTACHMENT-FIX] Using content URL as fallback');
      return [{
        type: this.guessAttachmentType(contentUrl),
        url: this.cleanUrl(contentUrl),
        title: null,
        recovered: true
      }];
    }
    
    // إذا فشل كل شيء، ارجع null
    //console.log('❌ [ATTACHMENT-FIX] Could not recover attachments');
    return null;
  }
  
  /**
   * تنظيف URL من الأحرف الغريبة
   */
  static cleanUrl(url) {
    if (!url) return null;
    
    // إزالة الأحرف الغريبة من نهاية URL
    return url.replace(/[^a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]+$/, '');
  }
  
  /**
   * تخمين نوع المرفق من URL
   */
  static guessAttachmentType(url) {
    if (!url) return 'unknown';
    
    const lowerUrl = url.toLowerCase();
    
    if (lowerUrl.includes('image') || lowerUrl.includes('.jpg') || 
        lowerUrl.includes('.png') || lowerUrl.includes('.gif') ||
        lowerUrl.includes('fbcdn.net')) {
      return 'image';
    }
    
    if (lowerUrl.includes('video') || lowerUrl.includes('.mp4') || 
        lowerUrl.includes('.mov')) {
      return 'video';
    }
    
    if (lowerUrl.includes('audio') || lowerUrl.includes('.mp3') || 
        lowerUrl.includes('.wav')) {
      return 'audio';
    }
    
    return 'file';
  }
  
  /**
   * إنشاء مرفقات آمنة
   */
  static createSafeAttachments(attachments) {
    if (!attachments || !Array.isArray(attachments)) {
      return null;
    }
    
    const safeAttachments = attachments.map(att => ({
      type: att.type || 'unknown',
      url: this.truncateUrl(att.payload?.url || att.url),
      title: att.payload?.title || att.title || null,
      metadata: {
        originalUrl: att.payload?.url || att.url,
        timestamp: new Date().toISOString()
      }
    }));
    
    // التأكد من أن JSON صالح
    try {
      const jsonString = JSON.stringify(safeAttachments);
      JSON.parse(jsonString); // اختبار parse
      return safeAttachments;
    } catch (error) {
      //console.log('❌ [ATTACHMENT-SAFE] Failed to create safe JSON:', error.message);
      return null;
    }
  }
  
  /**
   * قطع URL إلى حد آمن
   */
  static truncateUrl(url, maxLength = 1000) {
    if (!url) return null;
    
    if (url.length <= maxLength) {
      return url;
    }
    
    //console.log(`⚠️ [URL-TRUNCATE] URL too long (${url.length} chars), truncating to ${maxLength}`);
    return url.substring(0, maxLength);
  }
  
  /**
   * فحص شامل للرسالة قبل الحفظ
   */
  static validateMessageBeforeSave(messageData) {
    const result = {
      isValid: true,
      warnings: [],
      fixes: []
    };
    
    // فحص المحتوى
    if (messageData.content && messageData.content.length > 2000) {
      result.warnings.push(`Content too long: ${messageData.content.length} chars`);
      messageData.content = messageData.content.substring(0, 2000);
      result.fixes.push('Content truncated to 2000 chars');
    }
    
    // فحص المرفقات
    if (messageData.attachments) {
      const validation = this.validateAttachmentsJSON(messageData.attachments);
      
      if (!validation.isValid) {
        result.warnings.push(`Invalid attachments JSON: ${validation.error}`);
        
        const fixed = this.fixBrokenAttachments(
          messageData.attachments, 
          messageData.content
        );
        
        if (fixed) {
          messageData.attachments = JSON.stringify(fixed);
          result.fixes.push('Attachments recovered and fixed');
        } else {
          messageData.attachments = null;
          result.fixes.push('Attachments cleared (could not recover)');
        }
      }
    }
    
    return result;
  }
}

module.exports = AttachmentValidator;
