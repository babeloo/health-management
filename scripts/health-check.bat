@echo off
REM ================================
REM Windows 批处理脚本 - 健康检查
REM ================================

echo ================================
echo 服务健康检查
echo ================================

set "all_passed=true"

echo.
echo === 检查容器状态 ===
docker ps --format "table {{.Names}}\t{{.Status}}"

echo.
echo === HTTP 健康检查 ===

echo.
echo 检查 Backend API...
curl -f -s -o nul http://localhost:5000/health
if errorlevel 1 (
    echo [X] Backend API 不可用
    set "all_passed=false"
) else (
    echo [OK] Backend API 正常
)

echo.
echo 检查 AI Service...
curl -f -s -o nul http://localhost:8001/health
if errorlevel 1 (
    echo [X] AI Service 不可用
    set "all_passed=false"
) else (
    echo [OK] AI Service 正常
)

echo.
echo 检查 Frontend Web...
curl -f -s -o nul http://localhost:3000/health
if errorlevel 1 (
    echo [X] Frontend Web 不可用
    set "all_passed=false"
) else (
    echo [OK] Frontend Web 正常
)

echo.
echo 检查 Frontend Patient...
curl -f -s -o nul http://localhost:3001/health
if errorlevel 1 (
    echo [X] Frontend Patient 不可用
    set "all_passed=false"
) else (
    echo [OK] Frontend Patient 正常
)

echo.
echo ================================
if "%all_passed%"=="true" (
    echo 所有服务运行正常
    exit /b 0
) else (
    echo 部分服务异常，请检查日志
    echo 查看日志命令: docker-compose -f docker-compose.prod.yml logs -f [service-name]
    exit /b 1
)
