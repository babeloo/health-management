# 后续并行任务启动计划

> **生成时间**: 2025-12-25
> **项目经理**: @pm
> **当前进度**: 29.2% (14/48 模块已完成)
> **项目状态**: 第二阶段 100% 完成,准备启动后续并行任务

---

## 执行摘要

基于当前项目进度和 worktree 环境配置,现制定后续任务的详细执行计划:

**✅ 已完成**:
- 第一阶段(项目基础设施): 100% 完成
- 第二阶段(后端核心服务): 100% 完成,包括任务 4-12 的所有 11 个模块

**🚀 即将启动**:
- 第二组任务: AI 服务开发(任务 13-18)
- 第三组任务: 前端初始化(任务 19 和 28)

**⏱️ 预计总工期**: 从 12 周缩短至 10 周(通过并行加速)

---

## 第二组任务: AI 服务开发(任务 13-18)

### 任务 13: Python FastAPI 项目初始化 🔴 HIGH PRIORITY

**执行时机**: 立即开始
**负责 Agent**: @ai-python
**工作目录**: `intl-health-mgmt-ai` worktree (branch: feature/stage3-ai-service)
**预计工期**: 1 天
**依赖关系**: 无依赖,是任务 14-18 的前置条件

#### 详细任务清单

1. **使用 uv 初始化 Python 项目**
   ```bash
   cd ai-service
   uv init
   ```

2. **创建 requirements.txt**
   ```
   fastapi==0.109.0
   uvicorn[standard]==0.27.0
   python-dotenv==1.0.0
   langchain==0.1.0
   llama-index==0.10.0
   qdrant-client==1.7.0
   httpx==0.26.0
   structlog==24.1.0
   pydantic==2.5.0
   prometheus-client==0.19.0
   ```

3. **配置环境变量管理**
   - 创建 `.env.development`、`.env.production`
   - 关键配置项:
     - `DEEPSEEK_API_KEY`
     - `QDRANT_HOST`、`QDRANT_PORT`
     - `BACKEND_API_URL`
     - `LOG_LEVEL`

