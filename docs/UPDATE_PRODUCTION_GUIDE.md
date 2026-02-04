# 🚀 دليل تحديث Production Server

## المشكلة الحالية
```
POST /api/v1/super-admin/dev/tasks/:taskId/timer/stop 404 (Not Found)
```

السبب: الكود الجديد موجود على GitHub لكن لم يتم تحديثه على السيرفر.

---

## ✅ الحل: تحديث السيرفر

### الطريقة 1: SSH يدوياً

```bash
# 1. اتصل بالسيرفر
ssh root@153.92.223.119

# 2. انتقل لمجلد المشروع
cd /var/www/backend2

# 3. اسحب آخر التحديثات من GitHub
git pull origin main

# 4. ثبت الـ dependencies الجديدة (إذا تغيرت)
npm install

# 5. أعد توليد Prisma Client
npx prisma generate

# 6. أعد تشغيل الـ backend
pm2 restart backend2

# 7. تحقق من الحالة
pm2 status
pm2 logs backend2 --lines 50
```

---

### الطريقة 2: استخدام deploy.sh

إذا كنت تريد deploy كامل (frontend + backend):

```bash
./deploy.sh root@153.92.223.119
```

---

## 🔍 التحقق من نجاح التحديث

بعد التحديث، تحقق من:

1. **PM2 Status:**
```bash
ssh root@153.92.223.119 "pm2 status"
```

2. **Backend Logs:**
```bash
ssh root@153.92.223.119 "pm2 logs backend2 --lines 50"
```

3. **اختبار الـ API:**
```bash
curl -X GET https://maxp-ai.pro/api/v1/super-admin/dev/timer/all-active \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📋 الـ Routes الجديدة المضافة

```javascript
// Timer Routes
POST /api/v1/super-admin/dev/tasks/:taskId/timer/start
POST /api/v1/super-admin/dev/tasks/:taskId/timer/stop
POST /api/v1/super-admin/dev/tasks/:taskId/timer/pause
POST /api/v1/super-admin/dev/tasks/:taskId/timer/resume
GET  /api/v1/super-admin/dev/timer/active
GET  /api/v1/super-admin/dev/timer/all-active  // ⭐ جديد
```

---

## ⚠️ ملاحظات مهمة

1. **تأكد من وجود SSH Key** أو استخدم password للاتصال
2. **تحقق من أن Git configured** على السيرفر
3. **راجع الـ logs** بعد إعادة التشغيل للتأكد من عدم وجود أخطاء
4. **اختبر الـ API** من المتصفح أو Postman

---

## 🔧 Troubleshooting

### إذا فشل git pull:
```bash
# تحقق من الـ branch الحالي
git branch

# تحقق من وجود تعارضات
git status

# إذا كان هناك تغييرات محلية
git stash
git pull origin main
git stash pop
```

### إذا فشل PM2 restart:
```bash
# أوقف ثم ابدأ من جديد
pm2 stop backend2
pm2 start backend2

# أو استخدم ecosystem file
pm2 startOrReload ecosystem.config.js --env production
```

### إذا استمرت المشكلة:
```bash
# أعد بناء Prisma Client بالقوة
npx prisma generate --force

# امسح node_modules وأعد التثبيت
rm -rf node_modules
npm install
```

---

## 📞 الدعم

إذا استمرت المشكلة، تحقق من:
- ✅ الـ routes موجودة في `backend/routes/superAdminRoutes.js`
- ✅ الـ controller functions موجودة في `backend/controllers/superAdminController.js`
- ✅ الـ exports صحيحة في module.exports
- ✅ PM2 يعمل بدون أخطاء

---

**آخر تحديث:** 25 يناير 2026
**Commit:** `52563c6` - feat: Add Active Timers page and improve timer system
