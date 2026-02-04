# 📊 دليل استخدام نظام سجل النشاطات (Activity Log System)

## 🎯 نظرة عامة

تم تنفيذ نظام سجل نشاطات متكامل يتيح تتبع جميع العمليات التي يقوم بها المستخدمون على المنصة.

---

## 📁 الملفات المنشأة

### Backend:
1. **`models/ActivityLog.js`** - Model للنشاطات مع جميع الحقول والـ Methods
2. **`middleware/activityLogger.js`** - Middleware للتسجيل التلقائي
3. **`controllers/activityLogController.js`** - Controllers لجميع العمليات
4. **`routes/activityLogRoutes.js`** - API Routes

### Frontend:
1. **`pages/MyActivity.jsx`** - صفحة نشاطات المستخدم
2. **`pages/CompanyActivity.jsx`** - لوحة نشاطات الشركة (للمديرين)

---

## 🔧 كيفية استخدام Middleware

### 1. تسجيل نشاطات المصادقة (Authentication)

```javascript
const { logAuth } = require('../middleware/activityLogger');

// في authRoutes.js
router.post('/login', logAuth('LOGIN', 'تسجيل دخول'), authController.login);
router.post('/logout', protect, logAuth('LOGOUT', 'تسجيل خروج'), authController.logout);
```

### 2. تسجيل نشاطات الحملات الإعلانية (Ads)

```javascript
const { logAds } = require('../middleware/activityLogger');

// في facebookAdsRoutes.js
router.post('/campaigns', protect, logAds('CREATE', 'Campaign'), createCampaign);
router.put('/campaigns/:id', protect, logAds('UPDATE', 'Campaign'), updateCampaign);
router.delete('/campaigns/:id', protect, logAds('DELETE', 'Campaign'), deleteCampaign);
router.post('/campaigns/:id/activate', protect, logAds('ACTIVATE', 'Campaign'), activateCampaign);
router.post('/campaigns/:id/deactivate', protect, logAds('DEACTIVATE', 'Campaign'), deactivateCampaign);

// للـ Ad Sets
router.post('/adsets', protect, logAds('CREATE', 'AdSet'), createAdSet);
router.put('/adsets/:id', protect, logAds('UPDATE', 'AdSet'), updateAdSet);

// للإعلانات
router.post('/ads', protect, logAds('CREATE', 'Ad'), createAd);
router.put('/ads/:id', protect, logAds('UPDATE', 'Ad'), updateAd);
```

### 3. تسجيل نشاطات المحادثات (Conversations)

```javascript
const { logConversation } = require('../middleware/activityLogger');

// في conversationRoutes.js
router.post('/conversations', protect, logConversation('CREATE'), createConversation);
router.post('/conversations/:id/messages', protect, logConversation('SEND'), sendMessage);
router.put('/conversations/:id/ai/activate', protect, logConversation('ACTIVATE'), activateAI);
router.put('/conversations/:id/ai/deactivate', protect, logConversation('DEACTIVATE'), deactivateAI);
```

### 4. تسجيل نشاطات الفواتير (Billing)

```javascript
const { logBilling } = require('../middleware/activityLogger');

// في paymentRoutes.js
router.post('/payments', protect, logBilling('CREATE'), createPayment);
router.get('/invoices/:id', protect, logBilling('VIEW'), getInvoice);
router.get('/invoices/:id/export', protect, logBilling('EXPORT'), exportInvoice);
```

### 5. تسجيل نشاطات الدعم الفني (Support)

```javascript
const { logSupport } = require('../middleware/activityLogger');

// في supportRoutes.js
router.post('/tickets', protect, logSupport('CREATE', 'Ticket'), createTicket);
router.put('/tickets/:id', protect, logSupport('UPDATE', 'Ticket'), updateTicket);
router.post('/tickets/:id/reply', protect, logSupport('SEND', 'Ticket'), replyToTicket);
router.put('/tickets/:id/close', protect, logSupport('APPROVE', 'Ticket'), closeTicket);
```

