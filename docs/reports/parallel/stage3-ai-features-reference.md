# Stage3 AI 服务功能参考文档

> **备份位置**：`archive/stage3-ai-service-2026-01-05` tag
> **创建日期**：2026-01-05
> **状态**：未合并到 master，作为功能参考保留

## 概述

`feature/stage3-ai-service` 分支包含完整的 AI 服务功能实现，包括 AI Agent 对话、辅助诊断、RAG 知识库等核心功能。由于与 master 分支存在较大差异（16 个文件冲突），建议参考此文档在 master 基础上重新实现。

## 核心功能模块

### 1. AI Agent 对话管理 (`/api/v1/agent`)

**文件位置**：`ai-service/app/api/v1/agent.py`

**功能特性**：

- ✅ 智能对话：支持健康咨询、症状分析、用药咨询
- ✅ 自然语言打卡：用户可以用自然语言描述打卡内容
- ✅ 会话管理：支持多轮对话，保持上下文
- ✅ 意图识别：自动识别用户意图（咨询、打卡、闲聊等）
- ✅ 置信度评分：返回意图识别的置信度

**API 端点**：

```
POST /api/v1/agent/chat                    # AI 对话
GET  /api/v1/agent/sessions/{session_id}   # 获取会话信息
GET  /api/v1/agent/sessions/{session_id}/history  # 获取会话历史
POST /api/v1/agent/checkin                 # 自然语言打卡
DELETE /api/v1/agent/sessions/{session_id} # 删除会话
```

**关键服务**：

- `agent_service.py` - Agent 核心服务
- `intent_service.py` - 意图识别服务
- `checkin_parser.py` - 打卡内容解析器

**实现要点**：

1. 使用 DeepSeek API 进行对话生成
2. 意图识别支持：健康咨询、打卡、用药咨询、闲聊
3. 自然语言打卡解析：提取打卡类型、数值、时间等信息
4. 会话存储在 MongoDB，支持历史记录查询

---

### 2. AI 辅助诊断 (`/api/v1/diagnosis`)

**文件位置**：`ai-service/app/api/v1/diagnosis.py`

**功能特性**：

- ✅ 健康摘要生成：基于患者数据生成健康状况摘要
- ✅ 风险评估：评估慢病风险等级（低、中、高）
- ✅ 诊断建议：提供个性化诊断建议
- ✅ 用药建议：基于病情和用药历史提供用药建议
- ✅ 生活方式建议：饮食、运动、作息等建议
- ✅ 综合诊断报告：生成完整的诊断报告

**API 端点**：

```
POST /api/v1/diagnosis/health-summary      # 生成健康摘要
POST /api/v1/diagnosis/risk-assessment     # 风险评估
POST /api/v1/diagnosis/recommendations     # 诊断建议
POST /api/v1/diagnosis/medication-advice   # 用药建议
POST /api/v1/diagnosis/lifestyle-advice    # 生活方式建议
POST /api/v1/diagnosis/report              # 综合诊断报告
```

**关键服务**：

- `diagnosis_service.py` - 诊断核心服务（34KB，功能完整）

**实现要点**：

1. 支持多种健康指标：血压、血糖、心率、体重、BMI 等
2. 异常指标识别：自动标记超出正常范围的指标
3. 趋势分析：分析健康指标的变化趋势
4. 风险评估算法：基于年龄、性别、疾病史、指标异常等因素
5. 免责声明：所有 AI 建议必须包含"此建议仅供参考，请咨询专业医生"

---

### 3. RAG 知识库 (`/api/v1/rag`)

**文件位置**：`ai-service/app/api/v1/rag.py`

**功能特性**：

- ✅ 知识库初始化：创建 Qdrant collection
- ✅ 文档导入：单个/批量导入健康知识文档
- ✅ 语义检索：基于向量相似度的知识检索
- ✅ RAG 问答：检索相关知识后生成回答
- ✅ 知识库统计：查看文档数量、向量维度等信息

**API 端点**：

```
POST /api/v1/rag/initialize                # 初始化知识库
POST /api/v1/rag/ingest                    # 导入单个文档
POST /api/v1/rag/ingest/batch              # 批量导入文档
POST /api/v1/rag/search                    # 语义检索
POST /api/v1/rag/query                     # RAG 问答
GET  /api/v1/rag/stats                     # 知识库统计
```

**关键服务**：

- `rag_service.py` - RAG 核心服务
- `qdrant_service.py` - Qdrant 向量数据库服务
- `embedding_service.py` - 文本向量化服务

**实现要点**：

1. 使用 Qdrant 作为向量数据库
2. 文本分块策略：每个文档分割为 500-1000 字的块
3. 向量化模型：使用 OpenAI text-embedding-ada-002 或本地模型
4. 检索策略：Top-K 相似度检索（默认 K=5）
5. RAG 流程：检索 → 重排序 → 生成回答

---

### 4. AI 通用服务 (`/api/v1/ai`)

**文件位置**：`ai-service/app/api/v1/ai.py`

**功能特性**：

