# 🔐 نظام التشفير المتعدد المستأجرين (Multi-Tenant Encryption)

## ✅ الحل الصحيح لـ SaaS

### 🎯 المشكلة
في نظام **Multi-Tenant SaaS**، استخدام مفتاح تشفير واحد لكل الشركات يعتبر **خطر أمني كبير**:

❌ **الحل الخاطئ:**
```env
# مفتاح واحد لكل الشركات - خطر!
ENCRYPTION_KEY=single-key-for-all-companies
```

**المخاطر:**
- إذا شركة واحدة اخترقت المفتاح → **كل الشركات في خطر**
- لا يمكن تغيير المفتاح لشركة واحدة
- مخالف لمبدأ **Data Isolation**
- مخالف لقوانين حماية البيانات (GDPR)

---

## ✅ الحل الصحيح

### البنية المعمارية (Architecture)

```
┌─────────────────────────────────────────────┐
│         MASTER_ENCRYPTION_KEY               │
│         (في .env فقط)                       │
│         يُستخدم لتشفير مفاتيح الشركات      │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│    company_encryption_keys (Database)       │
│  ┌─────────────────────────────────────┐   │
│  │ Company A → Encrypted Key A         │   │
│  │ Company B → Encrypted Key B         │   │
│  │ Company C → Encrypted Key C         │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│         Data Encryption                     │
│  ┌─────────────────────────────────────┐   │
│  │ Company A data → Key A              │   │
│  │ Company B data → Key B              │   │
│  │ Company C data → Key C              │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### المميزات

✅ **عزل كامل بين الشركات**
- كل شركة لها مفتاح تشفير خاص
- اختراق مفتاح شركة واحدة لا يؤثر على الباقي

✅ **Key Rotation**
- يمكن تدوير مفتاح شركة واحدة بدون التأثير على الباقي
- إعادة تشفير تلقائية للبيانات

✅ **Performance**
- Cache للمفاتيح (TTL: 1 ساعة)
- استعلامات سريعة

✅ **Security**
- Master Key لتشفير مفاتيح الشركات
- مفاتيح الشركات مشفرة في Database
- AES-256-GCM + PBKDF2 (100,000 iterations)

---

## 📋 الإعداد (Setup)

### 1. إضافة Master Key في `.env`

```env
# Master Key لتشفير مفاتيح الشركات (64 حرف hex)
MASTER_ENCRYPTION_KEY=your-64-character-hex-master-key-here
```

**توليد Master Key:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. تطبيق Migration

```bash
# تشغيل الـ SQL Migration
mysql -u username -p database_name < backend/prisma/migrations/add_company_encryption_keys.sql
```

أو إضافة Model في `schema.prisma`:
```prisma
model CompanyEncryptionKey {
  id           String   @id @default(cuid())
  companyId    String   @unique
  encryptedKey String   @db.Text
  createdAt    DateTime @default(now())
  rotatedAt    DateTime?
  updatedAt    DateTime @updatedAt
  
  company      Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  @@index([companyId])
  @@map("company_encryption_keys")
}
```

ثم:
```bash
npx prisma db push
```

---

## 💻 الاستخدام (Usage)

### تشفير البيانات

```javascript
const { encryptNationalId, encryptBankAccount } = require('../utils/encryptionMultiTenant');

// عند إنشاء موظف
async function createEmployee(companyId, data) {
  // تشفير رقم الهوية
  const encryptedNationalId = await encryptNationalId(companyId, data.nationalId);
  
  // تشفير الحساب البنكي
  const encryptedBankAccount = await encryptBankAccount(companyId, data.bankAccountNumber);
  
  const employee = await prisma.employee.create({
    data: {
      companyId,
      firstName: data.firstName,
      lastName: data.lastName,
      nationalId: encryptedNationalId,        // مشفر ✓
      bankAccountNumber: encryptedBankAccount, // مشفر ✓
      // ... باقي البيانات
    }
  });
  
  return employee;
}
```

### فك التشفير

```javascript
const { decryptNationalId, decryptBankAccount } = require('../utils/encryptionMultiTenant');

// عند قراءة بيانات الموظف
async function getEmployee(companyId, employeeId) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId }
  });
  
  // فك تشفير رقم الهوية
  if (employee.nationalId) {
    employee.nationalId = await decryptNationalId(companyId, employee.nationalId);
  }
  
  // فك تشفير الحساب البنكي
  if (employee.bankAccountNumber) {
    employee.bankAccountNumber = await decryptBankAccount(companyId, employee.bankAccountNumber);
  }
  
  return employee;
}
```

### للعرض فقط (Masking)

```javascript
const { maskNationalId, maskBankAccount } = require('../utils/encryption');

// عرض البيانات مخفية
const maskedId = maskNationalId('12345678901234');
// النتيجة: **********1234