4. **配置 CORS 中间件**
   - 允许 NestJS 后端(http://localhost:5000)调用
   - 允许前端开发服务器调用

5. **设置日志配置(structlog)**
   - JSON 格式日志输出
   - 分级日志(DEBUG、INFO、WARNING、ERROR)
   - 日志轮转配置

6. **创建项目结构**
   ```
   ai-service/
   ├── app/
   │   ├── main.py          # FastAPI 应用入口
   │   ├── routers/         # 路由模块
   │   │   ├── __init__.py
   │   │   ├── health.py    # 健康检查
   │   │   ├── chat.py      # AI 对话
   │   │   ├── knowledge.py # 知识库管理
   │   │   └── diagnosis.py # 辅助诊断
   │   ├── services/        # 业务逻辑
   │   │   ├── __init__.py
   │   │   ├── ai_provider.py
   │   │   ├── rag.py
   │   │   └── diagnosis.py
   │   ├── models/          # 数据模型
   │   │   ├── __init__.py
   │   │   ├── chat.py
   │   │   └── diagnosis.py
   │   └── config.py        # 配置管理
   ├── tests/
   │   ├── test_health.py
   │   └── conftest.py
   ├── requirements.txt
   ├── .env.example
   └── README.md
   ```

#### 验收标准(Acceptance Criteria)

- ✅ AC1: FastAPI 应用能够正常启动(uvicorn app.main:app --reload)
- ✅ AC2: 健康检查端点 `GET /health` 返回 200 状态码
- ✅ AC3: CORS 配置允许 NestJS 后端调用(http://localhost:5000)
- ✅ AC4: 日志正常输出到控制台和文件
- ✅ AC5: 环境变量能够正确加载(.env.development)
- ✅ AC6: 单元测试框架配置完成(pytest)
- ✅ AC7: 代码质量工具配置完成(black、flake8、mypy)

#### 测试验收标准(Test AC)

```bash
# 1. 启动服务测试
cd ai-service
uv run uvicorn app.main:app --reload
# 预期: 服务启动成功,监听 http://localhost:8001

# 2. 健康检查测试
curl http://localhost:8001/health
# 预期: {"status":"ok","service":"ai-service"}

# 3. 代码质量检查
black --check .
flake8 .
mypy .
# 预期: 全部通过,无错误

# 4. 单元测试
pytest tests/ -v
# 预期: 所有测试通过
```

#### 关联需求

- 需求 #1(外部 AI API 集成)
- 需求 #5(患者端 - AI 健康科普)

#### Worktree 切换指南

```bash
# 切换到 AI 服务 worktree
cd D:\Code\ai-gen\intl-health-mgmt-parallel\intl-health-mgmt-ai

# 确认当前分支
git branch
# 应该显示: * feature/stage3-ai-service

# 拉取最新 master 分支更新
git fetch origin master:master
git merge master
# 解决冲突后提交

# 开始开发
cd ai-service
# ... 进行开发工作 ...

# 提交更改
git add .
git commit -m "feat: 初始化 Python FastAPI 项目 (#13)"

# 推送到远程
git push origin feature/stage3-ai-service
```

---

### 任务 14: DeepSeek API 集成 🔴 HIGH PRIORITY

**执行时机**: 任务 13 完成后立即开始
**负责 Agent**: @ai-python
**工作目录**: `intl-health-mgmt-ai` worktree
**预计工期**: 2 天
**依赖关系**: 依赖任务 13(FastAPI 项目初始化)

#### 详细任务清单

1. **实现 AI Provider 抽象层**
   - 创建 `AIProvider` 接口类(参考 design.md 3.2.1)
   - 定义标准方法:
     - `chat(messages, model, temperature, max_tokens)`
     - `embeddings(text, model)`
     - `healthAdvice(patient_data, context)`

2. **实现 DeepSeekProvider 类**
   - 继承 `AIProvider` 接口
   - 实现 `chat` 方法(调用 DeepSeek chat/completions API)
   - 实现 `embeddings` 方法(调用 DeepSeek embeddings API)
   - 实现 `healthAdvice` 方法(健康建议生成)
   - API 端点: `https://api.deepseek.com/v1/chat/completions`

3. **实现重试和熔断机制**
   - 创建 `RetryDecorator`(最多重试 3 次,指数退避)
   - 创建 `CircuitBreaker` 类(失败阈值 5 次,熔断 60 秒)
   - 在所有 AI 调用中应用重试和熔断

4. **实现 AI 调用监控**
   - 创建 Prometheus 指标:
     - `ai_calls_total{model, status}` - 调用次数计数
     - `ai_call_duration_seconds{model}` - 调用耗时直方图
     - `ai_tokens_used{model, type}` - Token 使用量
   - 记录每次 AI 调用的耗时和 Token 使用量

5. **创建 API 路由**
   - `POST /api/v1/ai/chat` - AI 对话接口
   - `POST /api/v1/ai/embeddings` - 文本向量化接口
   - `POST /api/v1/ai/health-advice` - 健康建议接口

#### 验收标准(Acceptance Criteria)

- ✅ AC1: DeepSeek API 调用成功,返回正确响应
- ✅ AC2: 重试机制在临时故障时自动重试(最多 3 次)
- ✅ AC3: 熔断器在连续失败 5 次后开启熔断,60 秒后半开状态
- ✅ AC4: Prometheus 指标端点 `GET /metrics` 返回正确数据
- ✅ AC5: AI 调用耗时记录准确(误差 < 10ms)
- ✅ AC6: Token 使用量统计准确
- ✅ AC7: 错误日志包含详细的错误信息和上下文

#### 测试验收标准(Test AC)

```bash
# 1. 单元测试(使用 Mock)
pytest tests/test_deepseek_provider.py -v
# 预期: 所有测试通过,覆盖率 > 80%

# 2. 集成测试(真实 DeepSeek API 调用,需要 API Key)
export DEEPSEEK_API_KEY="your_api_key"
pytest tests/integration/test_deepseek_integration.py -v
# 预期: 调用成功,返回有效响应

# 3. 重试机制测试
pytest tests/test_retry_decorator.py -v
# 预期: 模拟失败场景,验证重试 3 次

# 4. 熔断器测试
pytest tests/test_circuit_breaker.py -v
# 预期: 连续失败 5 次后熔断,60 秒后恢复

# 5. 性能测试
curl -X POST http://localhost:8001/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"什么是糖尿病?"}]}'
# 预期: 响应时间 < 5 秒(DeepSeek API 通常 2-3 秒)

# 6. Prometheus 指标测试
curl http://localhost:8001/metrics
# 预期: 包含 ai_calls_total、ai_call_duration_seconds、ai_tokens_used 指标
```

#### 关联需求

- 需求 #1(外部 AI API 集成)
- 需求 #5(患者端 - AI 健康科普)

---

### 任务 15: RAG 知识库实现 🔴 HIGH PRIORITY

**执行时机**: 任务 13、14 完成后开始
**负责 Agent**: @ai-python + @data-infra(Qdrant 集成部分)
**工作目录**: `intl-health-mgmt-ai` worktree
**预计工期**: 2 天
**依赖关系**: 依赖任务 13(FastAPI 项目)、任务 14(DeepSeek API)

#### 并行策略

- **Day 1**: @data-infra 配置 Qdrant,@ai-python 实现文档处理逻辑
- **Day 2**: @ai-python 集成 Qdrant 完成 RAG 检索增强生成

#### 详细任务清单

**@data-infra 负责部分**:

1. **在 docker-compose.yml 中添加 Qdrant 服务**
   ```yaml
   qdrant:
     image: qdrant/qdrant:v1.7.0
     container_name: qdrant
     ports:
       - "6333:6333"
       - "6334:6334"
     volumes:
       - qdrant_data:/qdrant/storage
     environment:
       - QDRANT_API_KEY=${QDRANT_API_KEY}
   ```

2. **创建 QdrantService**
   - 安装 `qdrant-client`
   - 实现创建集合方法 `create_collection("health_knowledge")`
   - 实现添加文档方法 `add_document(doc_id, embedding, payload)`
   - 实现向量检索方法 `search(query_embedding, limit=5)`

**@ai-python 负责部分**:

1. **实现知识库管理**
   - 创建 `HealthKnowledgeBase` 类(参考 design.md 3.2.2)
   - 实现文档分块(chunk)和向量化
     - 文档分块策略: 512 字符,重叠 50 字符
     - 向量化模型: DeepSeek Embeddings API
   - 实现批量导入科普文档(从 JSON/Markdown 文件)

2. **实现 RAG 检索增强生成**
   - 创建 `HealthEducationService` 类
   - 实现 `answerQuestion` 方法(检索 + 生成)
     - 步骤 1: 将问题向量化
     - 步骤 2: 在 Qdrant 中检索相关文档(Top 5)
     - 步骤 3: 将检索结果作为上下文传递给 DeepSeek
     - 步骤 4: 生成回答
   - 实现提示词模板(包含知识库上下文)
   - 添加免责声明("此建议仅供参考,请咨询专业医生")

3. **创建科普文档管理接口**
   - `POST /api/v1/ai/knowledge` - 上传科普文档
   - `GET /api/v1/ai/knowledge` - 查询知识库
   - `POST /api/v1/ai/knowledge/batch` - 批量导入

#### 验收标准(Acceptance Criteria)

- ✅ AC1: Qdrant 集合创建成功(health_knowledge)
- ✅ AC2: 文档向量化准确(使用 DeepSeek Embeddings API)
- ✅ AC3: 批量导入 10+ 篇科普文档成功
- ✅ AC4: RAG 检索返回相关文档(Top 5)
- ✅ AC5: 生成的回答包含知识库上下文
- ✅ AC6: 所有 AI 输出包含免责声明
- ✅ AC7: 查询响应时间 < 3 秒(检索 + 生成)

#### 测试验收标准(Test AC)

```bash
# 1. Qdrant 服务健康检查
curl http://localhost:6333/healthz
# 预期: {"status":"ok"}

# 2. 创建知识库集合
curl -X POST http://localhost:8001/api/v1/ai/knowledge/init
# 预期: {"status":"success","collection":"health_knowledge"}

# 3. 上传科普文档
curl -X POST http://localhost:8001/api/v1/ai/knowledge \
  -H "Content-Type: application/json" \
  -d '{"title":"糖尿病基础知识","content":"糖尿病是一种慢性疾病..."}'
# 预期: {"status":"success","doc_id":"xxx"}

# 4. RAG 问答测试
curl -X POST http://localhost:8001/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"糖尿病患者应该注意什么?"}]}'
# 预期: 返回包含知识库上下文的回答,并附带免责声明

# 5. 单元测试
pytest tests/test_rag.py -v
# 预期: 文档分块、向量化、检索测试全部通过

# 6. 集成测试
pytest tests/integration/test_rag_integration.py -v
# 预期: Qdrant 数据写入和查询测试通过

# 7. 性能测试
pytest tests/performance/test_rag_performance.py -v
# 预期: 查询响应时间 < 3 秒
```

#### 准备测试数据

创建 10+ 篇医疗科普文章(Markdown 格式),包含:
- 糖尿病管理指南
- 高血压饮食建议
- 卒中风险预防
- 慢性病用药安全
- 健康生活方式

#### 关联需求

- 需求 #5(患者端 - AI 健康科普)

---

### 任务 16: AI Agent 对话管理 🔴 HIGH PRIORITY

**执行时机**: 任务 14、15 完成后开始
**负责 Agent**: @ai-python
**工作目录**: `intl-health-mgmt-ai` worktree
**预计工期**: 2 天
**依赖关系**: 依赖任务 14(DeepSeek API)、任务 15(RAG 知识库)

#### 详细任务清单

1. **实现对话状态管理**
   - 连接 MongoDB(motor 异步客户端)
   - 定义对话历史 Schema(参考 design.md 4.1.9)
     - `conversation_id`, `user_id`, `messages`, `created_at`, `updated_at`
   - 实现对话上下文缓存(Redis,30 分钟过期)

2. **实现 AI Agent 核心逻辑**
   - 创建 `AIAgentController` 类(参考 design.md 3.2.3)
   - 实现 `handleMessage` 方法(处理用户消息)
   - 实现 `detectIntent` 方法(意图识别)
     - 支持意图: 打卡、症状咨询、用药咨询、科普问答
   - 实现 `handleCheckIn` 方法(协助打卡)
     - 从对话中提取血压、血糖等数据
     - 调用 NestJS 后端打卡 API
   - 实现 `handleSymptomReport` 方法(症状报告)
     - 提供初步建议
     - 推荐联系健康管理师或医生

3. **实现 AI Agent 接口**
   - `POST /api/v1/ai/chat` - 对话接口
   - `GET /api/v1/ai/conversations/:userId` - 对话历史接口
   - `POST /api/v1/ai/health-advice` - 健康建议接口

#### 验收标准(Acceptance Criteria)

- ✅ AC1: AI Agent 能够理解自然语言打卡指令("我今天血压 120/80")
- ✅ AC2: AI Agent 能够从对话中提取健康数据(血压、血糖等)
- ✅ AC3: AI Agent 能够识别 4 种意图(打卡、症状、用药、科普)
- ✅ AC4: 对话历史保存到 MongoDB,包含完整上下文
- ✅ AC5: 对话上下文缓存到 Redis,30 分钟过期
- ✅ AC6: AI Agent 主动提醒用户打卡(连续 3 天未打卡)
- ✅ AC7: 症状咨询返回建议并推荐联系医生

#### 测试验收标准(Test AC)

```bash
# 1. 意图识别测试
pytest tests/test_intent_detection.py -v
# 预期: 4 种意图识别准确率 > 90%

# 2. 对话状态管理测试
pytest tests/test_conversation_state.py -v
# 预期: 对话历史保存和加载正确

# 3. 自然语言打卡测试
curl -X POST http://localhost:8001/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"user_id":"123","message":"我今天血压120/80,脉搏72"}'
# 预期: 返回确认信息,并调用后端打卡 API

# 4. 集成测试
pytest tests/integration/test_ai_agent_integration.py -v
# 预期: 完整对话流程测试通过

# 5. E2E 测试
pytest tests/e2e/test_ai_agent_checkin.py -v
# 预期: 用户通过 AI Agent 完成打卡,积分增加
```

#### 关联需求

- 需求 #6(患者端 - AI Agent 主动健康管理)

---

### 任务 17: AI 辅助诊断 🔴 HIGH PRIORITY

**执行时机**: 任务 14、15 完成后开始(可与任务 16 并行)
**负责 Agent**: @ai-python
**工作目录**: `intl-health-mgmt-ai` worktree
**预计工期**: 2 天
**依赖关系**: 依赖任务 14(DeepSeek API)、任务 15(RAG 知识库)

#### 详细任务清单

1. **实现健康状况分析**
   - 创建 `DiagnosisService`
   - 实现 `analyzePatientData` 方法
     - 输入: 患者健康档案、打卡记录、风险评估结果
     - 输出: 健康状况摘要、异常指标、趋势分析
   - 实现 `generateHealthSummary` 方法
     - 生成结构化健康摘要(JSON 格式)
   - 实现 `generateDiagnosisAdvice` 方法
     - 基于分析结果生成诊断建议

2. **实现风险预测**
   - 创建 `RiskPredictionService`
   - 实现 `predictRisk` 方法
     - 预测未来 30 天疾病风险(糖尿病、卒中)
   - 实现 `analyzeTrends` 方法
     - 分析血压、血糖趋势(上升、下降、稳定)
   - 集成 InfluxDB 时序数据(通过 NestJS API 调用)

3. **实现 AI 辅助诊断接口**
   - `POST /api/v1/ai/diagnosis-assist` - AI 辅助诊断接口
   - `POST /api/v1/ai/risk-prediction` - 风险预测接口

#### 验收标准(Acceptance Criteria)

- ✅ AC1: 健康状况摘要准确反映患者当前状态
- ✅ AC2: 异常指标识别准确率 > 85%
- ✅ AC3: 趋势分析包含上升、下降、稳定判断
- ✅ AC4: 风险预测返回风险等级(低、中、高)
- ✅ AC5: 诊断建议包含具体的健康改善措施
- ✅ AC6: 集成 InfluxDB 时序数据查询
- ✅ AC7: 所有诊断建议附带免责声明

#### 测试验收标准(Test AC)

```bash
# 1. 单元测试
pytest tests/test_diagnosis_service.py -v
# 预期: 数据分析算法测试通过

# 2. 集成测试
pytest tests/integration/test_diagnosis_integration.py -v
# 预期: 诊断建议生成测试通过

# 3. API 测试
curl -X POST http://localhost:8001/api/v1/ai/diagnosis-assist \
  -H "Content-Type: application/json" \
  -d '{"patient_id":"123"}'
# 预期: 返回健康状况摘要和诊断建议

# 4. 风险预测测试
curl -X POST http://localhost:8001/api/v1/ai/risk-prediction \
  -H "Content-Type: application/json" \
  -d '{"patient_id":"123","risk_type":"diabetes"}'
# 预期: 返回风险等级和预测依据
```

#### 准备测试数据

创建模拟患者健康档案:
- 患者 A: 糖尿病高风险,血糖波动大
- 患者 B: 高血压稳定控制,低风险
- 患者 C: 卒中高风险,血压持续偏高

#### 关联需求

- 需求 #9(医生端 - AI 辅助诊断)
- 需求 #12(健康管理师端 - AI 健康干预助手)
- 需求 #17(智能预测与早期预警)

---

### 任务 18: AI 服务监控与优化 🟡 MEDIUM PRIORITY

**执行时机**: 任务 14-17 完成后
**负责 Agent**: @ai-python
**工作目录**: `intl-health-mgmt-ai` worktree
**预计工期**: 1 天
**依赖关系**: 依赖任务 14-17(所有 AI 功能)

#### 详细任务清单

1. **实现性能监控**
   - 安装 `prometheus-client`
   - 创建 `/metrics` 端点
   - 记录 API 响应时间、错误率
   - 记录 DeepSeek API Token 使用量
   - 记录 Qdrant 查询性能

2. **实现缓存优化**
   - 集成 Redis 缓存
   - 缓存常见问题的 AI 回答(1 小时过期)
   - 缓存向量检索结果(30 分钟过期)
   - 缓存对话上下文(30 分钟过期)

3. **编写性能测试**
   - 负载测试: 并发 AI 对话(100 并发)
   - 性能测试: RAG 检索响应时间(目标 < 3 秒)
   - 压力测试: DeepSeek API 限流处理

#### 验收标准(Acceptance Criteria)

- ✅ AC1: Prometheus `/metrics` 端点返回正确指标
- ✅ AC2: API 响应时间 P95 < 5 秒
- ✅ AC3: 常见问题命中缓存,响应时间 < 500ms
- ✅ AC4: 向量检索结果缓存命中率 > 50%
- ✅ AC5: 负载测试通过(100 并发,无错误)
- ✅ AC6: DeepSeek API 限流时自动降级
- ✅ AC7: 错误率 < 1%

#### 测试验收标准(Test AC)

```bash
# 1. Prometheus 指标测试
curl http://localhost:8001/metrics
# 预期: 包含完整的性能指标

# 2. 负载测试
locust -f tests/load_test.py --host=http://localhost:8001
# 预期: 100 并发,无错误

# 3. 性能测试
pytest tests/performance/test_rag_performance.py -v
# 预期: RAG 检索响应时间 < 3 秒

# 4. 压力测试
pytest tests/stress/test_deepseek_rate_limit.py -v
# 预期: 限流时自动降级,不崩溃
```

#### 关联需求

- 需求 #1(外部 AI API 集成)

---

## 第三组任务: 前端初始化(任务 19 和 28)

### 任务 19: Uni-app 项目初始化 🔴 HIGH PRIORITY

**执行时机**: 第二阶段完成后立即开始(与 AI 服务并行)
**负责 Agent**: @mobile
**工作目录**: `intl-health-mgmt-patient` worktree (branch: feature/stage4-patient-app)
**预计工期**: 1 天
**依赖关系**: 无依赖,完全独立

#### 详细任务清单

1. **使用 HBuilderX 创建 Vue 3 项目**
   - 选择 Vue 3 + TypeScript 模板
   - 配置编译目标(微信小程序 + H5)

2. **安装 UI 框架**
   - 安装 `uni-ui` 或 `uView` UI 框架
   - 配置全局样式和主题色

3. **配置 Pinia 状态管理**
   - 安装 `pinia`
   - 创建 stores(userStore、healthStore、pointsStore)

4. **配置 API 请求封装**
   - 封装 `uni.request` 拦截器
   - 添加 JWT Token 自动附加
   - 添加统一错误处理

5. **创建基础组件**
   - 创建底部导航栏组件(TabBar)
   - 创建页面加载组件(Loading)
   - 创建空状态组件(Empty)
   - 创建弹窗组件(Modal)

6. **配置开发环境**
   - 设置环境变量(开发/生产 API 地址)
   - 配置微信小程序开发者工具
   - 配置代码格式化(Prettier + ESLint)

#### 验收标准(Acceptance Criteria)

- ✅ AC1: Uni-app 项目能够正常启动并编译为微信小程序
- ✅ AC2: H5 版本能够在浏览器中正常运行
- ✅ AC3: API 请求封装能够自动附加 JWT Token
- ✅ AC4: 底部导航栏显示正常(首页、健康、积分、我的)
- ✅ AC5: Pinia stores 能够正常读写状态
- ✅ AC6: 代码格式化工具配置完成(Prettier + ESLint)
- ✅ AC7: 环境变量能够根据编译目标自动切换

#### 测试验收标准(Test AC)

```bash
# 1. 微信小程序编译测试
npm run dev:mp-weixin
# 预期: 编译成功,在微信开发者工具中打开

# 2. H5 编译测试
npm run dev:h5
# 预期: 编译成功,浏览器打开 http://localhost:5173

# 3. API 请求测试
# 在 App.vue 中测试 API 调用
uni.request({
  url: '/api/v1/health/check',
  method: 'GET'
})
# 预期: 自动附加 Authorization header

# 4. 状态管理测试
# 在组件中测试 Pinia store
const userStore = useUserStore()
userStore.setUser({id: 1, name: 'test'})
console.log(userStore.user)
# 预期: 状态正常读写

# 5. 代码格式化测试
npm run lint
npm run format
# 预期: 无错误,代码格式正确
```

#### Worktree 切换指南

```bash
# 切换到患者端 worktree
cd D:\Code\ai-gen\intl-health-mgmt-parallel\intl-health-mgmt-patient

# 确认当前分支
git branch
# 应该显示: * feature/stage4-patient-app

# 拉取最新 master 分支更新
git fetch origin master:master
git merge master

# 开始开发
cd frontend-patient
# ... 进行开发工作 ...

# 提交更改
git add .
git commit -m "feat: 初始化 Uni-app 患者端项目 (#19)"

# 推送到远程
git push origin feature/stage4-patient-app
```

#### 关联需求

- 需求 #19(多端响应式设计)

---

### 任务 28: React 项目初始化 🔴 HIGH PRIORITY

**执行时机**: 第二阶段完成后立即开始(与 AI 服务和患者端并行)
**负责 Agent**: @backend-ts
**工作目录**: `intl-health-mgmt-admin` worktree (branch: feature/stage5-admin-web)
**预计工期**: 1 天
**依赖关系**: 无依赖,完全独立

#### 详细任务清单

1. **使用 Vite 创建 React + TypeScript 项目**
   ```bash
   npm create vite@latest frontend-web -- --template react-ts
   ```

2. **安装 Ant Design Pro 框架**
   - 安装 `antd`
   - 安装 `@ant-design/pro-components`
   - 配置主题色和全局样式

3. **配置路由(React Router v6)**
   - 安装 `react-router-dom`
   - 创建路由配置文件
   - 实现路由懒加载

4. **配置 Zustand 状态管理**
   - 安装 `zustand`
   - 创建 stores(userStore、patientStore、analyticsStore)

5. **配置 API 请求封装(Axios + 拦截器)**
   - 安装 `axios`
   - 配置请求拦截器(自动附加 JWT Token)
   - 配置响应拦截器(统一错误处理)

6. **实现基础布局**
   - 创建主布局组件(Header + Sidebar + Content)
   - 创建侧边栏菜单(患者管理、数据分析、消息、设置)
   - 创建面包屑导航

7. **实现认证路由守卫**
   - 创建 ProtectedRoute 组件
   - 检查 Token 有效性
   - 未登录自动跳转登录页

8. **配置开发环境**
   - 设置环境变量(.env.development、.env.production)
   - 配置代理(解决开发环境跨域)
   - 配置 ESLint 和 Prettier

#### 验收标准(Acceptance Criteria)

- ✅ AC1: React 项目能够正常启动(npm run dev)
- ✅ AC2: Ant Design Pro 组件能够正常使用
- ✅ AC3: 路由懒加载配置正确,代码分割生效
- ✅ AC4: Zustand stores 能够正常读写状态
- ✅ AC5: Axios 拦截器能够自动附加 JWT Token
- ✅ AC6: 主布局显示正常(Header + Sidebar + Content)
- ✅ AC7: 认证路由守卫能够拦截未登录用户
- ✅ AC8: 开发环境代理配置正确,跨域问题解决

#### 测试验收标准(Test AC)

```bash
# 1. 启动开发服务器
npm run dev
# 预期: 服务启动成功,浏览器打开 http://localhost:5173

# 2. 构建生产版本
npm run build
# 预期: 构建成功,生成 dist 目录

# 3. 预览构建结果
npm run preview
# 预期: 预览服务启动成功

# 4. API 请求测试
# 在组件中测试 Axios 调用
axios.get('/api/v1/users/me')
# 预期: 自动附加 Authorization header

# 5. 路由测试
# 访问受保护路由(未登录)
访问 http://localhost:5173/dashboard
# 预期: 自动跳转到登录页

# 6. 代码质量检查
npm run lint
npm run type-check
# 预期: 无错误,TypeScript 类型正确
```

#### Worktree 切换指南

```bash
# 切换到医生/管理端 worktree
cd D:\Code\ai-gen\intl-health-mgmt-parallel\intl-health-mgmt-admin

# 确认当前分支
git branch
# 应该显示: * feature/stage5-admin-web

# 拉取最新 master 分支更新
git fetch origin master:master
git merge master

# 开始开发
cd frontend-web
# ... 进行开发工作 ...

# 提交更改
git add .
git commit -m "feat: 初始化 React 医生/管理端项目 (#28)"

# 推送到远程
git push origin feature/stage5-admin-web
```

#### 关联需求

- 需求 #19(多端响应式设计)

---

## 并行开发协调机制

### 1. 任务执行时间线

```
Week 1 (2025-12-25 ~ 2025-12-31):
  Day 1: 任务 13 (@ai-python) || 任务 19 (@mobile) || 任务 28 (@backend-ts)
  Day 2-3: 任务 14 (@ai-python) || Qdrant 集成 (@data-infra) || 任务 19 (@mobile) || 任务 28 (@backend-ts)
  Day 4-5: 任务 15 (@ai-python) || 任务 20-21 (@mobile) || 任务 29 (@backend-ts)

Week 2 (2026-01-01 ~ 2026-01-07):
  Day 1-2: 任务 16 (@ai-python) || 任务 17 (@ai-python 或另一个 AI 工程师) || 任务 22 (@mobile) || 任务 30 (@backend-ts)
  Day 3-4: 任务 18 (@ai-python) || 任务 23 (@mobile) || 任务 31 (@backend-ts)
  Day 5: 集成测试和问题修复

Week 3-4: 继续前端开发和 IoT 集成(详见 tasks.md)
```

### 2. 每日同步机制

**每日站会(Daily Standup)** - 每天上午 9:30,15 分钟
- 参与者: @pm, @architect, @ai-python, @mobile, @backend-ts, @data-infra
- 内容:
  1. 昨天完成了什么任务?
  2. 今天计划做什么?
  3. 遇到什么阻碍?
  4. 需要其他 agents 协助吗?

### 3. 代码同步策略

**Master 分支同步规则**:
- 每个 worktree 每天至少同步一次 master 分支更新
- 命令:
  ```bash
  git fetch origin master:master
  git merge master
  # 解决冲突后提交
  ```

**冲突解决优先级**:
1. 后端 API 契约变更: 优先级最高,立即通知前端 agents
2. 数据库 Schema 变更: 需要 @architect 审查
3. 环境配置变更: 需要更新所有 worktrees 的 `.env.example`

### 4. API 契约管理

**Swagger 文档锁定**:
- 在前端开发前,由 @architect 审查并锁定后端 API 契约
- 所有 API 变更必须先更新 Swagger 文档,再实现代码
- 前端使用 Swagger 生成的 TypeScript 类型定义

**Mock 服务器**:
- 前端使用 MSW (Mock Service Worker) 进行开发
- Mock 数据基于 Swagger 定义
- 降低对后端的依赖

### 5. 集成测试策略

**每周集成测试**:
- 时间: 每周五下午 3:00
- 参与者: @pm, @architect, 所有开发 agents
- 内容:
  1. 运行所有单元测试
  2. 运行所有集成测试
  3. 运行 E2E 测试
  4. 记录测试失败原因
  5. 分配修复任务

### 6. 文档同步

**文档更新规则**:
- 每次任务完成后,立即更新 `tasks.md`
- 每次代码改动合并后,立即更新 `CHANGELOG.md`
- 每次 API 变更后,立即更新 Swagger 文档
- 每周五生成周报(`docs/reports/weekly/YYYY-Wnn.md`)

---

## 风险预警和应对措施

### 风险 1: AI 服务开发延期 🔴 HIGH RISK

**描述**: DeepSeek API 集成遇到问题,导致 AI 服务开发延期

**影响范围**:
- 任务 14-18 延期
- 患者端任务 24(AI 健康科普)无法开始
- 医生端任务 30(AI 辅助诊断)无法开始

**应对措施**:
1. **立即启动备选方案**: 使用 OpenAI API 作为备选
2. **前端优先开发非 AI 功能**: 任务 20-23、25-26 先行
3. **使用 Mock AI 响应**: 前端使用 Mock 数据进行开发
4. **调整时间线**: AI 功能延后至 Week 4-5 完成

**责任人**: @pm + @ai-python

---

### 风险 2: 前端并行开发冲突 🟡 MEDIUM RISK

**描述**: 患者端和医生端同时开发,可能出现组件库或样式冲突

**影响范围**:
- 任务 19-27(患者端)
- 任务 28-35(医生端)

**应对措施**:
1. **统一组件库**: 创建共享组件库(`shared-components`)
2. **样式命名约定**: 使用 BEM 命名规范,避免 CSS 冲突
3. **代码审查**: @architect 审查所有前端组件
4. **定期同步**: 前端 agents 每周三同步一次代码

**责任人**: @pm + @architect

---

### 风险 3: 后端 API 变更影响前端 🟡 MEDIUM RISK

**描述**: 后端 API 在前端开发过程中发生变更,导致前端需要重新适配

**影响范围**:
- 所有前端任务(任务 19-35)

**应对措施**:
1. **API 契约锁定**: 前端开发前,@architect 审查并锁定 API 契约
2. **Swagger 文档版本控制**: 使用 Swagger 版本号,前端锁定特定版本
3. **前端 Mock 数据**: 前端使用 MSW Mock 数据,降低对后端依赖
4. **变更通知机制**: 后端 API 变更必须提前 1 天通知前端 agents

**责任人**: @architect + @backend-ts

---

### 风险 4: Worktree 同步冲突 🟢 LOW RISK

**描述**: 多个 worktrees 同时修改相同文件,导致 Git 冲突

**影响范围**:
- 所有 worktrees

**应对措施**:
1. **每日同步**: 每个 worktree 每天至少同步一次 master 分支
2. **冲突预防**: 避免修改共享文件(如 `package.json`、`docker-compose.yml`)
3. **冲突解决**: 遇到冲突立即通知 @pm,优先解决
4. **代码审查**: 合并前由 @architect 审查,确保无冲突

**责任人**: @pm + 所有开发 agents

---

### 风险 5: 测试覆盖率不足 🟡 MEDIUM RISK

**描述**: 并行开发导致测试覆盖率下降,集成测试失败率高

**影响范围**:
- 所有开发任务

**应对措施**:
1. **强制测试要求**: 每个任务必须达到 70% 测试覆盖率才能合并
2. **CI 自动检查**: GitHub Actions 自动运行测试,未通过不允许合并
3. **每周集成测试**: 每周五进行全量集成测试
4. **测试驱动开发(TDD)**: 鼓励先写测试再写代码

**责任人**: @pm + 所有开发 agents

---

## 任务完成验收流程

### 1. 自检清单(Agent 自行完成)

在标记任务为完成前,负责 agent 必须完成以下检查:

- [ ] 所有验收标准(AC)已满足
- [ ] 测试验收标准(Test AC)已执行并通过
- [ ] 单元测试覆盖率 ≥ 70%
- [ ] 集成测试通过(如有)
- [ ] 代码质量检查通过(ESLint/Flake8)
- [ ] TypeScript 类型检查通过(如适用)
- [ ] Prettier 格式化完成
- [ ] 代码已提交到对应 worktree 的 feature 分支
- [ ] CHANGELOG.md 已更新
- [ ] 相关文档已更新(README、API 文档等)

### 2. @pm 验收流程

1. **接收验收申请**: Agent 通知 @pm 任务已完成
2. **检查任务状态**: 查看 tasks.md,确认所有子任务已完成
3. **检查 CHANGELOG**: 确认变更已记录
4. **运行验收测试**: 执行测试验收标准(Test AC)
5. **对照需求文档**: 对照 `requirements.md` 逐项检查 AC
6. **代码审查**: 调用 @architect 进行代码审查(如需要)
7. **批准或退回**:
   - ✅ 通过: 更新 tasks.md 状态为 `[x]`,合并到 master
   - ❌ 退回: 记录问题,分配回 agent 修改

### 3. 合并到 Master 流程

```bash
# 1. 切换到 master worktree
cd D:\Code\ai-gen\intl-health-mgmt-parallel\intl-health-mgmt

# 2. 拉取 feature 分支更改
git fetch origin feature/stage3-ai-service

# 3. 合并到 master
git merge origin/feature/stage3-ai-service

# 4. 运行全量测试
npm run test:all

# 5. 推送到远程
git push origin master

# 6. 通知所有 agents 同步 master
# 发送通知: "任务 13 已合并到 master,请所有 worktrees 同步"
```

### 4. 任务阻塞处理

**任务阻塞标注格式**:
```markdown
- [!] 任务 14: DeepSeek API 集成 ⚠️ 阻塞中
  - 阻塞原因: DeepSeek API 返回 429 Too Many Requests 错误
  - 影响范围: 任务 15-18 无法开始
  - 预期解决时间: 2025-12-26
  - 临时措施: 使用 OpenAI API 作为备选
```

**阻塞预警机制**:
- 阻塞时长 < 1 天: 标注并尝试技术解决
- 阻塞时长 1-2 天: 向用户发送黄色预警 🟡
- 阻塞时长 > 2 天: 向用户发送红色预警 🔴,提出替代方案

---

## 里程碑和交付物

### Week 1 里程碑: AI 服务基础完成 + 前端项目初始化

**交付物**:
1. Python FastAPI 项目框架(任务 13)
2. DeepSeek API 集成完成(任务 14)
3. RAG 知识库实现完成(任务 15)
4. Uni-app 患者端项目初始化(任务 19)
5. React 医生/管理端项目初始化(任务 28)

**验收标准**:
- ✅ AI 服务能够正常启动并响应 API 请求
- ✅ RAG 问答功能正常工作
- ✅ 患者端微信小程序能够正常运行
- ✅ 医生端 Web 应用能够正常运行

---

### Week 2 里程碑: AI 服务完成 + 前端核心功能开发

**交付物**:
1. AI Agent 对话管理完成(任务 16)
2. AI 辅助诊断完成(任务 17)
3. AI 服务监控与优化完成(任务 18)
4. 患者端认证与个人中心(任务 20)
5. 患者端健康档案(任务 21)
6. 医生端患者管理(任务 29)

**验收标准**:
- ✅ AI Agent 能够协助用户完成打卡
- ✅ AI 辅助诊断返回准确的健康分析
- ✅ 患者端能够完成登录和健康档案管理
- ✅ 医生端能够查看患者列表和详情

---

## 总结

本计划详细定义了第二组任务(AI 服务开发,任务 13-18)和第三组任务(前端初始化,任务 19 和 28)的执行细节,包括:

1. **详细的任务清单**: 每个任务的具体步骤和技术实现
2. **明确的验收标准**: 基于 `requirements.md` 的 AC 定义
3. **具体的测试验收标准**: 可执行的测试命令和预期结果
4. **Worktree 切换指南**: 清晰的 Git 操作流程
5. **并行开发协调机制**: 每日同步、API 契约管理、集成测试策略
6. **风险预警和应对措施**: 5 个关键风险及应对方案
7. **任务完成验收流程**: 从自检到合并 master 的完整流程

**下一步行动**:
1. **立即启动任务 13**: @ai-python 开始 Python FastAPI 项目初始化
2. **立即启动任务 19**: @mobile 开始 Uni-app 项目初始化
3. **立即启动任务 28**: @backend-ts 开始 React 项目初始化
4. **每日站会**: 从明天(2025-12-26)开始,每天上午 9:30
5. **周五集成测试**: 2025-12-27 下午 3:00 第一次集成测试

**预期成果**:
- Week 1 结束时,AI 服务基础完成,前端项目初始化完成
- Week 2 结束时,AI 服务全部完成,前端核心功能开发完成
- 总工期从 12 周缩短至 10 周,节省 2 周时间

---

**报告生成**: @pm
**审核**: @architect (待审核)
**批准**: 用户(待批准)
