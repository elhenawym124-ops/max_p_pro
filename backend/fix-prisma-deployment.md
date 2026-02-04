# إصلاح مشكلة Prisma في بيئة الإنتاج

## المشكلة
```
PrismaClientInitializationError: Prisma Client could not locate the Query Engine for runtime "debian-openssl-3.0.x".
This happened because Prisma Client was generated for "windows", but the actual deployment required "debian-openssl-3.0.x".
```

## الحل المطبق

### 1. تحديث schema.prisma
تم إضافة `binaryTargets` إلى ملف `prisma/postgres/postgres.prisma`:

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "debian-openssl-1.1.x", "debian-openssl-3.0.x", "linux-musl", "linux-musl-openssl-3.0.x"]
  output        = "../generated/postgres"
}
```

### 2. الخطوات المطلوبة للنشر

#### أ. إعادة توليد Prisma Client
```bash
cd backend
npx prisma generate --schema=./prisma/postgres/postgres.prisma
```

#### ب. أو استخدام السكريبت المرفق
```bash
node regenerate-prisma.js
```

### 3. Binary Targets المضافة
- `native`: للبيئة المحلية
- `debian-openssl-1.1.x`: لأنظمة Debian/Ubuntu القديمة
- `debian-openssl-3.0.x`: لأنظمة Debian/Ubuntu الحديثة
- `linux-musl`: لـ Alpine Linux
- `linux-musl-openssl-3.0.x`: لـ Alpine Linux مع OpenSSL 3.0

### 4. التحقق من الحل
بعد إعادة التوليد والنشر، يجب أن تختفي رسالة الخطأ ويعمل Prisma Client بشكل طبيعي في بيئة الإنتاج.

### 5. ملاحظات مهمة
- هذا التحديث يضمن توافق Prisma مع بيئات Linux المختلفة
- لا يؤثر على الأداء في البيئة المحلية
- يحل مشاكل النشر على خوادم Linux
