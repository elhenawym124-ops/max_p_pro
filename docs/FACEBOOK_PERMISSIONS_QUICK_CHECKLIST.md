# ✅ قائمة الأذونات الناقصة - Quick Checklist

## 🔴 الأذونات الناقصة (5 أذونات أساسية)

| # | الإذن | الأهمية | السبب | الملفات المستخدمة |
|---|------|---------|-------|-------------------|
| 1 | `email` | ⭐⭐ | البريد الإلكتروني للمصادقة | `backend/routes/facebookOAuthRoutes.js:1154` |
| 2 | `pages_manage_posts` | ⭐⭐⭐ **عاجل** | لنشر المنشورات | `backend/controller/facebookPublishController.js` |
| 3 | `pages_read_engagement` | ⭐⭐ | لإحصائيات التفاعلات | `backend/controller/facebookIntegration.js:135` |
| 4 | `ads_read` | ⭐⭐⭐ **مهم للـ Pixels** | لقراءة Pixels | `backend/routes/facebookOAuthRoutes.js:1179` |
| 5 | `ads_management` | ⭐⭐⭐ **مهم جداً** | لإدارة الإعلانات | `backend/services/facebookAdsService.js` |

---

## 📋 خطوات سريعة للحصول عليها

### 1️⃣ اذهب إلى App Review
```
https://developers.facebook.com/apps/762328696481583/app-review/permissions
```

### 2️⃣ ابحث عن كل إذن واطلبه
- اضغط على **"Request"** بجانب كل إذن
- املأ Use Case
- أرفق فيديو Demo

### 3️⃣ أولويات الطلب

#### 🚨 المرحلة 1 (عاجل - ابدأ بها):
- [ ] `pages_manage_posts` - بدونها لا يمكن نشر منشورات
- [ ] `pages_read_engagement` - للإحصائيات

#### ⚡ المرحلة 2 (مهم - للـ Pixels):
- [ ] `ads_read` - لقراءة Pixels
- [ ] `ads_management` - لإدارة الإعلانات
  - ⚠️ **مطلوب Business Verification** لهذين الإذنين

#### 📧 المرحلة 3 (مكمل):
- [ ] `email` - للمصادقة

---

## 🎬 متطلبات كل إذن

### `pages_manage_posts`
- ✅ Privacy Policy
- ✅ Video Demo (يُنصح بشدة)
- ✅ وضح Use Case: "لنشر المنشورات على صفحات Facebook"

### `pages_read_engagement`
- ✅ Privacy Policy
- ✅ Video Demo
- ✅ وضح Use Case: "لعرض إحصائيات التفاعلات"

### `ads_read`
- ✅ Privacy Policy
- ✅ Video Demo
- ✅ Business Verification (قد يكون مطلوبًا)
- ✅ وضح Use Case: "لقراءة بيانات Facebook Pixels"

### `ads_management`
- ✅ Privacy Policy
- ✅ Video Demo
- ✅ **Business Verification مطلوب**
- ✅ وضح Use Case: "لإنشاء وإدارة الإعلانات والـ Pixels"

### `email`
- ✅ Privacy Policy
- ✅ Video Demo (اختياري لكن مُوصى به)
- ✅ وضح Use Case: "لتحديد الهوية وإرسال الإشعارات"

---

## 📝 Use Case Templates (انسخ والصق)

### `pages_manage_posts`:
```
Our application allows businesses to schedule and publish content 
to their Facebook Pages. Users can create text posts, upload images 
and videos, and schedule them for future publication. This permission 
is essential for the core functionality of our social media management 
platform.
```

### `pages_read_engagement`:
```
We use this permission to display engagement statistics (likes, 
comments, shares) for Facebook Pages to help businesses understand 
their audience interaction and measure content performance.
```

### `ads_read`:
```
Our platform integrates with Facebook Pixels to track user events 
and display advertising data. We need this permission to read Pixel 
data, ad campaign statistics, and insights to help businesses 
optimize their advertising strategies.
```

### `ads_management`:
```
We provide a complete advertising management platform where users 
can create and manage Facebook ad campaigns, create custom audiences, 
manage Pixels, and send conversion events. This permission is required 
for all advertising-related features in our application.
```

### `email`:
```
We use the user's email address for account identification and to 
send important notifications about their social media accounts and 
advertising campaigns.
```

---

## ⏱️ الوقت المتوقع

- **Review Time:** 1-7 أيام عمل
- **Business Verification:** 1-3 أسابيع (لـ `ads_*` permissions)
- **Total Time:** 2-4 أسابيع للحصول على جميع الأذونات

---

## 🔗 روابط مباشرة

### App Review Dashboard:
https://developers.facebook.com/apps/762328696481583/app-review/permissions

### Business Verification:
https://www.facebook.com/business/help/2058515294227817

### App Review Guidelines:
https://developers.facebook.com/docs/app-review

---

## ✅ Checklist نهائي

قبل البدء، تأكد من:
- [ ] لديك Privacy Policy نشطة
- [ ] لديك Terms of Service
- [ ] التطبيق يعمل في Production
- [ ] لديك Business Verification (للإذنات `ads_*`)
- [ ] جاهز لتسجيل فيديوهات Demo

---

**💡 نصيحة:** ابدأ بـ `pages_manage_posts` لأنه الأكثر أهمية وليس له متطلبات Business Verification.

