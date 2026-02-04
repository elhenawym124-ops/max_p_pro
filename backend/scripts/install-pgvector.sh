#!/bin/bash

# سكريبت تثبيت pgvector على PostgreSQL 16
# شغله على السيرفر: bash scripts/install-pgvector.sh

echo "🚀 بدء تثبيت pgvector..."

# التحقق من إصدار PostgreSQL
PG_VERSION=$(psql --version | grep -oP '\d+' | head -1)
echo "📊 إصدار PostgreSQL: $PG_VERSION"

# الطريقة 1: التثبيت من المستودعات (الأسرع)
echo ""
echo "📦 محاولة التثبيت من المستودعات..."

if [ "$PG_VERSION" = "16" ]; then
    sudo apt update
    sudo apt install -y postgresql-16-pgvector
elif [ "$PG_VERSION" = "15" ]; then
    sudo apt update
    sudo apt install -y postgresql-15-pgvector
elif [ "$PG_VERSION" = "14" ]; then
    sudo apt update
    sudo apt install -y postgresql-14-pgvector
else
    echo "⚠️ إصدار PostgreSQL غير مدعوم مباشرة، سنثبت من المصدر..."
fi

# التحقق من نجاح التثبيت
if [ -f "/usr/share/postgresql/$PG_VERSION/extension/vector.control" ]; then
    echo "✅ تم تثبيت pgvector بنجاح!"
    
    # تفعيل الـ extension في قاعدة البيانات
    echo ""
    echo "🔧 تفعيل pgvector في قاعدة البيانات maxp..."
    sudo -u postgres psql -d maxp -c "CREATE EXTENSION IF NOT EXISTS vector;"
    
    echo ""
    echo "✅ اكتمل التثبيت والتفعيل!"
    echo "🎉 يمكنك الآن تشغيل سكريبت النقل: node scripts/migrate-to-postgresql.js"
    exit 0
fi

# الطريقة 2: التثبيت من المصدر (إذا فشلت الطريقة الأولى)
echo ""
echo "📦 التثبيت من المصدر..."

# تثبيت الأدوات المطلوبة
sudo apt update
sudo apt install -y build-essential git postgresql-server-dev-$PG_VERSION

# تحميل pgvector
cd /tmp
rm -rf pgvector
git clone --branch v0.5.1 https://github.com/pgvector/pgvector.git
cd pgvector

# الترجمة والتثبيت
make
sudo make install

# التحقق من التثبيت
if [ -f "/usr/share/postgresql/$PG_VERSION/extension/vector.control" ]; then
    echo "✅ تم تثبيت pgvector من المصدر بنجاح!"
    
    # تفعيل الـ extension
    echo ""
    echo "🔧 تفعيل pgvector في قاعدة البيانات maxp..."
    sudo -u postgres psql -d maxp -c "CREATE EXTENSION IF NOT EXISTS vector;"
    
    echo ""
    echo "✅ اكتمل التثبيت والتفعيل!"
    echo "🎉 يمكنك الآن تشغيل سكريبت النقل: node scripts/migrate-to-postgresql.js"
    exit 0
else
    echo "❌ فشل التثبيت!"
    echo "💡 جرب التثبيت يدوياً أو راجع الوثائق: https://github.com/pgvector/pgvector"
    exit 1
fi