### 6. تسجيل نشاطات الملفات (Files)

```javascript
const { logFile } = require('../middleware/activityLogger');

// في fileRoutes.js (مع multer)
router.post('/upload', protect, upload.single('file'), logFile('UPLOAD'), uploadFile);
router.get('/download/:id', protect, logFile('DOWNLOAD'), downloadFile);
router.delete('/files/:id', protect, logFile('DELETE'), deleteFile);
```

### 7. تسجيل نشاطات إدارة المستخدمين (Users)

```javascript
const { logUser } = require('../middleware/activityLogger');

// في userRoutes.js
router.post('/users', protect, logUser('CREATE'), createUser);
router.put('/users/:id', protect, logUser('UPDATE'), updateUser);
router.delete('/users/:id', protect, logUser('DELETE'), deleteUser);
router.put('/users/:id/activate', protect, logUser('ACTIVATE'), activateUser);
router.put('/users/:id/deactivate', protect, logUser('DEACTIVATE'), deactivateUser);
```

### 8. تسجيل نشاطات الإعدادات (Settings)

```javascript
const { logSettings } = require('../middleware/activityLogger');

// في settingsRoutes.js
router.put('/settings', protect, logSettings('UPDATE'), updateSettings);
router.put('/settings/company', protect, logSettings('UPDATE'), updateCompanySettings);
```

### 9. استخدام Middleware مخصص

```javascript
const { logActivity } = require('../middleware/activityLogger');

// مثال متقدم مع خيارات مخصصة
router.post('/products', protect, logActivity({
  category: 'PRODUCTS',
  action: 'CREATE',
  targetType: 'Product',
  severity: 'MEDIUM',
  description: (req, res) => `إنشاء منتج جديد: ${req.body.name}`,
  getTargetId: (req, res) => res._id,
  getTargetName: (req, res) => res.name,
  getMetadata: (req, res) => ({
    price: req.body.price,
    category: req.body.category,
    stock: req.body.stock
  }),
  tags: ['product', 'inventory']
}), createProduct);
```

---

## 📊 API Endpoints

### للمستخدم العادي:

#### 1. الحصول على نشاطاتي
```
GET /api/v1/activity/my-activities
Query Parameters:
  - page: رقم الصفحة (default: 1)
  - limit: عدد النتائج (default: 20)
  - category: فلترة حسب التصنيف
  - action: فلترة حسب الإجراء
  - severity: فلترة حسب الخطورة
  - isSuccess: فلترة حسب الحالة (true/false)
  - startDate: من تاريخ
  - endDate: إلى تاريخ
  - search: بحث في الوصف
```

#### 2. الحصول على إحصائيات نشاطاتي
```
GET /api/v1/activity/my-stats
Query Parameters:
  - startDate: من تاريخ
  - endDate: إلى تاريخ
```

#### 3. تصدير نشاطاتي
```
GET /api/v1/activity/export/csv
Query Parameters: (نفس فلاتر my-activities)
```

### لمدير الشركة:

#### 4. الحصول على نشاطات الشركة
```
GET /api/v1/activity/company/activities
Query Parameters:
  - userId: فلترة حسب مستخدم محدد
  - (+ جميع فلاتر my-activities)
```

#### 5. الحصول على إحصائيات الشركة
```
GET /api/v1/activity/company/stats
Query Parameters:
  - startDate: من تاريخ
  - endDate: إلى تاريخ
```

#### 6. الحصول على نشاطات مستخدم محدد
```
GET /api/v1/activity/user/:userId
Query Parameters:
  - page, limit, category, action, startDate, endDate
```

### للسوبر أدمن فقط:

#### 7. حذف النشاطات القديمة
```
DELETE /api/v1/activity/cleanup
Body:
  - days: عدد الأيام (default: 90)
```

---

## 🎨 Frontend Routes

### للمستخدم:
- **`/my-activity`** - صفحة نشاطاتي

