#!/bin/bash
# Fix script for Category updatedAt field issue
# Run this on the production server at /var/www/backend2/

echo "🔧 Fixing Category model schema..."

# Navigate to backend directory
cd /var/www/backend2

# Backup the schema file
cp prisma/schema.prisma prisma/schema.prisma.backup

# Fix the updatedAt field in Category model
# Find the line with "updatedAt       DateTime" (without @updatedAt) in the Category model
# and add the @updatedAt directive
sed -i '/model Category/,/^}/s/updatedAt       DateTime$/updatedAt       DateTime   @updatedAt/' prisma/schema.prisma

echo "✅ Schema file updated"

# Verify the change
echo "📋 Verifying the change..."
grep -A 15 "model Category" prisma/schema.prisma | grep "updatedAt"

# Regenerate Prisma Client
echo "🔄 Regenerating Prisma Client..."
npx prisma generate

# Restart the backend
echo "🔄 Restarting backend..."
pm2 restart backend1

echo "✅ Done! The Category creation should now work correctly."
