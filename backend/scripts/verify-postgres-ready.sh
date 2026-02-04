#!/bin/bash

# سكريبت التحقق الشامل من جاهزية PostgreSQL
# شغله على السيرفر: bash scripts/verify-postgres-ready.sh

echo "🔍 بدء التحقق الشامل من PostgreSQL..."
echo ""

ERRORS=0

# ==========================================
# 1. اختبار الاتصال
# ==========================================
echo "1️⃣ اختبار الاتصال بـ PostgreSQL..."
if sudo -u postgres psql -d maxp -c "SELECT 1;" > /dev/null 2>&1; then
    echo "   ✅ الاتصال ناجح"
else
    echo "   ❌ فشل الاتصال"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# ==========================================
# 2. التحقق من pgvector
# ==========================================
echo "2️⃣ التحقق من pgvector extension..."
VECTOR_CHECK=$(sudo -u postgres psql -d maxp -t -c "SELECT COUNT(*) FROM pg_extension WHERE extname = 'vector';")
if [ "$VECTOR_CHECK" -eq 1 ]; then
    echo "   ✅ pgvector مثبت"
else
    echo "   ❌ pgvector غير مثبت"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# ==========================================
# 3. التحقق من البيانات
# ==========================================
echo "3️⃣ التحقق من البيانات..."

# عدد المنتجات
PRODUCT_COUNT=$(sudo -u postgres psql -d maxp -t -c "SELECT COUNT(*) FROM products;")
echo "   📊 إجمالي المنتجات: $PRODUCT_COUNT"

if [ "$PRODUCT_COUNT" -gt 0 ]; then
    echo "   ✅ يوجد منتجات"
else
    echo "   ❌ لا يوجد منتجات"
    ERRORS=$((ERRORS + 1))
fi

# المنتجات مع embeddings
EMBEDDING_COUNT=$(sudo -u postgres psql -d maxp -t -c "SELECT COUNT(*) FROM products WHERE embedding IS NOT NULL;")
echo "   📊 منتجات مع embeddings: $EMBEDDING_COUNT"

if [ "$EMBEDDING_COUNT" -gt 0 ]; then
    echo "   ✅ يوجد embeddings"
else
    echo "   ⚠️ لا يوجد embeddings (قد تحتاج توليدها)"
fi
echo ""

# ==========================================
# 4. اختبار Multi-tenancy
# ==========================================
echo "4️⃣ اختبار عزل الشركات (Multi-tenancy)..."

COMPANY_COUNT=$(sudo -u postgres psql -d maxp -t -c "SELECT COUNT(DISTINCT company_id) FROM products;")
echo "   📊 عدد الشركات: $COMPANY_COUNT"

if [ "$COMPANY_COUNT" -gt 0 ]; then
    echo "   ✅ Multi-tenancy يعمل"
    
    # عرض توزيع المنتجات
    echo "   📊 توزيع المنتجات حسب الشركة:"
    sudo -u postgres psql -d maxp -c "SELECT company_id, COUNT(*) as products FROM products GROUP BY company_id ORDER BY products DESC LIMIT 5;"
else
    echo "   ❌ لا يوجد شركات"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# ==========================================
# 5. اختبار الصلاحيات
# ==========================================
echo "5️⃣ اختبار صلاحيات المستخدم appuser..."

# اختبار القراءة (من خلال postgres user)
if sudo -u postgres psql -d maxp -c "SELECT 1 FROM products LIMIT 1;" > /dev/null 2>&1; then
    echo "   ✅ صلاحيات القراءة تعمل"
else
    echo "   ❌ مشكلة في صلاحيات القراءة"
    ERRORS=$((ERRORS + 1))
fi

# اختبار الكتابة
if sudo -u postgres psql -d maxp -c "CREATE TABLE IF NOT EXISTS test_write (id INT); DROP TABLE IF EXISTS test_write;" > /dev/null 2>&1; then
    echo "   ✅ صلاحيات الكتابة تعمل"
else
    echo "   ❌ مشكلة في صلاحيات الكتابة"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# ==========================================
# 6. اختبار الأداء
# ==========================================
echo "6️⃣ اختبار الأداء..."

START_TIME=$(date +%s%3N)
sudo -u postgres psql -d maxp -c "SELECT id, name FROM products LIMIT 100;" > /dev/null 2>&1
END_TIME=$(date +%s%3N)
QUERY_TIME=$((END_TIME - START_TIME))

echo "   ⏱️ وقت استعلام 100 منتج: ${QUERY_TIME}ms"

if [ "$QUERY_TIME" -lt 1000 ]; then
    echo "   ✅ الأداء ممتاز"
elif [ "$QUERY_TIME" -lt 3000 ]; then
    echo "   ⚠️ الأداء مقبول"
else
    echo "   ❌ الأداء بطيء"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# ==========================================
# 7. التحقق من حجم البيانات
# ==========================================
echo "7️⃣ التحقق من حجم البيانات..."

DB_SIZE=$(sudo -u postgres psql -d maxp -t -c "SELECT pg_size_pretty(pg_database_size('maxp'));")
TABLE_SIZE=$(sudo -u postgres psql -d maxp -t -c "SELECT pg_size_pretty(pg_total_relation_size('products'));")

echo "   📊 حجم قاعدة البيانات: $DB_SIZE"
echo "   📊 حجم جدول المنتجات: $TABLE_SIZE"
echo ""

# ==========================================
# 8. اختبار POSTGRES_URL في .env
# ==========================================
echo "8️⃣ التحقق من POSTGRES_URL في .env..."

if grep -q "POSTGRES_URL=" /var/www/backend2/.env; then
    echo "   ✅ POSTGRES_URL موجود في .env"
else
    echo "   ❌ POSTGRES_URL غير موجود في .env"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# ==========================================
# النتيجة النهائية
# ==========================================
echo "=========================================="
if [ "$ERRORS" -eq 0 ]; then
    echo "✅ جميع الاختبارات نجحت!"
    echo ""
    echo "🎉 PostgreSQL جاهز للاستخدام في الإنتاج!"
    echo ""
    echo "📝 الخطوة التالية:"
    echo "   شغل: node scripts/test-postgres-vector.js"
    echo ""
    exit 0
else
    echo "❌ فشل $ERRORS اختبار(ات)"
    echo ""
    echo "⚠️ يرجى إصلاح المشاكل قبل الاستخدام في الإنتاج"
    echo ""
    exit 1
fi