### لمدير الشركة:
- **`/company/activity`** - لوحة نشاطات الشركة

---

## 📝 أمثلة عملية

### مثال 1: تسجيل تلقائي لإنشاء حملة إعلانية

```javascript
// في facebookAdsRoutes.js
const { logAds } = require('../middleware/activityLogger');

router.post('/campaigns', 
  protect, 
  logAds('CREATE', 'Campaign'), 
  async (req, res) => {
    // الكود الخاص بإنشاء الحملة
    const campaign = await createCampaign(req.body);
    res.json({ success: true, data: campaign });
  }
);

// سيتم تسجيل:
// - المستخدم الذي أنشأ الحملة
// - التاريخ والوقت
// - IP Address
// - المتصفح ونظام التشغيل
// - معرف الحملة واسمها
// - الميزانية والإعدادات
```

### مثال 2: تسجيل يدوي في Controller

```javascript
// في أي controller
const ActivityLog = require('../models/ActivityLog');

async function deleteImportantData(req, res) {
  try {
    // حذف البيانات
    await SomeModel.findByIdAndDelete(req.params.id);
    
    // تسجيل يدوي للنشاط الحرج
    await ActivityLog.log({
      userId: req.user._id,
      companyId: req.user.companyId,
      category: 'DATA',
      action: 'DELETE',
      description: 'حذف بيانات حساسة',
      severity: 'CRITICAL',
      targetType: 'Data',
      targetId: req.params.id,
      metadata: {
        ipAddress: req.ip,
        reason: req.body.reason
      }
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

---

## 🔒 الأمان والخصوصية

1. **Immutable Logs**: السجلات لا يمكن تعديلها أو حذفها (إلا من السوبر أدمن)
2. **تشفير البيانات الحساسة**: كلمات المرور والـ tokens لا يتم تسجيلها
3. **Role-based Access**: فقط المديرين يمكنهم رؤية نشاطات الفريق
4. **IP Anonymization**: يمكن تفعيله للخصوصية

---

## 📈 الإحصائيات المتاحة

### للمستخدم:
- إجمالي النشاطات
- التصنيفات الأكثر نشاطاً
- النشاطات اليومية (آخر 7 أيام)
- آخر نشاط

### لمدير الشركة:
- إجمالي نشاطات الشركة
- أكثر 10 مستخدمين نشاطاً
- توزيع النشاطات حسب التصنيف (Pie Chart)
- النشاطات اليومية (آخر 30 يوم - Line Chart)
- النشاطات الحساسة الأخيرة
- إحصائيات حسب الخطورة

---

## 🎯 أفضل الممارسات

1. **استخدم الـ Middleware** بدلاً من التسجيل اليدوي عندما يكون ممكناً
2. **حدد مستوى الخطورة** بشكل صحيح:
   - `LOW`: نشاطات عادية (عرض، قراءة)
   - `MEDIUM`: نشاطات متوسطة (إنشاء، تعديل)
   - `HIGH`: نشاطات مهمة (حذف، تغيير إعدادات)
   - `CRITICAL`: نشاطات حرجة (حذف بيانات حساسة، تغيير صلاحيات)

3. **أضف وصف واضح** بالعربية لكل نشاط
4. **استخدم Tags** لتسهيل البحث والفلترة
5. **لا تسجل بيانات حساسة** في metadata

---

## 🚀 التطوير المستقبلي

- [ ] Real-time notifications للنشاطات الحساسة
- [ ] تحليل أنماط النشاطات الشاذة (Anomaly Detection)
- [ ] تقارير PDF للنشاطات
- [ ] تكامل مع Slack/Teams للتنبيهات
- [ ] Dashboard تفاعلي متقدم
- [ ] تصدير بصيغ متعددة (Excel, JSON)

---

## 📞 الدعم

للمساعدة أو الاستفسارات، يرجى التواصل مع فريق التطوير.

---

**تم التنفيذ بنجاح! ✅**
