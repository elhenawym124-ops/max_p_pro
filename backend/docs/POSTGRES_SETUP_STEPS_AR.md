# خطوات إعداد PostgreSQL - دليل سريع 🚀

## المشكلة التي واجهتها:

```
Error: SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string
```

**السبب:** الـ connection string غير صحيح أو الـ password مش موجود.

---

## ✅ الحل الكامل:

### 1. الاتصال بـ PostgreSQL

```bash
# على السيرفر
sudo -u postgres psql

# أو
psql -U postgres
```

### 2. إنشاء قاعدة البيانات والمستخدم

```sql
-- إنشاء قاعدة البيانات
CREATE DATABASE maxp;

-- إنشاء المستخدم مع كلمة مرور قوية
CREATE USER appuser WITH PASSWORD 'YourStrongPassword123!';

-- منح جميع الصلاحيات
GRANT ALL PRIVILEGES ON DATABASE maxp TO appuser;

-- الاتصال بقاعدة البيانات
\c maxp

-- تثبيت pgvector extension
CREATE EXTENSION vector;

-- منح صلاحيات على الـ schema
GRANT ALL ON SCHEMA public TO appuser;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO appuser;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO appuser;

-- للتأكد من التثبيت
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### 3. تحديث ملف .env

**على السيرفر في `/var/www/backend2/.env`:**

```bash
# افتح الملف
nano /var/www/backend2/.env

# أضف السطر التالي (استبدل البيانات ببياناتك):
POSTGRES_URL="postgresql://appuser:YourStrongPassword123!@localhost:5432/maxp"
```

**ملاحظات مهمة:**
- استبدل `appuser` باسم المستخدم اللي أنشأته
- استبدل `YourStrongPassword123!` بكلمة المرور الفعلية
- إذا PostgreSQL على سيرفر آخر، استبدل `localhost` بـ IP السيرفر
- إذا المنفذ مختلف، غير `5432`

### 4. اختبار الاتصال

```bash
# اختبر الاتصال من الـ terminal
psql "postgresql://appuser:YourStrongPassword123!@localhost:5432/maxp"

# إذا نجح، اكتب:
\dt

# للخروج:
\q
```

### 5. تشغيل سكريبت النقل

```bash
cd /var/www/backend2
node scripts/migrate-to-postgresql.js
```

---

## 🔧 حل المشاكل الشائعة:

### مشكلة 1: `password authentication failed`

```sql
-- تغيير كلمة المرور
ALTER USER appuser WITH PASSWORD 'NewPassword123!';
```

### مشكلة 2: `permission denied for schema public`

```sql
-- منح الصلاحيات مرة أخرى
\c maxp
GRANT ALL ON SCHEMA public TO appuser;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO appuser;
```

### مشكلة 3: `extension "vector" does not exist`

```bash
# تثبيت pgvector على Ubuntu/Debian
sudo apt install postgresql-16-pgvector

# أو من المصدر
cd /tmp
git clone --branch v0.5.1 https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install

# ثم في PostgreSQL:
CREATE EXTENSION vector;
```

### مشكلة 4: `connection refused`

```bash
# تأكد من تشغيل PostgreSQL
sudo systemctl status postgresql

# إذا لم يكن يعمل
sudo systemctl start postgresql

# للتشغيل التلقائي عند بدء النظام
sudo systemctl enable postgresql
```

### مشكلة 5: `FATAL: Ident authentication failed`

```bash
# عدل ملف pg_hba.conf
sudo nano /etc/postgresql/16/main/pg_hba.conf

# غير السطر من:
# local   all   all   peer
# إلى:
local   all   all   md5

# أعد تشغيل PostgreSQL
sudo systemctl restart postgresql
```

---

## 📝 التحقق من الإعداد:

```bash
# 1. تحقق من وجود قاعدة البيانات
psql -U postgres -c "\l" | grep maxp

# 2. تحقق من المستخدم
psql -U postgres -c "\du" | grep appuser

# 3. تحقق من pgvector
psql -U postgres -d maxp -c "SELECT * FROM pg_extension WHERE extname = 'vector';"

# 4. اختبر الاتصال من Node.js
node -e "const {Client} = require('pg'); const c = new Client({connectionString: process.env.POSTGRES_URL}); c.connect().then(() => console.log('✅ Success')).catch(e => console.error('❌', e.message));"
```

---

## 🎯 الخلاصة:

**الـ Connection String الصحيح:**

```
POSTGRES_URL="postgresql://[username]:[password]@[host]:[port]/[database]"
```

**مثال:**
```
POSTGRES_URL="postgresql://appuser:MyPass123@localhost:5432/maxp"
```

**مع SSL (للسيرفرات البعيدة):**
```
POSTGRES_URL="postgresql://appuser:MyPass123@example.com:5432/maxp?sslmode=require"
```

---

## ✅ بعد الإعداد:

```bash
# شغل السكريبت
cd /var/www/backend2
node scripts/migrate-to-postgresql.js

# المفروض تشوف:
# 🚀 بدء عملية النقل من MySQL إلى PostgreSQL
# ✅ تم الاتصال بـ PostgreSQL
# 📝 إنشاء Schema في PostgreSQL...
# ✅ تم إنشاء Schema بنجاح
# 🔄 بدء نقل المنتجات...
```

**بالتوفيق! 🎉**
