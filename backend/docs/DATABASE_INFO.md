# 📊 معلومات قاعدة البيانات

## نوع قاعدة البيانات
**MySQL**

## اسم قاعدة البيانات
**`u339372869_test2`**

## تفاصيل الاتصال

### الإعداد الافتراضي:
- **Provider:** MySQL
- **Database Name:** `u339372869_test2`
- **Port:** 3306
- **Character Set:** utf8mb4
- **Collation:** utf8mb4_unicode_ci

### الاتصال المحلي (Local):
```
Host: localhost
Port: 3306
Database: u339372869_test2
User: root أو appuser (حسب الإعداد)
```

### الاتصال البعيد (Remote) - إذا كان مُستخدم:
```
Host: 92.113.22.70
Port: 3306
Database: u339372869_test2
User: u339372869_test2
Password: 0165676135Aa@A
```

## ملف الإعدادات

### Prisma Schema:
- **الملف:** `backend/prisma/schema.prisma`
- **Provider:** `mysql`
- **URL:** من متغير البيئة `DATABASE_URL`

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

### متغير البيئة:
الـ DATABASE_URL يجب أن يكون في ملف `.env` في مجلد `backend/`

#### مثال للاتصال المحلي:
```env
DATABASE_URL=mysql://root@localhost:3306/u339372869_test2?charset=utf8mb4&collation=utf8mb4_unicode_ci&connect_timeout=120&pool_timeout=120&timeout=120
```

#### مثال للاتصال المحلي (مع كلمة مرور):
```env
DATABASE_URL=mysql://root:your_password@localhost:3306/u339372869_test2?charset=utf8mb4&collation=utf8mb4_unicode_ci&connect_timeout=120&pool_timeout=120&timeout=120
```

#### مثال للاتصال البعيد:
```env
DATABASE_URL=mysql://u339372869_test2:0165676135Aa%40A@92.113.22.70:3306/u339372869_test2?charset=utf8mb4&collation=utf8mb4_unicode_ci&connect_timeout=120&pool_timeout=120&timeout=120
```

## إعدادات الاتصال (Connection Settings)

### Timeouts:
- **Connection Timeout:** 120 seconds
- **Pool Timeout:** 120 seconds
- **Query Timeout:** 120 seconds
- **Acquire Timeout:** 120000 milliseconds (120 seconds)

### Connection Pool:
- **Connection Limit:** 100 connections
- **Max Concurrent Queries:** 100 queries
- **Create Retry Interval:** 2000 milliseconds

## الملفات المتعلقة

### ملفات الإعداد:
1. `backend/prisma/schema.prisma` - Prisma schema
2. `backend/services/sharedDatabase.js` - Database service
3. `backend/config/environment.js` - Environment configuration
4. `backend/.env` - Environment variables (يجب إنشاؤه)

### ملفات التوثيق:
1. `backend/FIX_LOCAL_DATABASE.md` - حل مشاكل قاعدة البيانات المحلية
2. `backend/FIX_MYSQL_AUTH.md` - حل مشاكل المصادقة
3. `backend/UPDATE_DATABASE_TIMEOUTS.md` - تحديث timeouts
4. `backend/FINAL_FIX_TIMEOUTS.md` - الإصلاح النهائي

### سكريبتات الاختبار:
1. `backend/scripts/test-db-connection.js` - اختبار الاتصال
2. `backend/scripts/sync-super-admin-data.js` - مزامنة البيانات
3. `backend/scripts/fix-mysql-auth.js` - إصلاح المصادقة

## كيف تتحقق من قاعدة البيانات المستخدمة حالياً؟

### 1. تحقق من ملف .env:
```bash
cd backend
cat .env | grep DATABASE_URL
```

### 2. تحقق من logs السيرفر:
عند بدء السيرفر، سيظهر في الـ logs:
```
🔧 [SharedDB] Creating stable PrismaClient...
✅ [SharedDB] PrismaClient instance created successfully
```

### 3. اختبار الاتصال:
```bash
cd backend
node scripts/test-db-connection.js
```

### 4. من الكود:
افتح `backend/services/sharedDatabase.js` وتحقق من:
```javascript
const databaseUrl = process.env.DATABASE_URL;
```

## ملاحظات مهمة

1. **ملف .env:**
   - يجب إنشاء ملف `.env` في مجلد `backend/` إذا لم يكن موجوداً
   - يجب أن يحتوي على `DATABASE_URL`

2. **الصلاحيات:**
   - تأكد من أن المستخدم لديه صلاحيات كاملة على قاعدة البيانات
   - للمستخدم `u339372869_test2`: لديه صلاحيات كاملة

3. **قاعدة البيانات المحلية vs البعيدة:**
   - المشروع يمكنه العمل على قاعدة بيانات محلية أو بعيدة
   - الاتصال البعيد يستخدم host: `92.113.22.70`
   - الاتصال المحلي يستخدم host: `localhost`

4. **Character Set:**
   - يستخدم `utf8mb4` لدعم جميع الأحرف العربية والرموز
   - Collation: `utf8mb4_unicode_ci`

## كيفية التحويل بين المحلي والبعيد

### للتحويل إلى قاعدة بيانات محلية:
1. أنشئ قاعدة بيانات محلية:
```sql
CREATE DATABASE IF NOT EXISTS u339372869_test2 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. عدل `.env`:
```env
DATABASE_URL=mysql://root@localhost:3306/u339372869_test2?charset=utf8mb4&collation=utf8mb4_unicode_ci&connect_timeout=120&pool_timeout=120&timeout=120
```

3. شغل migrations:
```bash
cd backend
npx prisma migrate deploy
```

### للتحويل إلى قاعدة بيانات بعيدة:
1. عدل `.env`:
```env
DATABASE_URL=mysql://u339372869_test2:0165676135Aa%40A@92.113.22.70:3306/u339372869_test2?charset=utf8mb4&collation=utf8mb4_unicode_ci&connect_timeout=120&pool_timeout=120&timeout=120
```

2. أعد تشغيل السيرفر

---

**آخر تحديث:** 20 نوفمبر 2025

