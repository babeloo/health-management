#!/bin/bash

echo "======================================"
echo "AI功能集成测试"
echo "======================================"
echo ""

BASE_URL="http://localhost:5000/api/v1"
AI_URL="http://localhost:8001"
TOKEN=""

echo "测试 1: 用户登录获取Token"
echo "--------------------------------------"
RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"Test123456"}')

echo "Response: $RESPONSE"

# 提取Token
TOKEN=$(echo $RESPONSE | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ 登录失败，无法获取Token"
  echo ""
  echo "尝试注册新用户..."
  REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"username":"testuser","password":"Test123456","email":"test@example.com","phone":"13800138000","realName":"测试用户","role":"PATIENT"}')

  echo "Register Response: $REGISTER_RESPONSE"

  # 再次尝试登录
  RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"testuser","password":"Test123456"}')

  TOKEN=$(echo $RESPONSE | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
fi

if [ -z "$TOKEN" ]; then
  echo "❌ 仍然无法获取Token，终止测试"
  exit 1
fi

echo "✅ 登录成功，Token: ${TOKEN:0:20}..."
echo ""

echo "测试 2: AI聊天对话（通过后端代理）"
echo "--------------------------------------"
CHAT_RESPONSE=$(curl -s -X POST "$BASE_URL/ai/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message":"我最近血压偏高，应该注意什么？"}')

echo "Response: $CHAT_RESPONSE"
echo ""

# 提取conversation_id
CONVERSATION_ID=$(echo $CHAT_RESPONSE | grep -o '"conversation_id":"[^"]*"' | cut -d'"' -f4)

if [ ! -z "$CONVERSATION_ID" ]; then
  echo "✅ AI聊天成功，对话ID: $CONVERSATION_ID"
else
  echo "❌ AI聊天失败"
fi
echo ""

echo "测试 3: 获取对话历史"
echo "--------------------------------------"
if [ ! -z "$CONVERSATION_ID" ]; then
  HISTORY_RESPONSE=$(curl -s -X GET "$BASE_URL/ai/conversations/$CONVERSATION_ID" \
    -H "Authorization: Bearer $TOKEN")

  echo "Response: $HISTORY_RESPONSE"
  echo "✅ 对话历史获取完成"
else
  echo "⏭️ 跳过（无对话ID）"
fi
echo ""

echo "测试 4: 科普文章列表"
echo "--------------------------------------"
ARTICLES_RESPONSE=$(curl -s -X GET "$BASE_URL/education/articles?page=1&pageSize=10" \
  -H "Authorization: Bearer $TOKEN")

echo "Response: $ARTICLES_RESPONSE"
echo ""

echo "测试 5: AI服务健康检查"
echo "--------------------------------------"
HEALTH_RESPONSE=$(curl -s -X GET "$AI_URL/health")

echo "Response: $HEALTH_RESPONSE"
echo ""

echo "======================================"
echo "测试完成"
echo "======================================"
