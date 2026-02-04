# Frontend - Communication Platform Dashboard

## نظرة عامة

واجهة المستخدم الأمامية لمنصة إدارة التواصل والتجارة الإلكترونية، مبنية باستخدام React.js و TypeScript و Tailwind CSS.

## هيكل المجلدات

```
src/
├── components/      # مكونات React قابلة لإعادة الاستخدام
│   ├── ui/         # مكونات واجهة المستخدم الأساسية
│   ├── forms/      # مكونات النماذج
│   ├── layout/     # مكونات التخطيط
│   └── charts/     # مكونات الرسوم البيانية
├── pages/          # صفحات التطبيق الرئيسية
│   ├── auth/       # صفحات المصادقة
│   ├── dashboard/  # لوحة التحكم
│   ├── customers/  # إدارة العملاء
│   ├── conversations/ # إدارة المحادثات
│   ├── products/   # إدارة المنتجات
│   ├── orders/     # إدارة الطلبات
│   ├── reports/    # التقارير والتحليلات
│   └── settings/   # الإعدادات
├── hooks/          # React Hooks مخصصة
├── services/       # خدمات API والتكاملات الخارجية
├── utils/          # أدوات مساعدة ووظائف مشتركة
├── types/          # تعريفات TypeScript
├── styles/         # ملفات التصميم والثيمات
└── assets/         # الصور والأيقونات والملفات الثابتة
```

## المميزات الرئيسية

### 🎨 واجهة مستخدم حديثة
- تصميم متجاوب يعمل على جميع الأجهزة
- ثيمات قابلة للتخصيص (فاتح/داكن)
- مكونات UI قابلة لإعادة الاستخدام
- رسوم بيانية تفاعلية

### 🔐 نظام المصادقة
- تسجيل دخول آمن
- إدارة الجلسات
- حماية المسارات
- أدوار المستخدمين

### 💬 إدارة المحادثات
- واجهة تشبه Messenger
- رسائل في الوقت الفعلي
- دعم الوسائط المتعددة
- ردود سريعة وقوالب

### 👥 إدارة العملاء
- قاعدة بيانات العملاء
- تتبع التفاعلات
- تصنيف العملاء
- ملفات شخصية مفصلة

### 🛒 إدارة المتجر
- كتالوج المنتجات
- إدارة الطلبات
- تتبع المخزون
- معالجة المدفوعات

### 📊 التقارير والتحليلات
- لوحات معلومات تفاعلية
- رسوم بيانية متقدمة
- تقارير قابلة للتخصيص
- تصدير البيانات

### ⚙️ الإعدادات والتكوين
- إعدادات الشركة
- إدارة المستخدمين
- تكوين التكاملات
- تخصيص الواجهة

## التقنيات المستخدمة

- **React.js** - مكتبة واجهة المستخدم
- **TypeScript** - لغة برمجة مع أنواع ثابتة
- **Tailwind CSS** - إطار عمل CSS للتصميم
- **React Router** - التوجيه في التطبيق
- **React Query** - إدارة حالة الخادم
- **Zustand** - إدارة الحالة المحلية
- **React Hook Form** - إدارة النماذج
- **Chart.js** - الرسوم البيانية
- **Socket.io Client** - التواصل في الوقت الفعلي
- **Axios** - طلبات HTTP
- **React Hot Toast** - الإشعارات
- **Framer Motion** - الرسوم المتحركة

## البدء في التطوير

### المتطلبات
- Node.js 18+
- npm أو yarn

### التثبيت
```bash
cd frontend
npm install
```

### إعداد البيئة
```bash
# نسخ ملف البيئة
cp .env.example .env.local

# تحرير المتغيرات حسب الحاجة
```

### تشغيل التطبيق
```bash
# وضع التطوير
npm start

# بناء للإنتاج
npm run build

# معاينة البناء
npm run preview
```

## بنية المكونات

### مكونات واجهة المستخدم الأساسية
```typescript
// Button Component
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger';
  size: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

// Input Component
interface InputProps {
  type: 'text' | 'email' | 'password' | 'number';
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
}
```

### إدارة الحالة
```typescript
// User Store
interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  updateProfile: (data: UpdateProfileData) => Promise<void>;
}

// Conversations Store
interface ConversationsState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  sendMessage: (message: string) => Promise<void>;
  loadConversations: () => Promise<void>;
}
```

### خدمات API
```typescript
// API Service
class ApiService {
  private baseURL: string;
  private token: string | null;

  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL!;
    this.token = localStorage.getItem('token');
  }

  async get<T>(endpoint: string): Promise<T> {
    // Implementation
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    // Implementation
  }
}
```

## التصميم والثيمات

### نظام الألوان
```css
:root {
  --primary: #3B82F6;
  --primary-dark: #1D4ED8;
  --secondary: #10B981;
  --danger: #EF4444;
  --warning: #F59E0B;
  --success: #10B981;
  --gray-50: #F9FAFB;
  --gray-900: #111827;
}
```

### نقاط الكسر المتجاوبة
```css
/* Mobile First Approach */
.container {
  @apply px-4;
}

@screen sm {
  .container {
    @apply px-6;
  }
}

@screen lg {
  .container {
    @apply px-8;
  }
}
```

## الاختبارات

```bash
# تشغيل اختبارات الوحدة
npm test

# تشغيل اختبارات E2E
npm run test:e2e

# تشغيل الاختبارات مع التغطية
npm run test:coverage
```

## الأداء والتحسين

### تقسيم الكود
```typescript
// Lazy Loading للصفحات
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Customers = lazy(() => import('./pages/Customers'));
const Products = lazy(() => import('./pages/Products'));
```

### تحسين الصور
```typescript
// استخدام WebP مع fallback
const OptimizedImage = ({ src, alt }: ImageProps) => (
  <picture>
    <source srcSet={`${src}.webp`} type="image/webp" />
    <img src={src} alt={alt} loading="lazy" />
  </picture>
);
```

## النشر

### بناء الإنتاج
```bash
npm run build
```

### متغيرات البيئة للإنتاج
```env
REACT_APP_API_URL=https://api.yourcompany.com
REACT_APP_WS_URL=wss://api.yourcompany.com
REACT_APP_ENVIRONMENT=production
```

## إرشادات المساهمة

1. اتبع معايير TypeScript الصارمة
2. استخدم Tailwind CSS للتصميم
3. اكتب اختبارات للمكونات الجديدة
4. اتبع نمط التسمية المتسق
5. وثق المكونات المعقدة

## الأمان

- تشفير البيانات الحساسة
- تنظيف المدخلات من XSS
- استخدام HTTPS في الإنتاج
- تحديث التبعيات بانتظام
