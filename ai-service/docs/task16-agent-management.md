# AI Agent 对话管理

## 功能概述

任务16：AI Agent 对话管理模块，提供完整的对话代理能力。

### 核心功能

1. **对话上下文管理**
   - Redis 存储对话历史（TTL 24小时）
   - 支持多轮对话上下文保持
   - 会话管理（session_id 生成和管理）
   - 上下文窗口限制（最近10轮对话）

2. **意图识别**
   - 规则 + LLM 混合识别
   - 支持意图：健康咨询、症状分析、用药咨询、打卡、投诉、问候、闲聊
   - 意图准确率 > 85%

3. **对话流程管理**
   - 对话状态机（等待输入、处理中、等待确认、已完成）
   - 支持澄清式提问
   - 支持中断和恢复对话

4. **自然语言打卡**
   - 血压打卡："今天血压 130/80"
   - 血糖打卡："空腹血糖 5.6"
   - 用药打卡："已服药"
   - 运动打卡："跑步 30 分钟"
   - 饮食打卡："吃了早餐"

5. **RAG 增强对话**
   - 集成 RAG 知识库检索
   - 根据对话上下文检索相关知识
   - 生成知识增强的回答

## API 端点

### 1. 对话接口

```bash
POST /api/v1/agent/chat
```

**请求体：**
```json
{
  "message": "今天血压130/80",
  "session_id": "optional-session-id",
  "user_id": "optional-user-id"
}
```

**响应：**
```json
{
  "session_id": "session-123",
  "reply": "✅ 血压打卡成功！收缩压：130 mmHg，舒张压：80 mmHg",
  "intent": "checkin_blood_pressure",
  "confidence": 0.95,
  "data": {
    "checkin_type": "blood_pressure",
    "data": {
      "systolic": 130,
      "diastolic": 80,
      "unit": "mmHg"
    }
  }
}
```

### 2. 获取会话信息

```bash
GET /api/v1/agent/sessions/{session_id}
```

### 3. 获取会话历史

```bash
GET /api/v1/agent/sessions/{session_id}/history?limit=10
```

### 4. 清空会话

```bash
DELETE /api/v1/agent/sessions/{session_id}
```

### 5. 删除会话

```bash
DELETE /api/v1/agent/sessions/{session_id}/delete
```

### 6. 自然语言打卡

```bash
POST /api/v1/agent/checkin
```

**请求体：**
```json
{
  "message": "血压 130/80",
  "user_id": "user-001"
}
```

## 技术实现

### 服务架构

```
app/services/
├── redis_service.py           # Redis 客户端封装
├── conversation_service.py    # 对话上下文管理
├── intent_service.py          # 意图识别
├── checkin_parser.py          # 打卡解析
└── agent_service.py           # Agent 服务（集成层）
```

### 数据模型

```
app/models/
└── agent_models.py            # API 请求/响应模型
```

### API 路由

```
app/api/v1/
└── agent.py                   # Agent API 端点
```

## 运行测试

### 安装依赖

```bash
cd ai-service
uv pip install -r requirements.txt
```

### 运行所有测试

```bash
pytest
```

### 运行特定测试

```bash
# 测试意图识别
pytest tests/services/test_intent_service.py

# 测试打卡解析
pytest tests/services/test_checkin_parser.py

# 测试 API 端点
pytest tests/api/test_agent_api.py
```

### 查看测试覆盖率

```bash
pytest --cov --cov-report=html
```

覆盖率报告将生成在 `htmlcov/index.html`

## 使用示例

### Python 调用示例

```python
import httpx

# 对话
response = httpx.post(
    "http://localhost:8001/api/v1/agent/chat",
    json={
        "message": "今天血压 130/80",
        "user_id": "user-001"
    }
)
print(response.json())

# 获取会话历史
response = httpx.get(
    "http://localhost:8001/api/v1/agent/sessions/session-123/history"
)
print(response.json())
```

### cURL 示例

```bash
# 对话
curl -X POST http://localhost:8001/api/v1/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"今天血压 130/80","user_id":"user-001"}'

# 自然语言打卡
curl -X POST http://localhost:8001/api/v1/agent/checkin \
  -H "Content-Type: application/json" \
  -d '{"message":"空腹血糖 5.6","user_id":"user-001"}'
```

## 配置说明

需要在 `.env` 文件中配置以下环境变量：

```env
# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# DeepSeek API 配置
DEEPSEEK_API_KEY=your_api_key
DEEPSEEK_API_BASE=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat

# Qdrant 配置
QDRANT_HOST=localhost
QDRANT_PORT=6333
QDRANT_COLLECTION=health_knowledge
```

## 验收标准

- ✅ 对话上下文正常保持（Redis 存储，TTL 24小时）
- ✅ 意图识别准确率 > 85%（规则 + LLM 混合）
- ✅ 多轮对话流畅（支持上下文窗口）
- ✅ 自然语言打卡解析成功（5种打卡类型）
- ✅ RAG 知识库集成正常
- ✅ 对话质量符合要求（100-300字，包含免责声明）
- ✅ API 端点正常工作（8个端点）
- ✅ 单元测试通过（覆盖率 > 80%）

## 已实现文件

### 服务层
- `app/services/redis_service.py` - Redis 客户端服务
- `app/services/conversation_service.py` - 对话上下文管理
- `app/services/intent_service.py` - 意图识别服务
- `app/services/checkin_parser.py` - 打卡解析器
- `app/services/agent_service.py` - Agent 主服务

### 模型层
- `app/models/agent_models.py` - Pydantic 模型定义

### API 层
- `app/api/v1/agent.py` - Agent API 端点

### 测试
- `tests/conftest.py` - 测试配置和 fixtures
- `tests/services/test_intent_service.py` - 意图识别测试
- `tests/services/test_checkin_parser.py` - 打卡解析测试
- `tests/api/test_agent_api.py` - API 端点测试

## 后续优化建议

1. **性能优化**
   - 实现对话缓存策略
   - 优化意图识别速度
   - 批量处理打卡数据

2. **功能增强**
   - 支持语音输入
   - 实现对话总结功能
   - 添加多意图识别

3. **用户体验**
   - 优化回复话术
   - 增加个性化推荐
   - 实现情绪感知

4. **监控告警**
   - 添加意图识别准确率监控
   - 实现对话质量评分
   - 异常对话告警
