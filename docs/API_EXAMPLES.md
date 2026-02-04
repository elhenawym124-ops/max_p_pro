# 🔌 أمثلة استدعاء API - Page Engagement Stats

## 📡 Endpoints المتاحة

### 1. Get All Pages Overview
```
GET /api/v1/pages/engagement/overview
```

### 2. Get Specific Page Engagement Stats
```
GET /api/v1/pages/engagement/:pageId?period=7
```

---

## 🧪 أمثلة الاستخدام

### مثال 1: جلب ملخص جميع الصفحات

#### Request (cURL):
```bash
curl -X GET "http://localhost:5000/api/v1/pages/engagement/overview" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

#### Request (JavaScript/Axios):
```javascript
const response = await axios.get(
  'http://localhost:5000/api/v1/pages/engagement/overview',
  {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      'Content-Type': 'application/json'
    }
  }
);
```

#### Response (Success):
```json
{
  "success": true,
  "data": {
    "pages": [
      {
        "pageId": "123456789",
        "pageName": "My Business Page",
        "picture": "https://graph.facebook.com/123456789/picture",
        "fanCount": 10500,
        "followersCount": 10800,
        "engagement": {
          "totalPosts": 45,
          "totalLikes": 1250,
          "totalComments": 340,
          "totalShares": 85,
          "totalEngagement": 1675
        },
        "connectedAt": "2024-01-15T10:30:00.000Z",
        "status": "connected"
      },
      {
        "pageId": "987654321",
        "pageName": "Another Page",
        "picture": "https://graph.facebook.com/987654321/picture",
        "fanCount": 5200,
        "followersCount": 5300,
        "engagement": {
          "totalPosts": 28,
          "totalLikes": 680,
          "totalComments": 120,
          "totalShares": 35,
          "totalEngagement": 835
        },
        "connectedAt": "2024-02-01T14:20:00.000Z",
        "status": "connected"
      }
    ],
    "totalPages": 2,
    "summary": {
      "totalFans": 15700,
      "totalEngagement": 2510,
      "totalPosts": 73
    }
  }
}
```

---

### مثال 2: جلب إحصائيات صفحة محددة (آخر 7 أيام)

#### Request (cURL):
```bash
curl -X GET "http://localhost:5000/api/v1/pages/engagement/123456789?period=7" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

#### Request (JavaScript/Fetch):
```javascript
const pageId = '123456789';
const period = 7;

const response = await fetch(
  `http://localhost:5000/api/v1/pages/engagement/${pageId}?period=${period}`,
  {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json'
    }
  }
);

const data = await response.json();
```

#### Response (Success):
```json
{
  "success": true,
  "data": {
    "page": {
      "id": "123456789",
      "name": "My Business Page",
      "fanCount": 10500,
      "followersCount": 10800,
      "picture": "https://graph.facebook.com/123456789/picture?type=large",
      "cover": "https://scontent.xx.fbcdn.net/v/cover.jpg",
      "link": "https://www.facebook.com/123456789",
      "about": "We are a leading company in...",
      "category": "Business & Economy"
    },
    "period": {
      "days": 7,
      "since": "2024-01-20T00:00:00.000Z",
      "until": "2024-01-27T23:59:59.999Z"
    },
    "summary": {
      "totalPosts": 12,
      "totalLikes": 450,
      "totalComments": 85,
      "totalShares": 22,
      "totalReactions": 520,
      "totalEngagement": 557,
      "engagementRate": 2.35,
      "averageEngagementPerPost": 46
    },
    "posts": [
      {
        "id": "123456789_987654321",
        "message": "Check out our new product launch! 🚀",
        "createdTime": "2024-01-25T14:30:00+0000",
        "permalinkUrl": "https://www.facebook.com/123456789/posts/987654321",
        "picture": "https://scontent.xx.fbcdn.net/v/post_image.jpg",
        "engagement": {
          "likes": 125,
          "comments": 28,
          "shares": 8,
          "reactions": 145,
          "total": 161
        }
      },
      {
        "id": "123456789_987654322",
        "message": "Thank you for your amazing support! ❤️",
        "createdTime": "2024-01-23T10:15:00+0000",
        "permalinkUrl": "https://www.facebook.com/123456789/posts/987654322",
        "picture": "https://scontent.xx.fbcdn.net/v/post_image2.jpg",
        "engagement": {
          "likes": 98,
          "comments": 15,
          "shares": 4,
          "reactions": 110,
          "total": 117
        }
      }
    ]
  }
}
```

---

### مثال 3: جلب إحصائيات صفحة محددة (آخر 30 يوم)

#### Request (cURL):
```bash
curl -X GET "http://localhost:5000/api/v1/pages/engagement/123456789?period=30" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

#### Request (JavaScript/Axios):
```javascript
const getPageStats = async (pageId, period = 30) => {
  try {
    const response = await axios.get(
      `http://localhost:5000/api/v1/pages/engagement/${pageId}`,
      {
        params: { period },
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error fetching page stats:', error);
    throw error;
  }
};