- ✅ 健康科普：生成健康知识科普内容
- ✅ 症状分析：分析用户描述的症状
- ✅ 用药咨询：回答用药相关问题
- ✅ 饮食建议：提供饮食指导
- ✅ 运动建议：提供运动指导

**API 端点**：

```
POST /api/v1/ai/education                  # 健康科普
POST /api/v1/ai/symptom-analysis           # 症状分析
POST /api/v1/ai/medication-consultation    # 用药咨询
POST /api/v1/ai/diet-advice                # 饮食建议
POST /api/v1/ai/exercise-advice            # 运动建议
```

**关键服务**：

- `ai_service.py` - AI 通用服务

---

### 5. 健康检查 (`/api/v1/health`)

**文件位置**：`ai-service/app/api/v1/health.py`

**功能特性**：

- ✅ 服务健康检查
- ✅ 依赖服务状态检查（Qdrant、Redis、MongoDB）
- ✅ 服务版本信息

**API 端点**：

```
GET /api/v1/health                         # 健康检查
GET /api/v1/health/dependencies            # 依赖服务状态
```

---

## 核心服务层

### DeepSeek API 集成

**文件**：`ai-service/app/services/deepseek_client.py`

**功能**：

- DeepSeek API 调用封装
- 自动重试机制（最多 3 次）
- 流式响应支持
- 错误处理和日志记录

**配置**：

```python
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1"
MODEL = "deepseek-chat"
```

---

### 向量嵌入服务

**文件**：`ai-service/app/services/embedding_service.py`

**功能**：

- 文本向量化
- 支持批量嵌入
- 缓存机制（避免重复计算）

**模型选择**：

- OpenAI text-embedding-ada-002（推荐）
- 本地模型（sentence-transformers）

---

### 会话管理服务

**文件**：`ai-service/app/services/conversation_service.py`

**功能**：

- 会话创建和管理
- 消息历史存储（MongoDB）
- 上下文窗口管理（最近 10 条消息）
- 会话过期清理

---

### 提示词模板

**文件**：`ai-service/app/services/prompt_templates.py`

**包含模板**：

- 健康咨询提示词
- 症状分析提示词
- 用药咨询提示词
- 诊断建议提示词
- RAG 问答提示词
- 意图识别提示词

**模板示例**：

```python
HEALTH_CONSULTATION_PROMPT = """
你是一位专业的健康顾问，擅长慢病管理和健康咨询。

用户问题：{question}

请提供专业、准确、易懂的健康建议。

重要提示：
1. 所有建议必须包含免责声明："此建议仅供参考，请咨询专业医生"
2. 不要诊断疾病，只提供健康建议
3. 如果涉及严重症状，建议立即就医
"""
```

---

## 数据模型

### Agent 模型

**文件**：`ai-service/app/models/agent_models.py`

**主要模型**：

- `ChatRequest` - 对话请求
- `ChatResponse` - 对话响应
- `CheckinRequest` - 打卡请求
- `CheckinResponse` - 打卡响应
- `SessionInfoResponse` - 会话信息

---

### 诊断模型

**文件**：`ai-service/app/models/diagnosis_models.py`

**主要模型**：

- `HealthSummaryRequest` - 健康摘要请求
- `RiskAssessmentRequest` - 风险评估请求
- `DiagnosticAdviceRequest` - 诊断建议请求
- `MedicationAdviceRequest` - 用药建议请求
- `LifestyleAdviceRequest` - 生活方式建议请求

---

### RAG 模型

**文件**：`ai-service/app/models/rag_models.py`

**主要模型**：

- `IngestDocumentRequest` - 文档导入请求
- `RAGQueryRequest` - RAG 问答请求
- `RAGSearchRequest` - 语义检索请求
- `RAGSearchResult` - 检索结果

---

## 重新实现指南

### 步骤 1：环境准备

1. 确保 Qdrant 服务运行：

   ```bash
   docker-compose up -d qdrant
   ```

2. 配置环境变量：

   ```bash
   DEEPSEEK_API_KEY=your_api_key
   QDRANT_URL=http://localhost:6333
   MONGODB_URL=mongodb://localhost:27017
   REDIS_URL=redis://localhost:6379
   ```

---

### 步骤 2：核心服务实现顺序

**优先级 P0（核心功能）**：

1. DeepSeek API 客户端 (`deepseek_client.py`)
2. 向量嵌入服务 (`embedding_service.py`)
3. Qdrant 服务 (`qdrant_service.py`)
4. RAG 服务 (`rag_service.py`)

**优先级 P1（重要功能）**：5. 会话管理服务 (`conversation_service.py`) 6. 意图识别服务 (`intent_service.py`) 7. Agent 服务 (`agent_service.py`)

**优先级 P2（扩展功能）**：8. 诊断服务 (`diagnosis_service.py`) 9. 打卡解析器 (`checkin_parser.py`)

---

### 步骤 3：API 端点实现顺序

