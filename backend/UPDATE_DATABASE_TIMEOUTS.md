# ⚙️ تحديث إعدادات Timeout لقاعدة البيانات المحلية

## المشكلة:
الاستعلامات تنتهي بعد 10 ثواني، بينما الاتصال البعيد كان يعمل مع 120 ثانية.

## الحل:
تم تحديث الكود لاستخدام نفس إعدادات timeout للاتصال البعيد.

## تحديث ملف `.env`:

عدل `DATABASE_URL` في ملف `.env` ليشمل نفس إعدادات timeout:

```env
DATABASE_URL=mysql://appuser:your_password@localhost:3306/u339372869_test2?charset=utf8mb4&collation=utf8mb4_unicode_ci&connect_timeout=120&pool_timeout=120&timeout=120&acquireTimeout=120000&createRetryIntervalMillis=2000&acquireTimeoutMillis=120000
```

## ما تم تحديثه في الكود:

1. ✅ `QUERY_TIMEOUT`: من 10 ثواني إلى 120 ثانية
2. ✅ `CONNECTION_TIMEOUT`: من 15 ثانية إلى 120 ثانية
3. ✅ `pool_timeout`: من 30 ثانية إلى 120 ثانية
4. ✅ `connect_timeout`: من 30 ثانية إلى 120 ثانية
5. ✅ إضافة `timeout`, `acquireTimeout`, `acquireTimeoutMillis`

## بعد التحديث:

1. ✅ عدل `.env` كما هو موضح أعلاه
2. ✅ أعد تشغيل السيرفر: `pm2 restart backend1`
3. ✅ راقب الـ logs للتأكد من أن الاستعلامات تعمل

## النتيجة المتوقعة:

- ✅ الاستعلامات لن تنتهي بعد 10 ثواني
- ✅ Query Queue سيعمل بشكل أفضل
- ✅ نفس الأداء مثل الاتصال البعيد

