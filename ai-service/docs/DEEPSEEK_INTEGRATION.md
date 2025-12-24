# DeepSeek API 集成文档

## 概述

本模块实现了 DeepSeek API 的完整集成，提供以下功能：

- **对话接口**：支持多轮对话和流式响应
- **健康建议生成**：基于患者数据生成个性化建议
- **症状分析**：分析症状并提供初步建议
- **用药指导**：提供药物使用信息
- **健康科普**：生成通俗易懂的科普内容
- **风险评估**：评估患者健康风险
- **Token 统计**：跟踪 API 使用情况

## 目录结构

```
app/
├── services/
│   ├── deepseek_client.py      # DeepSeek API 客户端封装
│   ├── prompt_templates.py      # Prompt 模板管理
│   └── ai_service.py            # AI 服务核心逻辑
├── models/
│   └── ai_models.py             # API 请求/响应数据模型
└── api/
    └── v1/
        └── ai.py                # AI API 端点

tests/
├── test_deepseek_client.py      # DeepSeek 客户端测试
├── test_prompt_templates.py      # Prompt 模板测试
├── test_ai_service.py            # AI 服务测试
└── test_ai_api.py                # API 集成测试
```

## 配置说明

### 环境变量

在 `.env` 文件中配置以下变量：

```bash
# DeepSeek API 配置
DEEPSEEK_API_KEY=your_deepseek_api_key_here
DEEPSEEK_API_BASE=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_TEMPERATURE=0.7
DEEPSEEK_MAX_TOKENS=2000
DEEPSEEK_TIMEOUT=60
DEEPSEEK_MAX_RETRIES=3
```

### 获取 API Key

