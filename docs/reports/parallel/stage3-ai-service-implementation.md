# Stage3 AI 服务实施计划

> **创建日期**：2026-01-05
> **工作分支**：`feature/stage3-ai-service-reimpl`
> **Worktree 位置**：`D:\Code\ai-gen\intl-health-mgmt-parallel\.ccg\intl-health-mgmt\feature-stage3-ai-service-reimpl`
> **参考文档**：`docs/reference/stage3-ai-features-reference.md`
> **备份分支**：`archive/stage3-ai-service-2026-01-05`

## 一、现状评估

### 1.1 已有代码（master 分支）

**服务层**（`ai-service/app/services/`）：
- ✅ `ai_service.py` - 基础 AI 对话服务（使用 DeepSeek API）
- ✅ `conversation_service.py` - 会话管理服务（MongoDB）
- ✅ `rag_service.py` - RAG 检索服务（Qdrant）
- ✅ `cache_service.py` - 缓存服务
- ✅ `redis_service.py` - Redis 服务
- ✅ `article_service.py` - 文章服务
- ✅ `metrics_service.py` - 指标服务

**路由层**（`ai-service/app/routers/`）：
- ✅ `ai_router.py` - AI 对话路由
- ✅ `education_router.py` - 健康科普路由

**模型层**（`ai-service/app/models/`）：
- ✅ `schemas.py` - 基础数据模型（ChatMessage, ChatRequest, ChatResponse, Conversation, Article）

**API 端点**（`ai-service/app/api/v1/`）：
- ✅ `metrics.py` - 指标端点

### 1.2 缺失功能（需要实现）

根据 `stage3-ai-features-reference.md`，需要补充以下功能：

**P0 核心功能**：
- ❌ `services/deepseek_client.py` - 独立的 DeepSeek API 客户端（带重试、流式响应）
- ❌ `services/embedding_service.py` - 向量嵌入服务
- ❌ `services/qdrant_service.py` - Qdrant 服务封装
- ⚠️ `services/rag_service.py` - 需要增强（批量导入、统计等）
- ❌ `api/v1/rag.py` - RAG API 端点

**P1 重要功能**：
- ⚠️ `services/conversation_service.py` - 需要增强（上下文窗口管理）
- ❌ `services/intent_service.py` - 意图识别服务
- ❌ `services/agent_service.py` - Agent 核心服务
- ❌ `api/v1/agent.py` - Agent API 端点

**P2 扩展功能**：
- ❌ `services/diagnosis_service.py` - 诊断服务（34KB，功能完整）
- ❌ `services/checkin_parser.py` - 打卡解析器
- ❌ `api/v1/diagnosis.py` - 诊断 API 端点
- ❌ `api/v1/ai.py` - AI 通用服务 API 端点

**其他必需组件**：
- ❌ `api/v1/health.py` - 健康检查端点
- ❌ `services/prompt_templates.py` - 提示词模板
- ❌ `models/agent_models.py` - Agent 数据模型
- ❌ `models/diagnosis_models.py` - 诊断数据模型
- ❌ `models/rag_models.py` - RAG 数据模型

## 二、实施策略

### 2.1 整体原则

1. **渐进式实施**：按照 P0 → P1 → P2 的优先级顺序实施
2. **保持兼容**：不破坏现有代码，增量添加功能
3. **参考备份**：从 `archive/stage3-ai-service-2026-01-05` 提取参考代码
4. **测试驱动**：每个模块实现后编写测试
5. **代码规范**：使用 black 格式化、flake8 检查

### 2.2 实施顺序

#### 阶段 1：P0 核心功能（3-5 天）

**目标**：实现 RAG 知识库的完整功能

1. **DeepSeek API 客户端**（`services/deepseek_client.py`）
   - 封装 DeepSeek API 调用
   - 实现自动重试机制（最多 3 次）
   - 支持流式响应
   - Token 使用统计
   - 错误处理和日志记录

2. **向量嵌入服务**（`services/embedding_service.py`）
   - 文本向量化（使用 OpenAI text-embedding-ada-002）
   - 支持批量嵌入
   - 缓存机制（避免重复计算）

3. **Qdrant 服务封装**（`services/qdrant_service.py`）
   - Collection 管理（创建、删除、统计）
   - 向量操作（插入、更新、删除）
   - 批量操作支持

