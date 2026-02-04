# PowerShell script to fix Category schema on remote server
# Run this locally to execute the fix on the production server

Write-Host "🔧 Fixing Category model schema on production server..." -ForegroundColor Cyan

# Execute commands on remote server via SSH
ssh root@153.92.223.119 @"
cd /var/www/backend2
cp prisma/schema.prisma prisma/schema.prisma.backup
sed -i '/model Category/,/^}/s/updatedAt       DateTime\$/updatedAt       DateTime   @updatedAt/' prisma/schema.prisma
npx prisma generate
pm2 restart backend1
"@

Write-Host "✅ Done! Please test creating a category now." -ForegroundColor Green