1. 访问 [DeepSeek 开放平台](https://platform.deepseek.com/)
2. 注册账号并登录
3. 在控制台中创建 API Key
4. 将 API Key 复制到 `.env` 文件中

## API 端点

### 1. 对话接口

**端点**: `POST /api/v1/ai/chat`

**请求体**:
```json
{
  "message": "高血压患者应该注意什么？",
  "conversation_history": [
    {"role": "user", "content": "你好"},
    {"role": "assistant", "content": "你好！有什么可以帮助你的？"}
  ],
  "stream": false
}
```

**响应**:
```json
{
  "content": "高血压患者需要注意...\n\n【免责声明】此建议仅供参考，请咨询专业医生。",
  "finish_reason": "stop",
  "usage": {
    "prompt_tokens": 50,
    "completion_tokens": 200,
    "total_tokens": 250
  }
}
```

### 2. 健康建议

**端点**: `POST /api/v1/ai/health-advice`

**请求体**:
```json
{
  "health_data": {
    "age": 45,
    "diseases": ["高血压"],
    "recent_check_ins": {
      "blood_pressure": 5,
      "medication": 7
    },
    "average_bp": {
      "systolic": 145,
      "diastolic": 90
    },
    "risk_level": "medium"
  }
}
```

**响应**:
```json
{
  "advice": "基于您的健康数据，建议：\n1. 饮食方面...\n\n【免责声明】此建议仅供参考，请咨询专业医生。",
  "finish_reason": "stop",
  "usage": {...}
}
```

### 3. 症状分析

**端点**: `POST /api/v1/ai/symptom-analysis`

**请求体**:
```json
{
  "symptoms": "头晕、头痛，特别是早上起床时",
  "patient_data": {
    "age": 50,
    "gender": "male",
    "diseases": ["高血压"],
    "recent_data": {
      "blood_pressure": {
        "systolic": 160,
        "diastolic": 95
      }
    }
  }
}
```

### 4. 用药指导

**端点**: `POST /api/v1/ai/medication-guide`

**请求体**:
```json
{
  "medication_name": "硝苯地平缓释片",
  "patient_info": {
    "age": 55,
    "diseases": ["高血压"]
  }
}
```

### 5. 健康科普

**端点**: `POST /api/v1/ai/health-education`

**请求体**:
```json
{
  "topic": "高血压饮食注意事项",
  "patient_context": {
    "age": 45,
    "diseases": ["高血压"]
  }
}
```

### 6. 风险评估

**端点**: `POST /api/v1/ai/risk-assessment`

**请求体**:
```json
{
  "health_data": {
    "age": 50,
    "gender": "male",
    "bmi": 28.5,
    "diseases": ["高血压"],
    "health_metrics": {
      "blood_pressure": {
        "systolic": 150,
        "diastolic": 95
      }
    }
  }
}
```

### 7. Token 使用统计

**端点**: `GET /api/v1/ai/usage`

**响应**:
```json
{
  "prompt_tokens": 5000,
  "completion_tokens": 10000,
  "total_tokens": 15000,
  "requests": 50
}
```

## 使用示例

### Python 示例

```python
import httpx

# 对话接口
async def chat_example():
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:8000/api/v1/ai/chat",
            json={
                "message": "高血压患者应该注意什么？",
                "stream": False
            }
        )
        data = response.json()
        print(data["content"])

# 健康建议
async def health_advice_example():
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:8000/api/v1/ai/health-advice",
            json={
                "health_data": {
                    "age": 45,
                    "diseases": ["高血压"],
                    "average_bp": {
                        "systolic": 145,
                        "diastolic": 90
                    }
                }
            }
        )
        data = response.json()
        print(data["advice"])
```

### cURL 示例

```bash
# 对话接口
curl -X POST http://localhost:8000/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "高血压患者应该注意什么？",
    "stream": false
  }'

# 健康建议
curl -X POST http://localhost:8000/api/v1/ai/health-advice \
  -H "Content-Type: application/json" \
  -d '{
    "health_data": {
      "age": 45,
      "diseases": ["高血压"],
      "average_bp": {
        "systolic": 145,
        "diastolic": 90
      }
    }
  }'
```

## 核心特性

### 1. 自动重试机制

- API 调用失败时自动重试最多 3 次
- 支持指数退避策略
- 处理超时和频率限制错误

```python
# 在 deepseek_client.py 中实现
for attempt in range(self.max_retries + 1):
    try:
        response = await self.client.chat.completions.create(...)
        return response
    except APITimeoutError:
        if attempt >= self.max_retries:
            raise DeepSeekAPIError("API 请求超时")
        await asyncio.sleep(2 ** attempt)  # 指数退避
```

### 2. 免责声明

所有 AI 输出都会自动添加免责声明：

```
【免责声明】此建议仅供参考，请咨询专业医生。
```

实现在 `prompt_templates.py` 中：

```python
def add_disclaimer(response: str) -> str:
    if "仅供参考" in response:
        return response  # 避免重复添加
    return response + DISCLAIMER
```

### 3. Prompt 模板管理

支持多种场景的 Prompt 模板：

- 健康科普
- 症状分析
- 用药指导
- 生活方式建议
- 风险评估
- 普通对话

每种模板都有专门的系统角色和 Prompt 构建逻辑。

### 4. Token 使用统计

实时跟踪 API Token 使用情况：

```python
stats = ai_service.get_usage_stats()
print(f"总 tokens: {stats['total_tokens']}")
print(f"请求次数: {stats['requests']}")
```

## 测试

### 运行所有测试

```bash
cd ai-service
pytest tests/ -v
```

### 运行特定测试

```bash
# DeepSeek 客户端测试
pytest tests/test_deepseek_client.py -v

# Prompt 模板测试
pytest tests/test_prompt_templates.py -v

# AI 服务测试
pytest tests/test_ai_service.py -v

# API 集成测试
pytest tests/test_ai_api.py -v
```

### 测试覆盖率

```bash
pytest tests/ --cov=app --cov-report=html
```

查看覆盖率报告：打开 `htmlcov/index.html`

## 错误处理

### 常见错误

**1. API Key 无效**

```
DeepSeekAPIError: API 调用失败: Invalid API key
```

解决方法：检查 `.env` 文件中的 `DEEPSEEK_API_KEY` 是否正确

**2. API 请求超时**

```
DeepSeekAPIError: API 请求超时，已重试 3 次
```

解决方法：
- 检查网络连接
- 增加 `DEEPSEEK_TIMEOUT` 值
- 检查 DeepSeek 服务状态

**3. 频率限制**

```
DeepSeekAPIError: API 请求频率限制，请稍后再试
```

解决方法：
- 降低请求频率
- 升级 API 套餐
- 实现请求队列

### 错误日志

所有错误都会记录到日志文件：

```bash
# 查看日志
tail -f logs/ai-service.log
```

## 性能优化

### 1. 使用流式响应

对于长文本生成，使用流式响应可以提升用户体验：

```python
response = await client.post(
    "/api/v1/ai/chat",
    json={"message": "...", "stream": True}
)
```

### 2. 缓存常见问题

对于常见的健康问题，可以实现 Redis 缓存：

```python
# 伪代码
cached_response = redis.get(f"ai:chat:{question_hash}")
if cached_response:
    return cached_response
```

### 3. 批量处理

如果需要批量生成健康建议，使用异步并发：

```python
import asyncio

async def batch_generate_advice(patients):
    tasks = [
        ai_service.generate_health_advice(patient_data)
        for patient_data in patients
    ]
    return await asyncio.gather(*tasks)
```

## 安全注意事项

1. **API Key 保护**
   - 不要在代码中硬编码 API Key
   - 不要提交包含 API Key 的 `.env` 文件到版本控制
   - 定期轮换 API Key

2. **输入验证**
   - 所有输入都经过 Pydantic 验证
   - 防止注入攻击

3. **免责声明**
   - 所有 AI 输出必须包含免责声明
   - 不能替代专业医疗建议

4. **隐私保护**
   - 不在日志中记录敏感患者信息
   - API 请求中不包含身份证号等敏感数据

## 下一步

- [ ] 实现 Redis 缓存（常见问题缓存）
- [ ] 集成 RAG 知识库（任务 15）
- [ ] 实现 AI Agent 对话（任务 16）
- [ ] 添加多模型支持（GPT-4、Claude 等）
- [ ] 实现请求队列和流控

## 参考资料

- [DeepSeek API 文档](https://platform.deepseek.com/docs)
- [FastAPI 文档](https://fastapi.tiangolo.com/)
- [Pydantic 文档](https://docs.pydantic.dev/)
- [OpenAI SDK 文档](https://github.com/openai/openai-python)

## 联系方式

如有问题，请联系 AI 服务开发团队。