4. **增强 RAG 服务**（`services/rag_service.py`）
   - 添加批量导入功能
   - 添加知识库统计功能
   - 优化检索策略（重排序）

5. **RAG API 端点**（`api/v1/rag.py`）
   - `POST /api/v1/rag/initialize` - 初始化知识库
   - `POST /api/v1/rag/ingest` - 导入单个文档
   - `POST /api/v1/rag/ingest/batch` - 批量导入文档
   - `POST /api/v1/rag/search` - 语义检索
   - `POST /api/v1/rag/query` - RAG 问答
   - `GET /api/v1/rag/stats` - 知识库统计

6. **RAG 数据模型**（`models/rag_models.py`）
   - `IngestDocumentRequest` - 文档导入请求
   - `RAGQueryRequest` - RAG 问答请求
   - `RAGSearchRequest` - 语义检索请求
   - `RAGSearchResult` - 检索结果

#### 阶段 2：P1 重要功能（2-3 天）

**目标**：实现 AI Agent 对话管理

1. **提示词模板**（`services/prompt_templates.py`）
   - 健康咨询提示词
   - 症状分析提示词
   - 用药咨询提示词
   - 诊断建议提示词
   - RAG 问答提示词
   - 意图识别提示词

2. **意图识别服务**（`services/intent_service.py`）
   - 识别用户意图（咨询、打卡、闲聊等）
   - 返回置信度评分
   - 支持多意图识别

3. **增强会话管理服务**（`services/conversation_service.py`）
   - 上下文窗口管理（最近 10 条消息）
   - 会话过期清理
   - 会话摘要生成

4. **Agent 服务**（`services/agent_service.py`）
   - 智能对话管理
   - 自然语言打卡解析
   - 多轮对话上下文维护

5. **Agent API 端点**（`api/v1/agent.py`）
   - `POST /api/v1/agent/chat` - AI 对话
   - `GET /api/v1/agent/sessions/{session_id}` - 获取会话信息
   - `GET /api/v1/agent/sessions/{session_id}/history` - 获取会话历史
   - `POST /api/v1/agent/checkin` - 自然语言打卡
   - `DELETE /api/v1/agent/sessions/{session_id}` - 删除会话

6. **Agent 数据模型**（`models/agent_models.py`）
   - `ChatRequest` - 对话请求
   - `ChatResponse` - 对话响应
   - `CheckinRequest` - 打卡请求
   - `CheckinResponse` - 打卡响应
   - `SessionInfoResponse` - 会话信息

#### 阶段 3：P2 扩展功能（2-3 天）

**目标**：实现 AI 辅助诊断和通用服务

1. **诊断服务**（`services/diagnosis_service.py`）
   - 健康摘要生成
   - 风险评估（低、中、高）
   - 诊断建议
   - 用药建议
   - 生活方式建议
   - 综合诊断报告

2. **打卡解析器**（`services/checkin_parser.py`）
   - 解析自然语言打卡内容
   - 提取打卡类型、数值、时间等信息
   - 验证打卡数据合法性

3. **诊断 API 端点**（`api/v1/diagnosis.py`）
   - `POST /api/v1/diagnosis/health-summary` - 生成健康摘要
   - `POST /api/v1/diagnosis/risk-assessment` - 风险评估
   - `POST /api/v1/diagnosis/recommendations` - 诊断建议
   - `POST /api/v1/diagnosis/medication-advice` - 用药建议
   - `POST /api/v1/diagnosis/lifestyle-advice` - 生活方式建议
   - `POST /api/v1/diagnosis/report` - 综合诊断报告

4. **AI 通用服务 API 端点**（`api/v1/ai.py`）
   - `POST /api/v1/ai/education` - 健康科普
   - `POST /api/v1/ai/symptom-analysis` - 症状分析
   - `POST /api/v1/ai/medication-consultation` - 用药咨询
   - `POST /api/v1/ai/diet-advice` - 饮食建议
   - `POST /api/v1/ai/exercise-advice` - 运动建议

5. **诊断数据模型**（`models/diagnosis_models.py`）
   - `HealthSummaryRequest` - 健康摘要请求
   - `RiskAssessmentRequest` - 风险评估请求
   - `DiagnosticAdviceRequest` - 诊断建议请求
   - `MedicationAdviceRequest` - 用药建议请求
   - `LifestyleAdviceRequest` - 生活方式建议请求

#### 阶段 4：健康检查和测试（2-3 天）

