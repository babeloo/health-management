#!/bin/bash

# ================================
# 服务健康检查脚本
# ================================

set -e

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "================================"
echo "服务健康检查"
echo "================================"

# 检查服务是否运行
check_service() {
    local service=$1
    local url=$2
    local max_retries=30
    local retry=0

    echo -e "\n${YELLOW}检查服务: ${service}${NC}"
    echo "  URL: ${url}"

    while [ $retry -lt $max_retries ]; do
        if curl -f -s -o /dev/null "$url"; then
            echo -e "  ${GREEN}✓ 服务正常${NC}"
            return 0
        fi
        retry=$((retry + 1))
        echo -n "."
        sleep 2
    done

    echo -e "\n  ${RED}✗ 服务不可用${NC}"
    return 1
}

# 检查 Docker 容器状态
check_container() {
    local container=$1
    echo -e "\n${YELLOW}检查容器: ${container}${NC}"

    if docker ps --format "{{.Names}}" | grep -q "^${container}$"; then
        local status=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "no-healthcheck")
        echo "  状态: ${status}"

        if [ "$status" = "healthy" ] || [ "$status" = "no-healthcheck" ]; then
            echo -e "  ${GREEN}✓ 容器运行正常${NC}"
            return 0
        else
            echo -e "  ${RED}✗ 容器不健康${NC}"
            return 1
        fi
    else
        echo -e "  ${RED}✗ 容器未运行${NC}"
        return 1
    fi
}

all_passed=true

# 检查基础设施服务
echo -e "\n${YELLOW}=== 基础设施服务 ===${NC}"
check_container "health-postgres" || all_passed=false
check_container "health-redis" || all_passed=false
check_container "health-influxdb" || all_passed=false
check_container "health-qdrant" || all_passed=false
check_container "health-mongodb" || all_passed=false
check_container "health-emqx" || all_passed=false
check_container "health-minio" || all_passed=false

# 检查应用服务
echo -e "\n${YELLOW}=== 应用服务 ===${NC}"
check_container "health-backend" || all_passed=false
check_container "health-ai-service" || all_passed=false
check_container "health-frontend-web" || all_passed=false
check_container "health-frontend-patient" || all_passed=false

# 检查 HTTP 端点
echo -e "\n${YELLOW}=== HTTP 健康检查 ===${NC}"
check_service "Backend API" "http://localhost:5000/health" || all_passed=false
check_service "AI Service" "http://localhost:8001/health" || all_passed=false
check_service "Frontend Web" "http://localhost:3000/health" || all_passed=false
check_service "Frontend Patient" "http://localhost:3001/health" || all_passed=false

# 总结
echo -e "\n================================"
if [ "$all_passed" = true ]; then
    echo -e "${GREEN}✓ 所有服务运行正常${NC}"
    exit 0
else
    echo -e "${RED}✗ 部分服务异常，请检查日志${NC}"
    echo -e "\n查看日志命令："
    echo "  docker-compose -f docker-compose.prod.yml logs -f [service-name]"
    exit 1
fi
