# تطبيق تغييرات Order Source على Database

## 📋 الملخص
تم إضافة حقول جديدة لتتبع منشئ الطلب ومصدره في جداول `Order` و `GuestOrder`.

## 🔧 الحقول المضافة

### في `Order` model:
- `createdBy` (String?) - معرف المستخدم الذي أنشأ الطلب
- `createdByName` (String?) - اسم المستخدم الذي أنشأ الطلب
- `createdByUser` (User?) - علاقة مع جدول User

### في `GuestOrder` model:
- `createdBy` (String?) - معرف المستخدم الذي أنشأ الطلب
- `createdByName` (String?) - اسم المستخدم الذي أنشأ الطلب
- `createdByUser` (User?) - علاقة مع جدول User

### في `User` model:
- `createdOrders` (Order[]) - الطلبات التي أنشأها المستخدم
- `createdGuestOrders` (GuestOrder[]) - طلبات الضيوف التي أنشأها المستخدم

## 🚀 خطوات التطبيق

### 1. تطبيق Schema على Database
```bash
cd backend
npx prisma db push
```

### 2. توليد Prisma Client
```bash
npx prisma generate
```

### 3. إعادة تشغيل Backend
```bash
# في Development
npm run dev

# في Production
pm2 restart all
```

## ✅ التحقق من التطبيق

### 1. فحص الجداول:
```sql
-- فحص Order table
DESCRIBE orders;

-- فحص GuestOrder table
DESCRIBE guest_orders;

-- يجب أن تظهر الحقول:
-- createdBy (varchar, nullable)
-- createdByName (varchar, nullable)
```

### 2. اختبار إنشاء طلب جديد:
- افتح صفحة إنشاء طلب يدوي
- أنشئ طلب جديد
- افتح تفاصيل الطلب
- يجب أن تظهر بطاقة "مصدر الطلب" مع اسم المستخدم

## 📁 الملفات المعدلة

### Backend:
1. `backend/prisma/schema.prisma` - إضافة الحقول الجديدة
2. `backend/routes/orders.js` - إضافة createdByUser في API responses
3. `backend/services/enhancedOrderService.js` - يحفظ createdBy بالفعل

### Frontend:
1. `frontend/src/pages/orders/types.ts` - إضافة الحقول في TypeScript types
2. `frontend/src/pages/orders/components/OrderSourceCard.tsx` - Component جديد
3. `frontend/src/pages/orders/OrderDetails.tsx` - إضافة OrderSourceCard

## 🎯 المميزات الجديدة

### في صفحة تفاصيل الطلب:
- ✅ عرض اسم الموظف الذي أنشأ الطلب
- ✅ عرض البريد الإلكتروني للموظف
- ✅ عرض القناة (WhatsApp, Facebook, إلخ)
- ✅ رابط للمحادثة (إذا كان من محادثة)
- ✅ عرض نوع المصدر (AI, Manual, Storefront)
- ✅ عرض معلومات المسوق (إذا كان من Affiliate)
- ✅ عرض تاريخ الإنشاء

## 📝 ملاحظات

1. **الطلبات القديمة**: الطلبات الموجودة حالياً لن يكون لها `createdBy` (ستكون NULL)
2. **الطلبات الجديدة**: جميع الطلبات الجديدة ستحفظ معلومات المنشئ تلقائياً
3. **الطلبات من AI**: ستحفظ `sourceType = 'ai_conversation'` بدون `createdBy`
4. **الطلبات اليدوية**: ستحفظ معلومات الموظف الذي أنشأها

## 🔍 استعلامات مفيدة

### عرض الطلبات مع منشئيها:
```sql
SELECT 
  o.orderNumber,
  o.customerName,
  o.createdByName,
  o.sourceType,
  o.createdAt
FROM orders o
WHERE o.createdBy IS NOT NULL
ORDER BY o.createdAt DESC
LIMIT 10;
```

### إحصائيات الموظفين:
```sql
SELECT 
  u.firstName,
  u.lastName,
  COUNT(o.id) as total_orders
FROM users u
LEFT JOIN orders o ON o.createdBy = u.id
GROUP BY u.id
ORDER BY total_orders DESC;
```

## ⚠️ تحذيرات

1. تأكد من عمل backup للـ Database قبل تطبيق التغييرات
2. في Production، استخدم `prisma migrate` بدلاً من `db push`
3. تأكد من إعادة تشغيل جميع instances من Backend

## 🎉 انتهى!

بعد تطبيق هذه الخطوات، ستتمكن من رؤية "مصدر الطلب" في صفحة تفاصيل أي طلب جديد.
