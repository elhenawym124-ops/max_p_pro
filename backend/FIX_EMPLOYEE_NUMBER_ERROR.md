# 🔧 حل مشكلة Missing Columns في جدول Users

## 📋 المشكلة

```
PrismaClientKnownRequestError: Invalid `prisma.user.findUnique()` invocation:
The column `maxp.users.employeeNumber` does not exist in the current database.
```

أو

```
The column `maxp.users.departmentId` does not exist in the current database.
```

**السبب:**
- هناك عدة أعمدة موجودة في ملف `schema.prisma` في نموذج `User`
- لكن هذه الأعمدة غير موجودة في قاعدة البيانات الفعلية
- هذا يعني أن الـ schema غير متزامن مع قاعدة البيانات

**الأعمدة المفقودة المحتملة:**
- `employeeNumber`
- `departmentId`
- `positionId`
- `hireDate`
- `contractType`
- `baseSalary`
- `skills`
- `department`
- `availability`

## ✅ الحلول

### الحل 1: استخدام Script الإصلاح الشامل (موصى به) ⭐

```bash
cd backend
node scripts/fix_employee_number_column.js
```

هذا الـ script سيقوم بـ:
- التحقق من وجود جميع الأعمدة المطلوبة
- إضافة جميع الأعمدة المفقودة تلقائياً
- إعطاء تقرير شامل عن العملية
- التحقق من نجاح العملية

**الأعمدة التي سيتم إضافتها:**
- `employeeNumber` (VARCHAR)
- `departmentId` (VARCHAR)
- `positionId` (VARCHAR)
- `hireDate` (DATETIME)
- `contractType` (VARCHAR)
- `baseSalary` (DECIMAL)
- `skills` (TEXT)
- `department` (VARCHAR)
- `availability` (VARCHAR)

### الحل 2: استخدام Prisma Migrate

```bash
cd backend

# إنشاء migration جديد
npx prisma migrate dev --name add_employee_number_to_user

# أو في production
npx prisma migrate deploy
```

### الحل 3: استخدام Prisma DB Push (للتطوير فقط)

```bash
cd backend
npx prisma db push
```

⚠️ **تحذير:** `db push` لا ينشئ migrations، استخدمه فقط في بيئة التطوير.

### الحل 4: إضافة الأعمدة يدوياً (SQL)

إذا كنت تفضل إضافة الأعمدة يدوياً:

```sql
-- إضافة جميع الأعمدة المفقودة
ALTER TABLE users 
ADD COLUMN employeeNumber VARCHAR(255) NULL,
ADD COLUMN departmentId VARCHAR(191) NULL,
ADD COLUMN positionId VARCHAR(191) NULL,
ADD COLUMN hireDate DATETIME(3) NULL,
ADD COLUMN contractType VARCHAR(191) NULL,
ADD COLUMN baseSalary DECIMAL(12, 2) NULL,
ADD COLUMN skills TEXT NULL,
ADD COLUMN department VARCHAR(191) NULL,
ADD COLUMN availability VARCHAR(191) NULL DEFAULT 'available';
```

## 🔍 التحقق من الحل

بعد تطبيق أي حل، تحقق من:

1. **التحقق من وجود العمود:**
```sql
DESCRIBE users;
-- أو
SHOW COLUMNS FROM users LIKE 'employeeNumber';
```

2. **إعادة تشغيل Prisma Client:**
```bash
npx prisma generate
```

3. **إعادة تشغيل الخادم:**
```bash
npm restart
# أو
pm2 restart backend1
```

## 📝 ملاحظات

- جميع الحقول المضافة هي اختيارية (`nullable: true`)، لذلك يمكن أن تكون `NULL`
- بعد إضافة الأعمدة، قد تحتاج إلى تحديث البيانات الموجودة إذا لزم الأمر
- تأكد من عمل backup لقاعدة البيانات قبل أي تغييرات في production
- الـ script آمن للتشغيل عدة مرات - لن يحاول إضافة أعمدة موجودة بالفعل

## 🚨 إذا استمرت المشكلة

1. تحقق من أن الـ schema متزامن:
```bash
npx prisma db pull
```

2. تحقق من أن Prisma Client محدث:
```bash
npx prisma generate
```

3. تحقق من اتصال قاعدة البيانات في `.env`:
```env
DATABASE_URL="mysql://user:password@host:port/database"
```

