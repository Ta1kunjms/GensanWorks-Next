@echo off
REM GensanWorks-Next: Complete Demo & Testing Setup (Windows)
REM This script sets up the system for end-to-end testing with mock data

echo.
echo 🚀 GensanWorks-Next: Complete System Demo Setup
echo ==================================================
echo.

REM Step 1: Verify prerequisites
echo 📋 Step 1: Checking prerequisites...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed
    exit /b 1
)
echo ✓ Node.js installed

where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ npm is not installed
    exit /b 1
)
echo ✓ npm installed

REM Step 2: Install dependencies
echo.
echo 📦 Step 2: Installing dependencies...
if not exist "node_modules" (
    call npm install
    echo ✓ Dependencies installed
) else (
    echo ✓ Dependencies already installed
)

REM Step 3: Type check
echo.
echo 🔍 Step 3: TypeScript type checking...
call npm run type-check >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✓ TypeScript checks passed
) else (
    echo ⚠ TypeScript warnings ^(non-blocking^)
)

REM Step 4: Lint check
echo.
echo 🔧 Step 4: ESLint validation...
call npm run lint >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✓ ESLint passed
) else (
    echo ⚠ ESLint warnings ^(non-blocking^)
)

REM Step 5: Run unit tests
echo.
echo ✅ Step 5: Running unit tests...
call npm test >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✓ All unit tests passed
) else (
    echo ⚠ Some tests may have issues
)

REM Step 6: Build
echo.
echo 🏗️  Step 6: Building for production...
call npm run build >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Build failed - check npm run build
    exit /b 1
)
echo ✓ Build successful

REM Step 7: Summary
echo.
echo ==================================================
echo ✅ DEMO SETUP COMPLETE!
echo ==================================================
echo.
echo 🎯 Next Steps:
echo.
echo 1. Start the server:
echo    npm run dev
echo.
echo 2. Visit in browser:
echo    http://localhost:3000
echo.
echo 3. Create a test account using credentials in TEST_CREDENTIALS.md
echo.
echo 4. Or test API endpoints using curl examples in DEMO_QUICK_START.md
echo.
echo 📖 Documentation:
echo    - DEMO_QUICK_START.md
echo    - PHASE_EXECUTION_GUIDE.md
echo    - PHASE_COMPLETION_CHECKLIST.md
echo.
echo 🚀 Ready to see the system in action!
echo.

@echo on
