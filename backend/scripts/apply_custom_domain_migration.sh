#!/bin/bash

# Script to apply custom domain migration
# Usage: bash apply_custom_domain_migration.sh

echo "🔄 Starting custom domain migration..."

# Load database credentials from .env file
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "❌ Error: .env file not found"
    exit 1
fi

# Extract database credentials from DATABASE_URL
# Format: mysql://user:password@host:port/database
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo "📊 Database: $DB_NAME"
echo "🖥️  Host: $DB_HOST:$DB_PORT"
echo "👤 User: $DB_USER"

# Check if customDomain column already exists
echo ""
echo "🔍 Checking if customDomain column already exists..."

COLUMN_EXISTS=$(mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASS" -D"$DB_NAME" -sse "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='$DB_NAME' AND TABLE_NAME='Company' AND COLUMN_NAME='customDomain';")

if [ "$COLUMN_EXISTS" -eq "1" ]; then
    echo "✅ Column 'customDomain' already exists in Company table"
    echo "⏭️  Skipping migration"
else
    echo "➕ Adding customDomain column to Company table..."
    
    # Apply migration
    mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASS" -D"$DB_NAME" <<EOF
ALTER TABLE \`Company\` ADD COLUMN \`customDomain\` VARCHAR(191) NULL UNIQUE AFTER \`slug\`;
EOF

    if [ $? -eq 0 ]; then
        echo "✅ Migration applied successfully!"
    else
        echo "❌ Error applying migration"
        exit 1
    fi
fi

# Generate Prisma Client
echo ""
echo "🔄 Generating Prisma Client..."
npx prisma generate

if [ $? -eq 0 ]; then
    echo "✅ Prisma Client generated successfully!"
else
    echo "❌ Error generating Prisma Client"
    exit 1
fi

# Restart backend (if using PM2)
echo ""
echo "🔄 Restarting backend..."
if command -v pm2 &> /dev/null; then
    pm2 restart backend
    if [ $? -eq 0 ]; then
        echo "✅ Backend restarted successfully!"
    else
        echo "⚠️  Warning: Could not restart backend with PM2"
    fi
else
    echo "⚠️  PM2 not found. Please restart your backend manually."
fi

echo ""
echo "🎉 Custom domain migration completed successfully!"
echo ""
echo "📝 Next steps:"
echo "   1. Go to Settings → Company → General tab"
echo "   2. Scroll to 'Custom Domain' section"
echo "   3. Add your custom domain (e.g., mystore.com)"
echo "   4. Follow the DNS configuration instructions"
