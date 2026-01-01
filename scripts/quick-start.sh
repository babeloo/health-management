#!/bin/bash

# ================================
# 快速部署脚本
# ================================

set -e

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "================================"
echo "智慧慢病管理系统 - 快速部署"
echo "================================"
echo -e "${NC}"

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo -e "${RED}错误: Docker 未安装${NC}"
    echo "请先安装 Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# 检查 Docker Compose 是否安装
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}错误: Docker Compose 未安装${NC}"
    echo "请先安装 Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

# 检查环境变量文件
if [ ! -f .env.production ]; then
    echo -e "${YELLOW}警告: .env.production 文件不存在${NC}"
    echo "正在从模板创建..."
    cp .env.production.example .env.production
    echo -e "${RED}请编辑 .env.production 文件，填写所有必需的配置项${NC}"
    echo "特别是以下配置必须修改："
    echo "  - 所有数据库密码"
    echo "  - JWT_SECRET"
    echo "  - ENCRYPTION_KEY"
    echo "  - DEEPSEEK_API_KEY"
    echo ""
    read -p "按回车键继续（确认已配置完成）..."
fi

# 步骤1: 构建镜像
echo -e "\n${YELLOW}[步骤 1/4] 构建 Docker 镜像...${NC}"
docker-compose -f docker-compose.prod.yml build

# 步骤2: 启动基础设施服务
echo -e "\n${YELLOW}[步骤 2/4] 启动基础设施服务...${NC}"
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d \
    postgres redis influxdb qdrant mongodb emqx minio

echo "等待基础设施服务启动..."
sleep 30

# 步骤3: 启动应用服务
echo -e "\n${YELLOW}[步骤 3/4] 启动应用服务...${NC}"
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d \
    backend ai-service frontend-web frontend-patient

echo "等待应用服务启动..."
sleep 30

# 步骤4: 健康检查
echo -e "\n${YELLOW}[步骤 4/4] 执行健康检查...${NC}"
./scripts/health-check.sh

# 显示访问信息
echo -e "\n${GREEN}================================"
echo "部署完成！"
echo "================================${NC}"
echo ""
echo "服务访问地址："
echo "  - 后端 API:        http://localhost:5000"
echo "  - AI 服务:         http://localhost:8001"
echo "  - 医生/管理端:     http://localhost:3000"
echo "  - 患者端:          http://localhost:3001"
echo ""
echo "管理界面："
echo "  - EMQX Dashboard:  http://localhost:18083"
echo "  - MinIO Console:   http://localhost:9001"
echo "  - InfluxDB UI:     http://localhost:8086"
echo ""
echo "常用命令："
echo "  - 查看日志:        docker-compose -f docker-compose.prod.yml logs -f"
echo "  - 停止服务:        docker-compose -f docker-compose.prod.yml stop"
echo "  - 重启服务:        docker-compose -f docker-compose.prod.yml restart"
echo "  - 查看状态:        docker-compose -f docker-compose.prod.yml ps"
echo ""