const maskedAccount = maskBankAccount('1234567890');
// النتيجة: ******7890
```

---

## 🔄 تدوير المفاتيح (Key Rotation)

### متى تحتاج لتدوير المفتاح؟

- 🔴 **فوراً:** إذا تم اختراق المفتاح
- 🟡 **دورياً:** كل 6-12 شهر (Best Practice)
- 🟢 **اختيارياً:** عند طلب الشركة

### كيفية التدوير

```javascript
const { rotateCompanyKey } = require('../utils/encryptionMultiTenant');

// تدوير مفتاح شركة معينة
async function rotateKey(companyId) {
  try {
    await rotateCompanyKey(companyId);
    console.log('✅ تم تدوير المفتاح بنجاح');
  } catch (error) {
    console.error('❌ فشل تدوير المفتاح:', error);
  }
}
```

**ماذا يحدث عند التدوير؟**
1. توليد مفتاح جديد للشركة
2. جلب جميع البيانات المشفرة
3. فك التشفير بالمفتاح القديم
4. إعادة التشفير بالمفتاح الجديد
5. تحديث قاعدة البيانات
6. مسح الـ Cache

---

## 🔒 الأمان (Security Best Practices)

### 1. حماية Master Key

```bash
# ✅ صحيح
MASTER_ENCRYPTION_KEY=abc123...xyz  # في .env فقط

# ❌ خطأ
# لا تضعه في الكود
# لا ترفعه على Git
# لا تشاركه مع أحد
```

### 2. Backup

```bash
# احفظ Master Key في مكان آمن
# Password Manager (1Password, LastPass, etc.)
# Hardware Security Module (HSM) للـ Production
```

### 3. Access Control

```javascript
// فقط Admin يمكنه تدوير المفاتيح
router.post('/companies/:id/rotate-key', 
  requireAuth, 
  requireRole('SUPER_ADMIN'),
  async (req, res) => {
    // ...
  }
);
```

### 4. Audit Logging

```javascript
// سجل جميع عمليات التشفير/فك التشفير الحساسة
await auditLog.log({
  companyId,
  action: 'KEY_ROTATION',
  userId: req.user.id,
  metadata: { reason: 'Security audit' }
});
```

---

## 📊 المقارنة

| الميزة | الحل القديم (مفتاح واحد) | الحل الجديد (مفتاح لكل شركة) |
|--------|-------------------------|------------------------------|
| **الأمان** | ❌ ضعيف | ✅ قوي |
| **العزل** | ❌ لا يوجد | ✅ كامل |
| **Key Rotation** | ❌ يؤثر على الكل | ✅ لكل شركة |
| **الامتثال** | ❌ غير متوافق | ✅ متوافق |
| **الأداء** | ✅ سريع | ✅ سريع (مع Cache) |
| **التعقيد** | ✅ بسيط | ⚠️ متوسط |

---

## 🚀 الترحيل (Migration)

### إذا كان لديك بيانات مشفرة بالطريقة القديمة:

```javascript
// سكريبت الترحيل
async function migrateToMultiTenant() {
  const companies = await prisma.company.findMany();
  
  for (const company of companies) {
    console.log(`Migrating company: ${company.name}`);
    
    // جلب الموظفين
    const employees = await prisma.employee.findMany({
      where: { companyId: company.id }
    });
    
    for (const employee of employees) {
      if (employee.nationalId) {
        // فك التشفير بالطريقة القديمة
        const decrypted = oldDecrypt(employee.nationalId);
        
        // إعادة التشفير بالطريقة الجديدة
        const encrypted = await encryptNationalId(company.id, decrypted);
        
        // تحديث
        await prisma.employee.update({
          where: { id: employee.id },
          data: { nationalId: encrypted }
        });
      }
    }
    
    console.log(`✅ Migrated ${employees.length} employees`);
  }
}
```

---

## ⚠️ ملاحظات مهمة

1. **Master Key:**
   - لا تفقده أبداً = فقدان جميع البيانات
   - لا تغيره بعد بدء الاستخدام
   - احفظ نسخة احتياطية آمنة

2. **Performance:**
   - الـ Cache يحسن الأداء بشكل كبير
   - TTL = 1 ساعة (قابل للتعديل)
   - مسح الـ Cache بعد Key Rotation

3. **Testing:**
   - اختبر التشفير/فك التشفير
   - اختبر Key Rotation
   - اختبر الـ Cache

4. **Monitoring:**
   - راقب أداء التشفير
   - راقب حجم الـ Cache
   - راقب عمليات Key Rotation

---

## 📝 الخلاصة

### ✅ استخدم الحل الجديد لأنه:
- آمن لـ Multi-Tenant SaaS
- يحقق Data Isolation
- متوافق مع GDPR
- يدعم Key Rotation
- Professional و Enterprise-ready

### ❌ لا تستخدم الحل القديم لأنه:
- خطر أمني في SaaS
- لا يحقق العزل
- غير متوافق مع القوانين
- صعب الصيانة

---

**تم بحمد الله ✨**

الحل الصحيح لنظام Multi-Tenant SaaS جاهز للاستخدام!
