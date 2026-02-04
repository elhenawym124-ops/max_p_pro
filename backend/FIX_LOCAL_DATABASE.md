# 🔧 حل مشكلة قاعدة البيانات المحلية على Windows

## المشاكل التي تم حلها:

1. ❌ **Connection String خاطئ**: استخدام socket path خاص بـ Linux على Windows
2. ❌ **الجداول غير موجودة**: قاعدة البيانات المحلية لا تحتوي على Schema
3. ❌ **Query Queue يتكدس**: بسبب فشل الاستعلامات (الجداول غير موجودة)

---

## ✅ الحل النهائي - خطوات سريعة:

### 1. إصلاح DATABASE_URL في ملف `.env`

افتح ملف `backend/.env` وغير `DATABASE_URL` إلى:

```env
DATABASE_URL=mysql://root@localhost:3306/u339372869_test2?charset=utf8mb4&collation=utf8mb4_unicode_ci&connect_timeout=30&pool_timeout=30
```

**ملاحظات مهمة:**
- ❌ **لا تستخدم** `socket=/var/run/mysqld/mysqld.sock` (هذا خاص بـ Linux)
- ✅ **استخدم** TCP connection مباشرة: `localhost:3306`
- إذا كان MySQL يحتاج كلمة مرور:
  ```env
  DATABASE_URL=mysql://root:your_password@localhost:3306/u339372869_test2?charset=utf8mb4&collation=utf8mb4_unicode_ci&connect_timeout=30&pool_timeout=30
  ```

### 2. إنشاء قاعدة البيانات (إذا لم تكن موجودة)

اتصل بـ MySQL وأنشئ قاعدة البيانات:

```sql
CREATE DATABASE IF NOT EXISTS u339372869_test2 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

أو من سطر الأوامر:
```bash
mysql -u root -e "CREATE DATABASE IF NOT EXISTS u339372869_test2 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### 3. تشغيل السكريبت التلقائي (الطريقة الموصى بها)

```bash
cd backend
node scripts/setup-local-database.js
```

هذا السكريبت سيقوم بـ:
- ✅ إصلاح connection string تلقائياً
- ✅ التحقق من الاتصال
- ✅ تشغيل migrations لإنشاء الجداول
- ✅ تحديث Prisma Client

### 4. أو تشغيل الأوامر يدوياً

```bash
cd backend

# تطبيق migrations
npx prisma migrate deploy

# تحديث Prisma Client
npx prisma generate
```

---

## 🔍 التحقق من الحل:

### 1. التحقق من الاتصال:
```bash
cd backend
node -e "require('dotenv').config(); const {PrismaClient} = require('@prisma/client'); const p = new PrismaClient(); p.\$connect().then(() => {console.log('✅ الاتصال نجح!'); p.\$disconnect();}).catch(e => {console.error('❌ خطأ:', e.message);});"
```

### 2. التحقق من وجود الجداول:
```bash
cd backend
node -e "require('dotenv').config(); const {PrismaClient} = require('@prisma/client'); const p = new PrismaClient(); p.\$queryRaw\`SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()\`.then(tables => {console.log('الجداول:', tables.map(t => t.TABLE_NAME)); p.\$disconnect();}).catch(e => console.error('❌ خطأ:', e.message));"
```

### 3. التحقق من جدول gemini_key_models:
```bash
cd backend
node -e "require('dotenv').config(); const {PrismaClient} = require('@prisma/client'); const p = new PrismaClient(); p.\$queryRaw\`SHOW TABLES LIKE 'gemini_key_models'\`.then(r => {console.log(r.length > 0 ? '✅ الجدول موجود' : '❌ الجدول غير موجود'); p.\$disconnect();}).catch(e => console.error('❌ خطأ:', e.message));"
```

---

## 🚨 حل مشاكل شائعة:

### المشكلة 1: "Access denied for user" أو "ERROR 28000 (1698)"
**السبب:** على Linux، عادة ما يستخدم `root` `auth_socket` plugin بدلاً من كلمة المرور.

**الحلول:**

