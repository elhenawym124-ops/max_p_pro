#!/bin/bash

# سكريبت إصلاح صلاحيات PostgreSQL
# شغله على السيرفر: bash scripts/fix-postgres-permissions.sh

echo "🔧 إصلاح صلاحيات PostgreSQL..."

# المستخدم وقاعدة البيانات
DB_NAME="maxp"
DB_USER="appuser"

echo "📊 قاعدة البيانات: $DB_NAME"
echo "👤 المستخدم: $DB_USER"
echo ""

# منح جميع الصلاحيات
echo "🔑 منح الصلاحيات..."

sudo -u postgres psql <<EOF
-- الاتصال بقاعدة البيانات
\c $DB_NAME

-- منح صلاحيات على schema public
GRANT ALL ON SCHEMA public TO $DB_USER;

-- منح صلاحيات على جميع الجداول الحالية
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;

-- منح صلاحيات على جميع الـ sequences
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;

-- منح صلاحيات على جميع الـ functions
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO $DB_USER;

-- منح صلاحيات افتراضية للجداول المستقبلية
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO $DB_USER;

-- منح صلاحية إنشاء جداول
GRANT CREATE ON SCHEMA public TO $DB_USER;

-- التحقق من الصلاحيات
\dp
EOF

echo ""
echo "✅ تم منح جميع الصلاحيات!"
echo ""
echo "🧪 اختبار الصلاحيات..."

# اختبار إنشاء جدول
sudo -u postgres psql -d $DB_NAME -U $DB_USER -c "
  CREATE TABLE IF NOT EXISTS test_permissions (
    id SERIAL PRIMARY KEY,
    test_value TEXT
  );
  DROP TABLE IF EXISTS test_permissions;
" 2>&1

if [ $? -eq 0 ]; then
    echo "✅ الصلاحيات تعمل بشكل صحيح!"
    echo ""
    echo "🎉 يمكنك الآن تشغيل سكريبت النقل: node scripts/migrate-to-postgresql.js"
else
    echo "❌ لا تزال هناك مشكلة في الصلاحيات"
    echo ""
    echo "💡 جرب منح الصلاحيات يدوياً:"
    echo "   sudo -u postgres psql -d $DB_NAME"
    echo "   GRANT ALL ON SCHEMA public TO $DB_USER;"
fi
