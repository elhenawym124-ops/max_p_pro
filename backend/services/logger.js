/**
 * نظام Logging موحد
 * Unified Logging System
 * 
 * يوفر نظام logging مركزي يمكن تفعيله/تعطيله من مكان واحد
 */

class Logger {
  constructor(serviceName = 'System') {
    this.serviceName = serviceName;
    // يمكن التحكم في تفعيل اللوجز من متغيرات البيئة
    this.isEnabled = process.env.ENABLE_LOGS !== 'false'; // enabled by default
    this.logLevel = process.env.LOG_LEVEL || 'info'; // debug, info, warn, error
  }

  /**
   * تحديد مستوى الأهمية
   */
  getLevelPriority(level) {
    const levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
    return levels[level] || 1;
  }

  /**
   * التحقق من إمكانية تسجيل الرسالة بناءً على المستوى
   */
  shouldLog(level) {
    if (!this.isEnabled) return false;
    return this.getLevelPriority(level) >= this.getLevelPriority(this.logLevel);
  }

  /**
   * تنسيق الرسالة
   */
  formatMessage(level, message) {
    const timestamp = new Date().toISOString();
    const emoji = {
      debug: '🔍',
      info: '✅',
      warn: '⚠️',
      error: '❌'
    }[level] || 'ℹ️';
    
    return `${emoji} [${timestamp}] [${level.toUpperCase()}] [${this.serviceName}] ${message}`;
  }

  /**
   * تسجيل رسالة debug
   */
  debug(message, data = null) {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message));
      if (data) console.log(data);
    }
  }

  /**
   * تسجيل رسالة info
   */
  info(message, data = null) {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message));
      if (data) console.log(data);
    }
  }

  /**
   * تسجيل رسالة warn
   */
  warn(message, data = null) {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message));
      if (data) console.warn(data);
    }
  }

  /**
   * تسجيل رسالة error
   */
  error(message, error = null) {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message));
      if (error) {
        if (error.stack) {
          console.error(error.stack);
        } else {
          console.error(error);
        }
      }
    }
  }

  /**
   * تسجيل رسالة عادية (للتوافق مع console.log القديم)
   */
  log(message, data = null) {
    this.info(message, data);
  }
}

// تصدير الـ class
module.exports = Logger;

// تصدير instance جاهز للاستخدام السريع
module.exports.createLogger = (serviceName) => new Logger(serviceName);