#### الحل 1: استخدام Socket (لـ root على Linux)
```env
DATABASE_URL=mysql://root@localhost/u339372869_test2?socket=/var/run/mysqld/mysqld.sock&charset=utf8mb4&collation=utf8mb4_unicode_ci
```

#### الحل 2: إنشاء مستخدم جديد (موصى به)
```bash
# شغل السكريبت التلقائي
node scripts/fix-mysql-auth.js

# أو يدوياً:
mysql -u root -e "CREATE USER IF NOT EXISTS 'appuser'@'localhost' IDENTIFIED BY 'your_password';"
mysql -u root -e "GRANT ALL PRIVILEGES ON u339372869_test2.* TO 'appuser'@'localhost';"
mysql -u root -e "FLUSH PRIVILEGES;"
```

ثم استخدم:
```env
DATABASE_URL=mysql://appuser:your_password@localhost:3306/u339372869_test2?charset=utf8mb4&collation=utf8mb4_unicode_ci&connect_timeout=30&pool_timeout=30
```

#### الحل 3: تغيير root لاستخدام كلمة مرور
```bash
mysql -u root -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_password';"
mysql -u root -e "FLUSH PRIVILEGES;"
```

ثم استخدم:
```env
DATABASE_URL=mysql://root:your_password@localhost:3306/u339372869_test2?charset=utf8mb4&collation=utf8mb4_unicode_ci&connect_timeout=30&pool_timeout=30
```

### المشكلة 2: "Can't connect to MySQL server"
**الحل:**
- تأكد من أن MySQL يعمل: `mysql -u root -p`
- تأكد من المنفذ (افتراضي 3306)
- إذا كان MySQL على منفذ مختلف، غير في connection string

### المشكلة 3: "Database does not exist"
**الحل:**
```sql
CREATE DATABASE u339372869_test2 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### المشكلة 4: "Table doesn't exist" بعد migrations
**الحل:**
```bash
cd backend
npx prisma migrate reset  # يحذف كل شيء ويعيد إنشاؤه (⚠️ يحذف البيانات!)
# أو
npx prisma migrate deploy --force
```

### المشكلة 5: Query Queue يتكدس
**الحل:**
- بعد إصلاح connection string وإنشاء الجداول، أعد تشغيل السيرفر
- السيرفر سيعيد الاتصال تلقائياً

---

## 📋 مقارنة Connection Strings:

### ❌ خاطئ (Linux socket على Windows):
```env
DATABASE_URL=mysql://root@localhost/u339372869_test2?socket=/var/run/mysqld/mysqld.sock&charset=utf8mb4
```

### ✅ صحيح (Windows TCP):
```env
DATABASE_URL=mysql://root@localhost:3306/u339372869_test2?charset=utf8mb4&collation=utf8mb4_unicode_ci&connect_timeout=30&pool_timeout=30
```

### ✅ صحيح (مع كلمة مرور):
```env
DATABASE_URL=mysql://root:password@localhost:3306/u339372869_test2?charset=utf8mb4&collation=utf8mb4_unicode_ci&connect_timeout=30&pool_timeout=30
```

### ✅ صحيح (قاعدة بيانات بعيدة):
```env
DATABASE_URL=mysql://username:password@92.113.22.70:3306/database?charset=utf8mb4&collation=utf8mb4_unicode_ci&connect_timeout=120&pool_timeout=120&timeout=120
```

---

## 🎯 الخطوات النهائية:

1. ✅ عدل `DATABASE_URL` في `.env`
2. ✅ أنشئ قاعدة البيانات (إذا لم تكن موجودة)
3. ✅ شغل `node scripts/setup-local-database.js`
4. ✅ أعد تشغيل السيرفر
5. ✅ تحقق من أن الأخطاء اختفت

---

## 📞 إذا استمرت المشكلة:

1. تحقق من logs السيرفر
2. تحقق من أن MySQL يعمل
3. تحقق من صلاحيات المستخدم
4. شغل السكريبت مرة أخرى: `node scripts/setup-local-database.js`

---

**تم إنشاء هذا الدليل في:** $(date)
**آخر تحديث:** $(date)