// Usage
const stats = await getPageStats('123456789', 30);
console.log(stats.data.summary);
```

---

## ❌ أمثلة الأخطاء (Error Responses)

### خطأ 1: مستخدم غير مصرح (Unauthorized)

#### Response:
```json
{
  "success": false,
  "error": "مستخدم غير صالح"
}
```
**HTTP Status**: 401

---

### خطأ 2: صفحة غير موجودة (Not Found)

#### Response:
```json
{
  "success": false,
  "error": "صفحة Facebook غير موجودة أو غير متصلة"
}
```
**HTTP Status**: 404

---

### خطأ 3: Facebook API Error (Token منتهي الصلاحية)

#### Response:
```json
{
  "success": false,
  "error": "خطأ في جلب البيانات من Facebook",
  "details": "Error validating access token: Session has expired",
  "code": 190,
  "hint": "انتهت صلاحية الاتصال بصفحة Facebook. يرجى إعادة الربط."
}
```
**HTTP Status**: 400

---

### خطأ 4: صلاحيات غير كافية (Insufficient Permissions)

#### Response:
```json
{
  "success": false,
  "error": "خطأ في جلب البيانات من Facebook",
  "details": "Requires pages_read_engagement permission",
  "code": 200,
  "hint": "تأكد من أن لديك صلاحية pages_read_engagement"
}
```
**HTTP Status**: 400

---

### خطأ 5: خطأ في الخادم (Server Error)

#### Response:
```json
{
  "success": false,
  "error": "خطأ في الخادم",
  "message": "Internal server error details..."
}
```
**HTTP Status**: 500

---

## 🔧 معلمات الاستعلام (Query Parameters)

### `period` (اختياري)
- **الوصف**: الفترة الزمنية بالأيام
- **النوع**: Number (String)
- **القيم المسموحة**: 1, 7, 14, 30, 90
- **القيمة الافتراضية**: 7
- **مثال**: `?period=30`

---

## 📊 هيكل البيانات (Data Structure)

### Page Object:
```typescript
interface Page {
  id: string;
  name: string;
  fanCount: number;
  followersCount: number;
  picture: string;
  cover?: string;
  link: string;
  about?: string;
  category?: string;
}
```

### Summary Object:
```typescript
interface Summary {
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalReactions: number;
  totalEngagement: number;
  engagementRate: number;
  averageEngagementPerPost: number;
}
```

### Post Object:
```typescript
interface Post {
  id: string;
  message: string;
  createdTime: string;
  permalinkUrl: string;
  picture?: string;
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    reactions: number;
    total: number;
  };
}
```

---

## 🧪 اختبار الـ API

### استخدام Postman:

1. **إنشاء Request جديد**:
   - Method: GET
   - URL: `http://localhost:5000/api/v1/pages/engagement/overview`

2. **إضافة Headers**:
   - Key: `Authorization`
   - Value: `Bearer YOUR_JWT_TOKEN`

3. **إرسال Request**:
   - اضغط "Send"
   - تحقق من Response

---

### استخدام Thunder Client (VS Code):

1. افتح Thunder Client
2. New Request
3. GET `http://localhost:5000/api/v1/pages/engagement/overview`
4. Headers: `Authorization: Bearer YOUR_TOKEN`
5. Send

---

## 💡 نصائح

### 1. Cache البيانات:
```javascript
// مثال: Cache لمدة 5 دقائق
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let cachedData = null;
let cacheTime = null;

const getPageStatsWithCache = async (pageId, period) => {
  const now = Date.now();
  
  if (cachedData && cacheTime && (now - cacheTime) < CACHE_DURATION) {
    return cachedData;
  }
  
  const data = await getPageStats(pageId, period);
  cachedData = data;
  cacheTime = now;
  
  return data;
};
```

### 2. Error Handling:
```javascript
const getPageStatsWithErrorHandling = async (pageId, period) => {
  try {
    const response = await axios.get(
      `http://localhost:5000/api/v1/pages/engagement/${pageId}`,
      {
        params: { period },
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    
    return { success: true, data: response.data };
  } catch (error) {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/auth/login';
    } else if (error.response?.status === 400) {
      // Facebook API error
      return {
        success: false,
        error: error.response.data.details || 'خطأ في جلب البيانات'
      };
    } else {
      return {
        success: false,
        error: 'خطأ في الاتصال بالخادم'
      };
    }
  }
};
```

### 3. Loading State:
```javascript
const [loading, setLoading] = useState(false);
const [data, setData] = useState(null);
const [error, setError] = useState(null);

const fetchData = async () => {
  setLoading(true);
  setError(null);
  
  try {
    const result = await getPageStats(pageId, period);
    setData(result.data);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

---

## 🔐 Authentication

جميع الـ endpoints تتطلب JWT Token صالح.

### الحصول على Token:
```javascript
// بعد تسجيل الدخول
const loginResponse = await axios.post('/api/v1/auth/login', {
  email: 'user@example.com',
  password: 'password123'
});

const token = loginResponse.data.accessToken;
localStorage.setItem('accessToken', token);
```

### استخدام Token:
```javascript
const headers = {
  'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
  'Content-Type': 'application/json'
};
```

---

## 📞 الدعم

للمزيد من المعلومات:
- راجع `docs/PAGE_ENGAGEMENT_STATS_GUIDE.md`
- راجع `docs/ENGAGEMENT_STATS_IMPLEMENTATION_SUMMARY.md`

---

**نهاية الدليل** ✅