**目标**：完善健康检查和测试覆盖

1. **健康检查端点**（`api/v1/health.py`）
   - `GET /api/v1/health` - 服务健康检查
   - `GET /api/v1/health/dependencies` - 依赖服务状态检查（Qdrant、Redis、MongoDB）

2. **单元测试**（覆盖率 > 70%）
   - 每个服务的单元测试
   - Mock 外部依赖（DeepSeek API、Qdrant、MongoDB）
   - 测试边界条件和异常情况

3. **集成测试**
   - 端到端 API 测试
   - 真实环境测试（使用 Docker Compose）
   - 性能测试（RAG 检索 < 500ms，对话响应 < 2s）

## 三、技术要求

### 3.1 DeepSeek API 集成

```python
# 配置
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1"
MODEL = "deepseek-chat"

# 重试机制
MAX_RETRIES = 3
RETRY_DELAY = 1  # 秒

# 超时设置
TIMEOUT = 30  # 秒
```

### 3.2 RAG 知识库

```python
# Qdrant 配置
QDRANT_URL = "http://localhost:6333"
COLLECTION_NAME = "health_knowledge"
VECTOR_SIZE = 1536  # text-embedding-ada-002

# 检索策略
TOP_K = 5
SCORE_THRESHOLD = 0.7

# 文本分块
CHUNK_SIZE = 500  # 字符
CHUNK_OVERLAP = 50  # 字符
```

### 3.3 会话管理

```python
# MongoDB 配置
MONGODB_URL = "mongodb://localhost:27017"
DB_NAME = "ai_service"
COLLECTION_NAME = "conversations"

# 上下文窗口
MAX_CONTEXT_MESSAGES = 10

# 会话过期
SESSION_EXPIRY_DAYS = 30
```

### 3.4 安全要求

1. **免责声明**：所有 AI 建议必须包含
   ```
   此建议仅供参考，请咨询专业医生。
   ```

2. **输入验证**：使用 Pydantic 验证所有输入

3. **敏感数据脱敏**：日志中不输出敏感信息

4. **速率限制**：防止 API 滥用（100 req/min）

### 3.5 性能要求

- RAG 检索性能 < 500ms
- 对话响应时间 < 2s
- 并发支持：100 并发用户
- 使用异步处理（asyncio）

## 四、依赖管理

### 4.1 新增依赖

```txt
# 已有
fastapi==0.104.1
uvicorn==0.24.0
pydantic==2.5.0
loguru==0.7.2
httpx==0.25.1
qdrant-client==1.7.0
openai==1.3.5
pymongo==4.6.0
motor==3.3.2
redis==5.0.1

# 可能需要新增
sentence-transformers==2.2.2  # 可选，本地嵌入模型
tiktoken==0.5.1  # Token 计数
```

### 4.2 环境变量

```bash
# DeepSeek API
DEEPSEEK_API_KEY=your_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_TIMEOUT=30
DEEPSEEK_MAX_RETRIES=3

# Qdrant
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION=health_knowledge

# MongoDB
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB_NAME=ai_service

# Redis
REDIS_URL=redis://localhost:6379

# RAG 配置
RAG_TOP_K=5
RAG_SCORE_THRESHOLD=0.7

# 免责声明
DISCLAIMER_TEXT=此建议仅供参考，请咨询专业医生。
```

## 五、测试策略

### 5.1 单元测试

**测试框架**：pytest

**测试覆盖**：
- 每个服务独立测试
- Mock 外部依赖
- 测试边界条件
- 测试异常情况

**示例**：
```python
# tests/services/test_deepseek_client.py
import pytest
from unittest.mock import AsyncMock, patch
from app.services.deepseek_client import DeepSeekClient

@pytest.mark.asyncio
async def test_chat_success():
    client = DeepSeekClient()
    with patch.object(client.client.chat.completions, 'create', new_callable=AsyncMock) as mock_create:
        mock_create.return_value = MockResponse(...)
        result = await client.chat([{"role": "user", "content": "test"}])
        assert result["content"] is not None
```

### 5.2 集成测试

**测试环境**：Docker Compose

**测试覆盖**：
- 端到端 API 测试
- 真实环境测试
- 性能测试

