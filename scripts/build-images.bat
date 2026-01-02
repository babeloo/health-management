@echo off
REM ================================
REM Windows 批处理脚本 - 构建镜像
REM ================================

echo ================================
echo 开始构建 Docker 镜像
echo ================================

echo.
echo [1/4] 构建 Backend 镜像...
docker build -t health-mgmt/backend:test ./backend
if errorlevel 1 goto error

echo.
echo [2/4] 构建 AI Service 镜像...
docker build -t health-mgmt/ai-service:test ./ai-service
if errorlevel 1 goto error

echo.
echo [3/4] 构建 Frontend Web 镜像...
docker build -t health-mgmt/frontend-web:test ./frontend-web
if errorlevel 1 goto error

echo.
echo [4/4] 构建 Frontend Patient 镜像...
docker build -t health-mgmt/frontend-patient:test ./frontend-patient
if errorlevel 1 goto error

echo.
echo ================================
echo 镜像大小验证
echo ================================
docker images | findstr "health-mgmt"

echo.
echo ================================
echo 所有镜像构建成功
echo ================================
exit /b 0

:error
echo.
echo ================================
echo 构建失败，请检查错误信息
echo ================================
exit /b 1
