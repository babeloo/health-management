@echo off
REM ================================
REM Windows 快速部署脚本
REM ================================

echo ================================
echo 智慧慢病管理系统 - 快速部署
echo ================================

REM 检查 Docker 是否安装
docker --version >nul 2>&1
if errorlevel 1 (
    echo 错误: Docker 未安装
    echo 请先安装 Docker: https://docs.docker.com/get-docker/
    exit /b 1
)

REM 检查环境变量文件
if not exist .env.production (
    echo 警告: .env.production 文件不存在
    echo 正在从模板创建...
    copy .env.production.example .env.production
    echo.
    echo 请编辑 .env.production 文件，填写所有必需的配置项
    echo 特别是以下配置必须修改：
    echo   - 所有数据库密码
    echo   - JWT_SECRET
    echo   - ENCRYPTION_KEY
    echo   - DEEPSEEK_API_KEY
    echo.
    pause
)

REM 步骤1: 构建镜像
echo.
echo [步骤 1/4] 构建 Docker 镜像...
docker-compose -f docker-compose.prod.yml build
if errorlevel 1 goto error

REM 步骤2: 启动基础设施服务
echo.
echo [步骤 2/4] 启动基础设施服务...
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d postgres redis influxdb qdrant mongodb emqx minio
if errorlevel 1 goto error

echo 等待基础设施服务启动...
timeout /t 30 /nobreak >nul

REM 步骤3: 启动应用服务
echo.
echo [步骤 3/4] 启动应用服务...
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d backend ai-service frontend-web frontend-patient
if errorlevel 1 goto error

echo 等待应用服务启动...
timeout /t 30 /nobreak >nul

REM 步骤4: 健康检查
echo.
echo [步骤 4/4] 执行健康检查...
call scripts\health-check.bat

REM 显示访问信息
echo.
echo ================================
echo 部署完成！
echo ================================
echo.
echo 服务访问地址：
echo   - 后端 API:        http://localhost:5000
echo   - AI 服务:         http://localhost:8001
echo   - 医生/管理端:     http://localhost:3000
echo   - 患者端:          http://localhost:3001
echo.
echo 管理界面：
echo   - EMQX Dashboard:  http://localhost:18083
echo   - MinIO Console:   http://localhost:9001
echo   - InfluxDB UI:     http://localhost:8086
echo.
echo 常用命令：
echo   - 查看日志:        docker-compose -f docker-compose.prod.yml logs -f
echo   - 停止服务:        docker-compose -f docker-compose.prod.yml stop
echo   - 重启服务:        docker-compose -f docker-compose.prod.yml restart
echo   - 查看状态:        docker-compose -f docker-compose.prod.yml ps
echo.
exit /b 0

:error
echo.
echo ================================
echo 部署失败，请检查错误信息
echo ================================
exit /b 1
