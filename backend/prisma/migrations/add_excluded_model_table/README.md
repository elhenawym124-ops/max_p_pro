# Migration: Add ExcludedModel Table

## الوصف
هذا الـ migration يضيف جدول `excluded_models` لتتبع النماذج المستثناة مع منطق إعادة المحاولة.

## كيفية التطبيق

### الطريقة 1: استخدام Prisma (موصى بها)
```bash
cd backend
npx prisma migrate deploy
```

أو إذا كنت في بيئة التطوير:
```bash
cd backend
npx prisma migrate dev
```

### الطريقة 2: تشغيل SQL مباشرة
إذا كان Prisma migrate لا يعمل، يمكنك تشغيل SQL script مباشرة:

```bash
# من مجلد backend
mysql -u [username] -p [database_name] < prisma/migrations/add_excluded_model_table/migration.sql
```

أو استخدم ملف SQL البديل:
```bash
mysql -u [username] -p [database_name] < scripts/apply_excluded_model_migration.sql
```

### الطريقة 3: من خلال MySQL Workbench أو phpMyAdmin
افتح ملف `migration.sql` وانسخ محتواه ثم شغله في MySQL.

## التحقق من التطبيق
بعد تطبيق migration، تحقق من أن الجدول تم إنشاؤه:
```sql
SHOW TABLES LIKE 'excluded_models';
DESCRIBE excluded_models;
```

## التراجع (Rollback)
إذا أردت التراجع عن migration:
```sql
DROP TABLE IF EXISTS `excluded_models`;
```

