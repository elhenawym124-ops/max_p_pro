/**
 * 🔐 Multi-Tenant Encryption Utilities
 * نظام تشفير متعدد المستأجرين - كل شركة لها مفتاح خاص
 */

const crypto = require('crypto');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

// Master Key من البيئة (لتشفير مفاتيح الشركات)
const MASTER_KEY = process.env.MASTER_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const TAG_POSITION = SALT_LENGTH + IV_LENGTH;
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH;

// Cache لمفاتيح الشركات (لتحسين الأداء)
const companyKeysCache = new Map();
const CACHE_TTL = 3600000; // ساعة واحدة

/**
 * الحصول على مفتاح التشفير الخاص بالشركة
 */
async function getCompanyEncryptionKey(companyId) {
  // التحقق من الـ Cache
  const cached = companyKeysCache.get(companyId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.key;
  }

  const prisma = getSharedPrismaClient();

  try {
    // البحث عن مفتاح الشركة في قاعدة البيانات
    let companyKey = await prisma.companyEncryptionKey.findUnique({
      where: { companyId }
    });

    // إذا لم يوجد، أنشئ مفتاح جديد
    if (!companyKey) {
      const newKey = crypto.randomBytes(32).toString('hex');
      const encryptedKey = encryptWithMasterKey(newKey);

      companyKey = await prisma.companyEncryptionKey.create({
        data: {
          companyId,
          encryptedKey,
          createdAt: new Date()
        }
      });
    }

    // فك تشفير المفتاح باستخدام Master Key
    const decryptedKey = decryptWithMasterKey(companyKey.encryptedKey);

    // حفظ في الـ Cache
    companyKeysCache.set(companyId, {
      key: decryptedKey,
      timestamp: Date.now()
    });

    return decryptedKey;
  } catch (error) {
    console.error('❌ Error getting company encryption key:', error);
    throw new Error('فشل الحصول على مفتاح التشفير');
  }
}

/**
 * تشفير باستخدام Master Key
 */
function encryptWithMasterKey(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);

  const key = crypto.pbkdf2Sync(
    Buffer.from(MASTER_KEY, 'hex'),
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
}

/**
 * فك تشفير باستخدام Master Key
 */
function decryptWithMasterKey(encryptedText) {
  const buffer = Buffer.from(encryptedText, 'base64');

  const salt = buffer.slice(0, SALT_LENGTH);
  const iv = buffer.slice(SALT_LENGTH, TAG_POSITION);
  const tag = buffer.slice(TAG_POSITION, ENCRYPTED_POSITION);
  const encrypted = buffer.slice(ENCRYPTED_POSITION);

  const key = crypto.pbkdf2Sync(
    Buffer.from(MASTER_KEY, 'hex'),
    salt,
    100000,
    32,
    'sha512'
  );

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return decipher.update(encrypted) + decipher.final('utf8');
}

/**
 * تشفير نص باستخدام مفتاح الشركة
 */