1. 健康检查端点 (`/api/v1/health`)
2. RAG 端点 (`/api/v1/rag`)
3. Agent 端点 (`/api/v1/agent`)
4. 诊断端点 (`/api/v1/diagnosis`)
5. AI 通用端点 (`/api/v1/ai`)

---

### 步骤 4：测试策略

**单元测试**：

- 每个服务独立测试
- Mock 外部依赖（DeepSeek API、Qdrant、MongoDB）
- 测试覆盖率 > 70%

**集成测试**：

- 端到端 API 测试
- 真实环境测试（使用 Docker Compose）

**性能测试**：

- RAG 检索性能（< 500ms）
- 对话响应时间（< 2s）
- 并发测试（100 并发用户）

---

## 关键技术决策

### 1. 为什么使用 DeepSeek？

- ✅ 成本低：相比 GPT-4 便宜 10 倍
- ✅ 中文支持好：专为中文优化
- ✅ 性能稳定：响应时间 < 2s
- ❌ 限制：需要科学上网（可使用代理）

**替代方案**：

- 国内：通义千问、文心一言、智谱 AI
- 国际：GPT-4、Claude、Gemini

---

### 2. 为什么使用 Qdrant？

- ✅ 性能优秀：百万级向量检索 < 100ms
- ✅ 易于部署：Docker 一键启动
- ✅ 功能完整：支持过滤、分页、聚合
- ❌ 限制：内存占用较大（建议 4GB+）

**替代方案**：

- Milvus（更适合大规模）
- Weaviate（更易用）
- Pinecone（云服务）

---

### 3. 为什么使用 MongoDB 存储会话？

- ✅ 灵活的文档结构：适合存储对话历史
- ✅ 查询性能好：支持索引和聚合
- ✅ 易于扩展：支持分片和副本集

**替代方案**：

- PostgreSQL JSONB（如果已有 PG）
- Redis（如果会话数据量小）

---

## 性能优化建议

### 1. RAG 检索优化

- 使用缓存：相同查询直接返回缓存结果
- 预计算向量：提前计算常见问题的向量
- 分批处理：批量导入文档时分批处理

### 2. 对话响应优化

- 流式响应：使用 SSE 实现流式输出
- 异步处理：使用 asyncio 并发处理
- 连接池：复用 HTTP 连接

### 3. 数据库优化

- MongoDB 索引：在 session_id、user_id 上创建索引
- Redis 缓存：缓存热点数据（用户信息、会话信息）
- 连接池：使用连接池管理数据库连接

---

## 安全注意事项

### 1. API 安全

- ✅ JWT 认证：所有 API 需要验证 JWT Token
- ✅ 速率限制：防止 API 滥用（100 req/min）
- ✅ 输入验证：使用 Pydantic 验证所有输入

### 2. 数据安全

- ✅ 敏感数据加密：身份证号、病历等加密存储
- ✅ 审计日志：记录所有敏感操作
- ✅ 数据脱敏：日志中不输出敏感信息

### 3. AI 安全

- ✅ 免责声明：所有 AI 建议包含免责声明
- ✅ 内容过滤：过滤不当内容
- ✅ 输出验证：验证 AI 输出的合理性

---

## 依赖版本

```txt
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
sentence-transformers==2.2.2  # 可选，本地嵌入模型
```

---

## 参考资源

### 官方文档

- [DeepSeek API 文档](https://platform.deepseek.com/docs)
- [Qdrant 文档](https://qdrant.tech/documentation/)
- [FastAPI 文档](https://fastapi.tiangolo.com/)

### 代码示例

- 完整代码：`git checkout archive/stage3-ai-service-2026-01-05`
- 关键文件：
  - `ai-service/app/api/v1/agent.py`
  - `ai-service/app/services/agent_service.py`
  - `ai-service/app/services/diagnosis_service.py`
  - `ai-service/app/services/rag_service.py`

---

## 常见问题

### Q1: 为什么不直接合并 stage3 分支？

**A**: 因为存在 16 个文件冲突，主要原因：

1. master 和 stage3 的架构差异较大
2. 配置文件格式不同
3. 服务初始化方式不同

重新实现可以确保与当前 master 架构一致。

---

### Q2: 重新实现需要多长时间？

**A**: 预估工作量：

- P0 核心功能：3-5 天
- P1 重要功能：2-3 天
- P2 扩展功能：2-3 天
- 测试和优化：2-3 天

**总计**：9-14 天（1 个开发者）

---

### Q3: 可以部分合并吗？

**A**: 可以，建议顺序：

1. 先合并 RAG 功能（最独立）
2. 再合并 Agent 功能
3. 最后合并诊断功能

每个功能单独创建 PR，逐步合并。

---

## 更新日志

- **2026-01-05**: 创建文档，记录 stage3 分支的所有功能
- **待更新**: 实现进度跟踪

---

## 联系方式

如有问题，请查看：

- 备份代码：`git checkout archive/stage3-ai-service-2026-01-05`
- 项目文档：`.claude/specs/chronic-disease-management/`
- 任务清单：`.claude/specs/chronic-disease-management/tasks.md`
