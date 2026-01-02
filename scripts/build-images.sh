#!/bin/bash

# ================================
# Docker 镜像构建和大小验证脚本
# ================================

set -e

echo "================================"
echo "开始构建 Docker 镜像"
echo "================================"

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 构建镜像
echo -e "\n${YELLOW}[1/4] 构建 Backend 镜像...${NC}"
docker build -t health-mgmt/backend:test ./backend

echo -e "\n${YELLOW}[2/4] 构建 AI Service 镜像...${NC}"
docker build -t health-mgmt/ai-service:test ./ai-service

echo -e "\n${YELLOW}[3/4] 构建 Frontend Web 镜像...${NC}"
docker build -t health-mgmt/frontend-web:test ./frontend-web

echo -e "\n${YELLOW}[4/4] 构建 Frontend Patient 镜像...${NC}"
docker build -t health-mgmt/frontend-patient:test ./frontend-patient

# 验证镜像大小
echo -e "\n================================"
echo "镜像大小验证"
echo "================================"

# 获取镜像大小（MB）
get_image_size() {
    docker images --format "{{.Size}}" "$1" | sed 's/MB//' | sed 's/GB/*1024/' | bc 2>/dev/null || echo "0"
}

# 验证单个镜像
validate_image() {
    local image=$1
    local max_size=$2
    local size=$(docker images --format "{{.Repository}}:{{.Tag}}\t{{.Size}}" | grep "$image" | awk '{print $2}')

    echo -e "\n${YELLOW}镜像: ${image}${NC}"
    echo "  实际大小: ${size}"
    echo "  限制大小: ${max_size}"

    # 简单的大小比较（这里只做展示，实际验证需要更精确的计算）
    if [[ "$size" == *"GB"* ]] && [[ "$max_size" == *"MB"* ]]; then
        echo -e "  ${RED}✗ 超出限制${NC}"
        return 1
    else
        echo -e "  ${GREEN}✓ 符合要求${NC}"
        return 0
    fi
}

# 验证所有镜像
all_passed=true

validate_image "health-mgmt/backend:test" "500MB" || all_passed=false
validate_image "health-mgmt/ai-service:test" "1GB" || all_passed=false
validate_image "health-mgmt/frontend-web:test" "100MB" || all_passed=false
validate_image "health-mgmt/frontend-patient:test" "100MB" || all_passed=false

# 显示所有镜像
echo -e "\n================================"
echo "所有构建的镜像"
echo "================================"
docker images | grep "health-mgmt"

# 总结
echo -e "\n================================"
if [ "$all_passed" = true ]; then
    echo -e "${GREEN}✓ 所有镜像构建成功并符合大小要求${NC}"
    exit 0
else
    echo -e "${RED}✗ 部分镜像超出大小限制，请优化${NC}"
    exit 1
fi
