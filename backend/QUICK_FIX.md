# ⚡ حل سريع - قاعدة البيانات المحلية

## المشكلة:
- ❌ `socket=/var/run/mysqld/mysqld.sock` لا يعمل على Windows
- ❌ الجداول غير موجودة (`gemini_key_models`)
- ❌ Query Queue يتكدس
- ❌ Access denied لـ root على Linux

## الحل السريع:

### إذا كانت المشكلة "Access denied":
راجع `FIX_MYSQL_AUTH.md` أولاً!

### إذا كانت المشكلة connection string أو جداول:

### 1️⃣ عدل `.env`:
```env
DATABASE_URL=mysql://root@localhost:3306/u339372869_test2?charset=utf8mb4&collation=utf8mb4_unicode_ci&connect_timeout=30&pool_timeout=30
```
**مهم:** احذف `socket=...` تماماً!

### 2️⃣ شغل السكريبت:
```bash
cd backend
node scripts/setup-local-database.js
```

### 3️⃣ أعد تشغيل السيرفر

---

## إذا كان MySQL يحتاج كلمة مرور:
```env
DATABASE_URL=mysql://root:your_password@localhost:3306/u339372869_test2?charset=utf8mb4&collation=utf8mb4_unicode_ci&connect_timeout=30&pool_timeout=30
```

---

## للتفاصيل الكاملة:
راجع ملف `FIX_LOCAL_DATABASE.md`

