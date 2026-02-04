/**
 * 🔐 Encryption Utilities
 * أدوات تشفير البيانات الحساسة
 */

const crypto = require('crypto');

// مفتاح التشفير من متغيرات البيئة
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const TAG_POSITION = SALT_LENGTH + IV_LENGTH;
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH;

/**
 * تشفير نص
 */
function encrypt(text) {
  if (!text) return null;

  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);

    const key = crypto.pbkdf2Sync(
      Buffer.from(ENCRYPTION_KEY, 'hex'),
      salt,
      100000,
      32,
      'sha512'
    );

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(String(text), 'utf8'),
      cipher.final()
    ]);

    const tag = cipher.getAuthTag();

    return Buffer.concat([salt, iv, tag, encrypted]).toString('base64');
  } catch (error) {
    console.error('❌ Encryption error:', error);
    throw new Error('فشل تشفير البيانات');
  }
}

/**
 * فك تشفير نص
 */
function decrypt(encryptedText) {
  if (!encryptedText) return null;

  try {
    const buffer = Buffer.from(encryptedText, 'base64');

    const salt = buffer.slice(0, SALT_LENGTH);
    const iv = buffer.slice(SALT_LENGTH, TAG_POSITION);
    const tag = buffer.slice(TAG_POSITION, ENCRYPTED_POSITION);
    const encrypted = buffer.slice(ENCRYPTED_POSITION);

    const key = crypto.pbkdf2Sync(
      Buffer.from(ENCRYPTION_KEY, 'hex'),
      salt,
      100000,
      32,
      'sha512'
    );

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    return decipher.update(encrypted) + decipher.final('utf8');
  } catch (error) {
    console.error('❌ Decryption error:', error);
    throw new Error('فشل فك تشفير البيانات');
  }
}

/**
 * تشفير رقم الهوية
 */
function encryptNationalId(nationalId) {
  return encrypt(nationalId);
}

/**
 * فك تشفير رقم الهوية
 */
function decryptNationalId(encryptedNationalId) {
  return decrypt(encryptedNationalId);
}

/**
 * تشفير رقم الحساب البنكي
 */
function encryptBankAccount(accountNumber) {
  return encrypt(accountNumber);
}

/**
 * فك تشفير رقم الحساب البنكي
 */
function decryptBankAccount(encryptedAccountNumber) {
  return decrypt(encryptedAccountNumber);
}

/**
 * تشفير IBAN
 */
function encryptIBAN(iban) {
  return encrypt(iban);
}

/**
 * فك تشفير IBAN
 */
function decryptIBAN(encryptedIBAN) {
  return decrypt(encryptedIBAN);
}

/**
 * إخفاء جزء من النص (للعرض فقط)
 */
function maskText(text, visibleChars = 4) {
  if (!text) return '';
  if (text.length <= visibleChars) return text;
  
  const masked = '*'.repeat(text.length - visibleChars);
  return masked + text.slice(-visibleChars);
}

/**
 * إخفاء رقم الهوية (عرض آخر 4 أرقام فقط)
 */
function maskNationalId(nationalId) {
  return maskText(nationalId, 4);
}

/**
 * إخفاء رقم الحساب البنكي (عرض آخر 4 أرقام فقط)
 */
function maskBankAccount(accountNumber) {
  return maskText(accountNumber, 4);
}

/**
 * إخفاء البريد الإلكتروني
 */
function maskEmail(email) {
  if (!email) return '';
  const [username, domain] = email.split('@');
  if (!domain) return email;
  
  const maskedUsername = username.length > 2 
    ? username[0] + '*'.repeat(username.length - 2) + username[username.length - 1]
    : username;
  
  return `${maskedUsername}@${domain}`;
}

/**
 * إخفاء رقم الهاتف (عرض أول 3 وآخر 2 رقم)
 */
function maskPhone(phone) {
  if (!phone) return '';
  if (phone.length <= 5) return phone;
  
  const start = phone.slice(0, 3);
  const end = phone.slice(-2);
  const masked = '*'.repeat(phone.length - 5);
  
  return `${start}${masked}${end}`;
}

/**
 * Hash كلمة مرور (للمقارنة فقط)
 */
function hashPassword(password) {
  return crypto
    .createHash('sha256')
    .update(password)
    .digest('hex');
}

/**
 * توليد مفتاح تشفير عشوائي
 */
function generateEncryptionKey() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = {
  encrypt,
  decrypt,
  encryptNationalId,
  decryptNationalId,
  encryptBankAccount,
  decryptBankAccount,
  encryptIBAN,
  decryptIBAN,
  maskText,
  maskNationalId,
  maskBankAccount,
  maskEmail,
  maskPhone,
  hashPassword,
  generateEncryptionKey
};