**示例**：
```python
# tests/integration/test_rag_api.py
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_rag_query_e2e():
    async with AsyncClient(app=app, base_url="http://test") as client:
        # 1. 初始化知识库
        response = await client.post("/api/v1/rag/initialize")
        assert response.status_code == 200

        # 2. 导入文档
        response = await client.post("/api/v1/rag/ingest", json={...})
        assert response.status_code == 200

        # 3. RAG 问答
        response = await client.post("/api/v1/rag/query", json={...})
        assert response.status_code == 200
        assert "此建议仅供参考" in response.json()["answer"]
```

### 5.3 性能测试

**工具**：locust

**测试指标**：
- RAG 检索性能 < 500ms
- 对话响应时间 < 2s
- 并发支持：100 并发用户

## 六、代码规范

### 6.1 格式化

```bash
# 使用 black 格式化
black ai-service/

# 使用 flake8 检查
flake8 ai-service/

# 使用 mypy 类型检查
mypy ai-service/
```

### 6.2 文档字符串

```python
def function_name(param1: str, param2: int) -> Dict[str, Any]:
    """
    函数简短描述

    Args:
        param1: 参数1描述
        param2: 参数2描述

    Returns:
        返回值描述

    Raises:
        ExceptionType: 异常描述
    """
    pass
```

### 6.3 日志规范

```python
from loguru import logger

# 使用结构化日志
logger.info(f"DeepSeek API request: messages={len(messages)}, temperature={temperature}")
logger.error(f"DeepSeek API error: {error}", exc_info=True)
```

## 七、风险和挑战

### 7.1 技术风险

1. **DeepSeek API 稳定性**
   - 风险：API 可能不稳定或限流
   - 缓解：实现重试机制、降级策略

2. **Qdrant 性能**
   - 风险：大规模向量检索性能下降
   - 缓解：优化索引、使用缓存

3. **MongoDB 存储**
   - 风险：会话数据量大导致性能问题
   - 缓解：定期清理过期会话、使用索引

### 7.2 集成风险

1. **与现有代码冲突**
   - 风险：新代码可能与现有代码冲突
   - 缓解：渐进式实施、充分测试

2. **依赖版本冲突**
   - 风险：新依赖可能与现有依赖冲突
   - 缓解：使用虚拟环境、锁定版本

### 7.3 时间风险

1. **实施时间超预期**
   - 风险：功能复杂度超预期
   - 缓解：按优先级实施、及时调整计划

## 八、下一步行动

### 8.1 立即行动

1. **@architect 审查**
   - 审查现有代码结构
   - 评估整合方案
   - 识别潜在冲突

2. **环境准备**
   - 确保 Docker Compose 服务运行
   - 配置环境变量
   - 安装依赖

3. **开始实施**
   - 从 P0 核心功能开始
   - 每个模块实现后提交代码
   - 编写测试确保质量

### 8.2 里程碑

- **Week 1**：完成 P0 核心功能（RAG 知识库）
- **Week 2**：完成 P1 重要功能（AI Agent 对话）
- **Week 3**：完成 P2 扩展功能（AI 辅助诊断）
- **Week 4**：完成测试和优化

### 8.3 验收标准

- [ ] 所有 API 端点实现并测试通过
- [ ] 单元测试覆盖率 > 70%
- [ ] 集成测试通过
- [ ] 性能测试达标（RAG < 500ms，对话 < 2s）
- [ ] 代码规范检查通过（black、flake8、mypy）
- [ ] 文档完整（API 文档、使用说明）
- [ ] @architect 审查通过

## 九、参考资源

### 9.1 官方文档

- [DeepSeek API 文档](https://platform.deepseek.com/docs)
- [Qdrant 文档](https://qdrant.tech/documentation/)
- [FastAPI 文档](https://fastapi.tiangolo.com/)
- [Pydantic 文档](https://docs.pydantic.dev/)

### 9.2 备份代码

```bash
# 查看备份分支
git checkout archive/stage3-ai-service-2026-01-05

# 提取特定文件
git show archive/stage3-ai-service-2026-01-05:ai-service/app/services/deepseek_client.py
```

### 9.3 项目文档

- 需求文档：`.claude/specs/chronic-disease-management/requirements.md`
- 设计文档：`.claude/specs/chronic-disease-management/design.md`
- 任务清单：`.claude/specs/chronic-disease-management/tasks.md`
- 参考文档：`docs/reference/stage3-ai-features-reference.md`

---

**创建人**：PM Agent
**审查人**：待 @architect 审查
**状态**：待审查
