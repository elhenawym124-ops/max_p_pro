/**
 * Slug Validation Utilities
 * For validating and sanitizing company slugs
 */

/**
 * Reserved slugs that cannot be used by companies
 */
const RESERVED_SLUGS = [
  'www',
  'api',
  'admin',
  'dashboard',
  'app',
  'cdn',
  'static',
  'assets',
  'images',
  'uploads',
  'public',
  'private',
  'auth',
  'login',
  'signup',
  'register',
  'logout',
  'settings',
  'profile',
  'account',
  'billing',
  'payments',
  'checkout',
  'cart',
  'order',
  'orders',
  'product',
  'products',
  'category',
  'categories',
  'blog',
  'news',
  'help',
  'support',
  'contact',
  'about',
  'terms',
  'privacy',
  'mail',
  'email',
  'smtp',
  'ftp',
  'ssh',
  'vpn',
  'proxy',
  'gateway',
  'webhook',
  'webhooks',
  'test',
  'demo',
  'staging',
  'dev',
  'development',
  'prod',
  'production'
];

/**
 * Validate slug format
 * @param {string} slug - The slug to validate
 * @returns {Object} - { valid: boolean, error: string }
 */
function validateSlugFormat(slug) {
  // Check if slug is empty
  if (!slug || slug.trim() === '') {
    return {
      valid: false,
      error: 'الـ slug لا يمكن أن يكون فارغاً'
    };
  }

  // Check minimum length
  if (slug.length < 3) {
    return {
      valid: false,
      error: 'الـ slug يجب أن يكون 3 أحرف على الأقل'
    };
  }

  // Check maximum length
  if (slug.length > 50) {
    return {
      valid: false,
      error: 'الـ slug يجب ألا يتجاوز 50 حرفاً'
    };
  }

  // Check format (only lowercase letters, numbers, and hyphens)
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (!slugRegex.test(slug)) {
    return {
      valid: false,
      error: 'الـ slug يجب أن يحتوي على أحرف صغيرة وأرقام وشرطات فقط'
    };
  }

  // Check if starts or ends with hyphen
  if (slug.startsWith('-') || slug.endsWith('-')) {
    return {
      valid: false,
      error: 'الـ slug لا يمكن أن يبدأ أو ينتهي بشرطة'
    };
  }

  // Check if contains consecutive hyphens
  if (slug.includes('--')) {
    return {
      valid: false,
      error: 'الـ slug لا يمكن أن يحتوي على شرطات متتالية'
    };
  }

  return { valid: true };
}

/**
 * Check if slug is reserved
 * @param {string} slug - The slug to check
 * @returns {boolean}
 */
function isReservedSlug(slug) {
  return RESERVED_SLUGS.includes(slug.toLowerCase());
}

/**
 * Sanitize slug (convert to valid format)
 * @param {string} input - The input string to sanitize
 * @returns {string} - Sanitized slug
 */
function sanitizeSlug(input) {
  if (!input) return '';

  return input
    .toLowerCase()
    .trim()
    // Replace Arabic characters with English equivalents
    .replace(/ا/g, 'a')
    .replace(/ب/g, 'b')
    .replace(/ت/g, 't')
    .replace(/ث/g, 'th')
    .replace(/ج/g, 'j')
    .replace(/ح/g, 'h')
    .replace(/خ/g, 'kh')
    .replace(/د/g, 'd')
    .replace(/ذ/g, 'th')
    .replace(/ر/g, 'r')
    .replace(/ز/g, 'z')
    .replace(/س/g, 's')
    .replace(/ش/g, 'sh')
    .replace(/ص/g, 's')
    .replace(/ض/g, 'd')
    .replace(/ط/g, 't')
    .replace(/ظ/g, 'z')
    .replace(/ع/g, 'a')
    .replace(/غ/g, 'gh')
    .replace(/ف/g, 'f')
    .replace(/ق/g, 'q')
    .replace(/ك/g, 'k')
    .replace(/ل/g, 'l')
    .replace(/م/g, 'm')
    .replace(/ن/g, 'n')
    .replace(/ه/g, 'h')
    .replace(/و/g, 'w')
    .replace(/ي/g, 'y')
    .replace(/ة/g, 'a')
    .replace(/ى/g, 'a')
    .replace(/ء/g, '')
    .replace(/أ/g, 'a')
    .replace(/إ/g, 'i')
    .replace(/آ/g, 'a')
    .replace(/ؤ/g, 'o')
    .replace(/ئ/g, 'e')
    // Replace spaces with hyphens
    .replace(/\s+/g, '-')
    // Remove all non-alphanumeric characters except hyphens
    .replace(/[^\w\-]+/g, '')
    // Replace multiple hyphens with single hyphen
    .replace(/\-\-+/g, '-')
    // Trim hyphens from start and end
    .replace(/^-+/, '')
    .replace(/-+$/, '')
    // Limit length
    .substring(0, 50);
}

/**
 * Full slug validation (format + reserved)
 * @param {string} slug - The slug to validate
 * @returns {Object} - { valid: boolean, error: string }
 */
function validateSlug(slug) {
  // Check format
  const formatCheck = validateSlugFormat(slug);
  if (!formatCheck.valid) {
    return formatCheck;
  }

  // Check if reserved
  if (isReservedSlug(slug)) {
    return {
      valid: false,
      error: 'هذا الاسم محجوز ولا يمكن استخدامه'
    };
  }

  return { valid: true };
}

/**
 * Generate slug suggestion from company name
 * @param {string} name - Company name
 * @returns {string} - Suggested slug
 */
function suggestSlug(name) {
  const sanitized = sanitizeSlug(name);
  
  // If sanitized is empty or too short, return a default
  if (!sanitized || sanitized.length < 3) {
    return `store-${Date.now()}`;
  }

  return sanitized;
}

module.exports = {
  RESERVED_SLUGS,
  validateSlugFormat,
  isReservedSlug,
  sanitizeSlug,
  validateSlug,
  suggestSlug
};
