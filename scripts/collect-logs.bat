@echo off
REM Worker Log Collection Script (Windows)
REM Collects and analyzes Cloudflare Worker logs for debugging and monitoring

setlocal enabledelayedexpansion

REM Configuration
set DURATION=%1
if "%DURATION%"=="" set DURATION=30

set OUTPUT_FILE=%2
if "%OUTPUT_FILE%"=="" (
    for /f "tokens=2 delims==" %%I in ('wmic OS Get localdatetime /value') do set "dt=%%I"
    set OUTPUT_FILE=worker_logs_!dt:~0,8!_!dt:~8,6!.json
)

set WORKER_URL=%3
if "%WORKER_URL%"=="" set WORKER_URL=https://mcp-workflowy-remote.daniel-bca.workers.dev

set API_KEY=%4
if "%API_KEY%"=="" set API_KEY=%ALLOWED_API_KEYS%

echo.
echo 🚀 Cloudflare Worker Log Collection Tool (Windows)
echo ===================================================
echo Duration: %DURATION% seconds
echo Output: %OUTPUT_FILE%
echo Worker URL: %WORKER_URL%
echo.

REM Check dependencies
where wrangler >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Error: wrangler CLI not found
    echo Install with: npm install -g wrangler
    exit /b 1
)

where jq >nul 2>nul
if %errorlevel% neq 0 (
    echo ⚠️  Warning: jq not found - log analysis will be limited
    echo Install jq from: https://stedolan.github.io/jq/
)

echo 📡 Starting log collection...
start /B wrangler tail --format json > "%OUTPUT_FILE%"

echo 🔄 Log collection started
echo ⏱️  Collecting logs for %DURATION% seconds...

REM Wait a moment for wrangler tail to initialize
timeout /t 2 /nobreak >nul

REM Generate test requests if API key is provided
if not "%API_KEY%"=="" (
    echo 🧪 Generating test requests to create logs...
    
    REM Extract first API key if comma-separated
    for /f "tokens=1 delims=," %%a in ("%API_KEY%") do set FIRST_KEY=%%a
    
    REM Test requests
    (
        timeout /t 1 /nobreak >nul
        echo   • Testing health endpoint...
        curl -s "%WORKER_URL%/health" >nul 2>&1
        
        timeout /t 2 /nobreak >nul
        echo   • Testing authenticated endpoint...
        curl -s "%WORKER_URL%/tools" -H "Authorization: Bearer %FIRST_KEY%" >nul 2>&1
        
        timeout /t 2 /nobreak >nul
        echo   • Testing MCP endpoint...
        curl -s -X POST "%WORKER_URL%/mcp" -H "Authorization: Bearer %FIRST_KEY%" -H "Content-Type: application/json" -d "{\"jsonrpc\": \"2.0\", \"id\": \"test\", \"method\": \"tools/list\", \"params\": {}}" >nul 2>&1
        
        timeout /t 2 /nobreak >nul
        echo   • Testing error handling...
        curl -s "%WORKER_URL%/nonexistent" >nul 2>&1
        
        timeout /t 1 /nobreak >nul
        echo   • Testing unauthorized request...
        curl -s "%WORKER_URL%/tools" >nul 2>&1
    )
) else (
    echo ⚠️  No API key provided - only passive log collection
)

REM Wait for specified duration
echo Waiting %DURATION% seconds for logs...
timeout /t %DURATION% /nobreak >nul

REM Stop log collection (kill wrangler processes)
echo 🛑 Stopping log collection...
taskkill /F /IM wrangler.exe >nul 2>&1

echo ✅ Log collection completed
echo.

REM Analyze collected logs
echo 📊 Log Analysis
echo ===============

