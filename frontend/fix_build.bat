@echo off
echo 🔧 Fixing Vite/Babel Build Error...
echo.

echo 📁 Step 1: Cleaning Vite cache...
if exist node_modules\.vite (
    rmdir /s /q node_modules\.vite
    echo ✅ Vite cache cleared
) else (
    echo ℹ️ No Vite cache found
)

echo.
echo 📁 Step 2: Cleaning dist folder...
if exist dist (
    rmdir /s /q dist
    echo ✅ Dist folder cleared
) else (
    echo ℹ️ No dist folder found
)

echo.
echo 📁 Step 3: Cleaning node_modules (this may take a while)...
if exist node_modules (
    rmdir /s /q node_modules
    echo ✅ node_modules cleared
) else (
    echo ℹ️ No node_modules found
)

echo.
echo 📦 Step 4: Reinstalling dependencies...
call npm install

echo.
echo ✅ Done! Try running 'npm run dev' again.
echo.
pause
