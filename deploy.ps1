# ========================================
# سكريبت النشر التلقائي
# ========================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   سكريبت النشر - إصلاح تسجيل الدخول" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# التحقق من الموقع الحالي
$currentPath = Get-Location
Write-Host "📍 المسار الحالي: $currentPath" -ForegroundColor Yellow

# الانتقال إلى مجلد الفرونت إند
$frontendPath = "c:\Users\38asfasf\Downloads\max_p_new\frontend"

if (Test-Path $frontendPath) {
    Write-Host "✅ تم العثور على مجلد الفرونت إند" -ForegroundColor Green
    Set-Location $frontendPath
} else {
    Write-Host "❌ خطأ: لم يتم العثور على مجلد الفرونت إند!" -ForegroundColor Red
    Write-Host "   المسار المتوقع: $frontendPath" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "   الخطوة 1: التحقق من node_modules" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

if (Test-Path "node_modules") {
    Write-Host "✅ node_modules موجود" -ForegroundColor Green
} else {
    Write-Host "⚠️  node_modules غير موجود - سيتم تثبيت المكتبات..." -ForegroundColor Yellow
    Write-Host "⏳ جاري تثبيت npm packages..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ فشل تثبيت المكتبات!" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ تم تثبيت المكتبات بنجاح" -ForegroundColor Green
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "   الخطوة 2: بناء الفرونت إند" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "⏳ جاري بناء المشروع... (قد يستغرق عدة دقائق)" -ForegroundColor Yellow
Write-Host "   يرجى الانتظار..." -ForegroundColor Yellow
Write-Host ""

$buildStart = Get-Date
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ فشل البناء!" -ForegroundColor Red
    Write-Host "   يرجى التحقق من الأخطاء أعلاه" -ForegroundColor Red
    exit 1
}

$buildEnd = Get-Date
$buildDuration = ($buildEnd - $buildStart).TotalSeconds

Write-Host ""
Write-Host "✅ تم البناء بنجاح!" -ForegroundColor Green
Write-Host "⏱️  المدة: $([math]::Round($buildDuration, 2)) ثانية" -ForegroundColor Green

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "   الخطوة 3: التحقق من الملفات" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

$distPath = Join-Path $frontendPath "dist"
if (Test-Path $distPath) {
    Write-Host "✅ مجلد dist موجود" -ForegroundColor Green
    
    # حساب حجم مجلد dist
    $distSize = (Get-ChildItem $distPath -Recurse | Measure-Object -Property Length -Sum).Sum
    $distSizeMB = [math]::Round($distSize / 1MB, 2)
    Write-Host "📦 حجم البناء: $distSizeMB MB" -ForegroundColor Cyan
    
    # عرض عدد الملفات
    $fileCount = (Get-ChildItem $distPath -Recurse -File).Count
    Write-Host "📄 عدد الملفات: $fileCount" -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "📂 محتويات dist:" -ForegroundColor Cyan
    Get-ChildItem $distPath -Name | ForEach-Object {
        Write-Host "   - $_" -ForegroundColor Gray
    }
} else {
    Write-Host "❌ مجلد dist غير موجود!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "   ✅ اكتمل البناء بنجاح!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 الخطوات التالية:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. ارفع محتويات المجلد التالي إلى السيرفر:" -ForegroundColor White
Write-Host "   $distPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. يمكنك استخدام:" -ForegroundColor White
Write-Host "   - FTP (FileZilla/WinSCP)" -ForegroundColor Gray
Write-Host "   - cPanel File Manager" -ForegroundColor Gray
Write-Host "   - SFTP" -ForegroundColor Gray
Write-Host ""
Write-Host "3. بعد رفع الملفات، أعد تشغيل الخادم الخلفي:" -ForegroundColor White
Write-Host "   pm2 restart all" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. اختبر الموقع على:" -ForegroundColor White
Write-Host "   https://maxp-ai.pro" -ForegroundColor Cyan
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "📖 للمزيد من التعليمات، راجع:" -ForegroundColor Yellow
Write-Host "   - DEPLOYMENT_INSTRUCTIONS_AR.md" -ForegroundColor Cyan
Write-Host "   - STATUS_REPORT_AR.md" -ForegroundColor Cyan
Write-Host ""

# فتح مجلد dist في Explorer
$openDist = Read-Host "هل تريد فتح مجلد dist في مستكشف الملفات؟ (y/n)"
if ($openDist -eq 'y' -or $openDist -eq 'Y') {
    Invoke-Item $distPath
    Write-Host "✅ تم فتح المجلد" -ForegroundColor Green
}

Write-Host ""
Write-Host "✨ انتهى السكريبت بنجاح!" -ForegroundColor Green
Write-Host ""

# العودة إلى المسار الأصلي
Set-Location $currentPath