if exist "%OUTPUT_FILE%" (
    for /f %%A in ('type "%OUTPUT_FILE%" 2^>nul ^| find /c /v ""') do set LOG_COUNT=%%A
    
    if !LOG_COUNT! gtr 0 (
        echo 📁 File: %OUTPUT_FILE%
        echo 📈 Total entries: !LOG_COUNT!
        echo.
        
        echo 📋 Log Level Distribution:
        for /f %%A in ('findstr /C:"\"level\":\"ERROR\"" "%OUTPUT_FILE%" 2^>nul ^| find /c /v ""') do set ERROR_COUNT=%%A
        for /f %%A in ('findstr /C:"\"level\":\"WARN\"" "%OUTPUT_FILE%" 2^>nul ^| find /c /v ""') do set WARN_COUNT=%%A
        for /f %%A in ('findstr /C:"\"level\":\"INFO\"" "%OUTPUT_FILE%" 2^>nul ^| find /c /v ""') do set INFO_COUNT=%%A
        for /f %%A in ('findstr /C:"\"level\":\"DEBUG\"" "%OUTPUT_FILE%" 2^>nul ^| find /c /v ""') do set DEBUG_COUNT=%%A
        
        echo   🔴 ERROR:  !ERROR_COUNT!
        echo   🟡 WARN:   !WARN_COUNT!
        echo   🔵 INFO:   !INFO_COUNT!
        echo   ⚪ DEBUG:  !DEBUG_COUNT!
        echo.
        
        echo 🔍 Performance Features:
        for /f %%A in ('findstr /C:"\"cacheOperation\":\"hit\"" "%OUTPUT_FILE%" 2^>nul ^| find /c /v ""') do set CACHE_HITS=%%A
        for /f %%A in ('findstr /C:"\"cacheOperation\":\"miss\"" "%OUTPUT_FILE%" 2^>nul ^| find /c /v ""') do set CACHE_MISSES=%%A
        for /f %%A in ('findstr /C:"\"cacheOperation\":\"set\"" "%OUTPUT_FILE%" 2^>nul ^| find /c /v ""') do set CACHE_SETS=%%A
        
        echo   💾 Cache hits:   !CACHE_HITS!
        echo   💾 Cache misses: !CACHE_MISSES!
        echo   💾 Cache sets:   !CACHE_SETS!
        
        for /f %%A in ('findstr /C:"Deduplicating request" "%OUTPUT_FILE%" 2^>nul ^| find /c /v ""') do set DEDUP_COUNT=%%A
        for /f %%A in ('findstr /C:"Retry attempt" "%OUTPUT_FILE%" 2^>nul ^| find /c /v ""') do set RETRY_COUNT=%%A
        
        echo   🔄 Deduplications: !DEDUP_COUNT!
        echo   ↩️  Retry attempts: !RETRY_COUNT!
        echo.
        
        echo 📝 Recent Log Entries:
        echo ======================
        REM Show last few lines (PowerShell for better handling)
        powershell -Command "Get-Content '%OUTPUT_FILE%' | Select-Object -Last 3"
        
        if !ERROR_COUNT! gtr 0 (
            echo.
            echo 🚨 Error Messages Found: !ERROR_COUNT!
            echo Check the log file for details: %OUTPUT_FILE%
        )
        
    ) else (
        echo ⚠️  No log entries found in %OUTPUT_FILE%
    )
) else (
    echo ❌ No logs collected or file not found
    echo.
    echo Possible reasons:
    echo • Worker is not receiving requests
    echo • wrangler tail failed to connect
    echo • Insufficient permissions
    echo • Worker is not deployed
)

echo.
echo 🏁 Log collection complete!
echo 📁 Logs saved to: %OUTPUT_FILE%
echo.
echo 💡 Usage Tips:
echo =============
echo • View logs: type "%OUTPUT_FILE%"
where jq >nul 2>nul
if %errorlevel% equ 0 (
    echo • Pretty print: jq . "%OUTPUT_FILE%"
    echo • Filter errors: jq "select(.level==\"ERROR\"^)" "%OUTPUT_FILE%"
)
echo • Monitor real-time: wrangler tail --format pretty

pause