async function encrypt(companyId, text) {
  if (!text) return null;

  try {
    const companyKey = await getCompanyEncryptionKey(companyId);

    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);

    const key = crypto.pbkdf2Sync(
      Buffer.from(companyKey, 'hex'),
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
 * فك تشفير نص باستخدام مفتاح الشركة
 */
async function decrypt(companyId, encryptedText) {
  if (!encryptedText) return null;

  try {
    const companyKey = await getCompanyEncryptionKey(companyId);

    const buffer = Buffer.from(encryptedText, 'base64');

    const salt = buffer.slice(0, SALT_LENGTH);
    const iv = buffer.slice(SALT_LENGTH, TAG_POSITION);
    const tag = buffer.slice(TAG_POSITION, ENCRYPTED_POSITION);
    const encrypted = buffer.slice(ENCRYPTED_POSITION);

    const key = crypto.pbkdf2Sync(
      Buffer.from(companyKey, 'hex'),
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
async function encryptNationalId(companyId, nationalId) {
  return encrypt(companyId, nationalId);
}

/**
 * فك تشفير رقم الهوية
 */
async function decryptNationalId(companyId, encryptedNationalId) {
  return decrypt(companyId, encryptedNationalId);
}

/**
 * تشفير رقم الحساب البنكي
 */
async function encryptBankAccount(companyId, accountNumber) {
  return encrypt(companyId, accountNumber);
}

/**
 * فك تشفير رقم الحساب البنكي
 */
async function decryptBankAccount(companyId, encryptedAccountNumber) {
  return decrypt(companyId, encryptedAccountNumber);
}

/**
 * تدوير مفتاح الشركة (Key Rotation)
 */
async function rotateCompanyKey(companyId) {
  const prisma = getSharedPrismaClient();

  try {
    // توليد مفتاح جديد
    const newKey = crypto.randomBytes(32).toString('hex');
    const encryptedNewKey = encryptWithMasterKey(newKey);

    // الحصول على المفتاح القديم
    const oldKeyRecord = await prisma.companyEncryptionKey.findUnique({
      where: { companyId }
    });

    if (!oldKeyRecord) {
      throw new Error('لا يوجد مفتاح قديم');
    }

    const oldKey = decryptWithMasterKey(oldKeyRecord.encryptedKey);

    // جلب جميع البيانات المشفرة للشركة
    const employees = await prisma.employee.findMany({
      where: { companyId },
      select: { id: true, nationalId: true, bankAccountNumber: true, bankIban: true }
    });

    // إعادة تشفير البيانات بالمفتاح الجديد
    for (const employee of employees) {
      const updates = {};

      if (employee.nationalId) {
        const decrypted = await decrypt(companyId, employee.nationalId);
        updates.nationalId = await encryptWithKey(newKey, decrypted);
      }

      if (employee.bankAccountNumber) {
        const decrypted = await decrypt(companyId, employee.bankAccountNumber);
        updates.bankAccountNumber = await encryptWithKey(newKey, decrypted);
      }

      if (employee.bankIban) {
        const decrypted = await decrypt(companyId, employee.bankIban);
        updates.bankIban = await encryptWithKey(newKey, decrypted);
      }

      if (Object.keys(updates).length > 0) {
        await prisma.employee.update({
          where: { id: employee.id },
          data: updates
        });
      }
    }

    // تحديث المفتاح في قاعدة البيانات
    await prisma.companyEncryptionKey.update({
      where: { companyId },
      data: {
        encryptedKey: encryptedNewKey,
        rotatedAt: new Date()
      }
    });

    // مسح الـ Cache
    companyKeysCache.delete(companyId);

    console.log(`✅ تم تدوير مفتاح التشفير للشركة ${companyId}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error rotating company key:', error);
    throw error;
  }
}

/**
 * تشفير بمفتاح محدد (للاستخدام الداخلي)
 */
function encryptWithKey(key, text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);

  const derivedKey = crypto.pbkdf2Sync(
    Buffer.from(key, 'hex'),
    salt,
    100000,
    32,
    'sha512'
  );

  const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);
  const encrypted = Buffer.concat([
    cipher.update(String(text), 'utf8'),
    cipher.final()
  ]);

  const tag = cipher.getAuthTag();
  return Buffer.concat([salt, iv, tag, encrypted]).toString('base64');
}

/**
 * مسح الـ Cache (للاستخدام عند الحاجة)
 */
function clearCache(companyId = null) {
  if (companyId) {
    companyKeysCache.delete(companyId);
  } else {
    companyKeysCache.clear();
  }
}

module.exports = {
  encrypt,
  decrypt,
  encryptNationalId,
  decryptNationalId,
  encryptBankAccount,
  decryptBankAccount,
  getCompanyEncryptionKey,
  rotateCompanyKey,
  clearCache
};
