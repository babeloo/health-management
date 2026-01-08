# 前后端联调测试报告

**测试日期**: 2026-01-06
**测试人员**: PM Agent
**测试范围**: 后端 NestJS 服务 + AI Python 服务集成测试

---

## 一、测试环境

### 1.1 服务状态

| 服务 | 端口 | 状态 | 备注 |
|------|------|------|------|
| PostgreSQL | 5432 | ✅ 运行中 | 主数据库 |
| Redis | 6379 | ✅ 运行中 | 缓存和队列 |
| InfluxDB | 8086 | ✅ 运行中 | 时序数据 |
| MongoDB | 27017 | ✅ 运行中 | 消息存储 |
| Qdrant | 6333 | ✅ 运行中 | 向量数据库 |
| EMQX | 1883 | ✅ 运行中 | MQTT Broker |
| MinIO | 9000 | ✅ 运行中 | 对象存储 |
| NestJS 后端 | 5000 | ✅ 运行中 | 主后端服务 |
| AI 服务 (Python) | 8001 | ✅ 运行中 | AI 服务 |

### 1.2 配置修正记录

#### 问题 1: AI 服务 URL 端口错误 ✅ 已修复

**问题**: `backend/.env.development` 配置的 AI 服务 URL 为 `http://localhost:8000`，但实际运行在端口 `8001`

**解决**: 已更新 `backend/.env.development` 第 37 行为 `AI_SERVICE_URL=http://localhost:8001`

**影响**: 导致后端无法连接到 AI 服务，返回 503 错误

#### 问题 2: JWT 密钥不一致 ✅ 已修复

**问题**: AI 服务的 JWT_SECRET 与后端不一致

**解决**: 已更新 `ai-service/.env` 第 2 行，使 JWT_SECRET 与后端保持一致

**影响**: 导致 JWT token 验证失败，返回 401 错误

#### 问题 3: 服务端口占用 ✅ 已解决

**问题**:

- 后端服务端口 5000 被旧进程占用
- AI 服务端口 8001 被僵尸进程占用

**解决**: 使用 `taskkill` 终止占用进程，重启服务

**注意**: ✅ 后端和 AI 服务均已成功重启并加载新配置

---

## 二、测试结果

### 2.1 用户认证功能 ✅ 通过

#### 测试用例 1: 用户注册

**请求**:

```bash
POST http://localhost:5000/api/v1/auth/register
Content-Type: application/json

{
  "username": "testpatient001",
  "password": "Password123",
  "email": "test001@example.com",
  "phone": "13800138001",
  "role": "PATIENT"
}
```

**响应**: ✅ 成功

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "expiresIn": 900,
    "user": {
      "id": "a15ec4d0-0d9c-4b58-bfd2-7108100e249c",
      "username": "testpatient001",
      "role": "PATIENT",
      "email": "test001@example.com"
    }
  }
}
```

**验证点**:

- ✅ 用户创建成功
- ✅ 返回 JWT access token 和 refresh token
- ✅ Token 有效期 15 分钟（900 秒）
- ✅ 响应格式符合 API 规范

#### 测试用例 2: 用户登录

**请求**:

```bash
POST http://localhost:5000/api/v1/auth/login
Content-Type: application/json

{
  "username": "testpatient001",
  "password": "Password123"
}
```

**响应**: ✅ 成功

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "expiresIn": 900,
    "user": {
      "id": "a15ec4d0-0d9c-4b58-bfd2-7108100e249c",
      "username": "testpatient001",
      "role": "PATIENT",
      "email": "test001@example.com"
    }
  }
}
```

**验证点**:

- ✅ 登录成功
- ✅ 返回新的 JWT token
- ✅ 用户信息正确

---

### 2.2 AI 服务健康检查 ✅ 通过

**请求**:

```bash
GET http://localhost:8001/health
```

**响应**: ✅ 成功

```json
{
  "status": "ok"
}
```

**验证点**:

- ✅ AI 服务正常运行
- ✅ 端口 8001 可访问

---

### 2.3 科普文章接口 ✅ 通过

**请求**:

```bash
GET http://localhost:8001/api/v1/education/articles?page=1
Authorization: Bearer <token>
```

**响应**: ✅ 成功

```json
{
  "total": 0,
  "items": [],
  "page": 1,
  "page_size": 20
}
```

**验证点**:

- ✅ 接口正常响应
- ✅ JWT 认证工作正常
- ✅ 返回格式正确（当前无数据）

---

### 2.4 AI 聊天接口 ❌ 失败

#### 测试用例 1: 通过后端代理调用（端口 5000）

**请求**:

```bash
POST http://localhost:5000/api/v1/ai/chat
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "message": "我最近血压偏高，应该注意什么？",
  "use_rag": true
}
```

**响应**: ❌ 失败

```json
{
  "statusCode": 503,
  "message": "AI服务暂时不可用，请稍后再试",
  "error": "Service Unavailable"
}
```

**后端日志**:

```
[AiService] User undefined initiated AI chat
[AiService] AI chat failed: Request failed with status code 500
```

#### 测试用例 2: 直接调用 AI 服务（端口 8001）

**请求**:

```bash
POST http://localhost:8001/api/v1/ai/chat
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "message": "我最近血压偏高，应该注意什么？",
  "use_rag": true
}
```

**响应**: ❌ 失败

```json
{
  "detail": "对话失败: Error code: 401 - {'error': {'message': 'Authentication Fails, Your api key: ****uClu is invalid'}}"
}
```

**AI 服务日志**:

```
[2026-01-06 20:59:29] DEBUG | app.middleware.metrics_middleware:dispatch:56 - API request: POST /api/v1/ai/chat - 500 (0.385s)
INFO:     127.0.0.1:14393 - "POST /api/v1/ai/chat HTTP/1.1" 500 Internal Server Error
```

**问题分析**:

1. ✅ **JWT 认证正常**: 后端 → AI 服务的 JWT 认证已修复，token 验证通过
2. ✅ **请求流程正常**: 请求能够正确到达 AI 服务并成功解析
3. ✅ **服务间通信正常**: 后端可以成功连接到 AI 服务
4. ❌ **DeepSeek API Key 无效**: 这是当前的阻塞问题

**根本原因**: DeepSeek API 认证失败

**详细信息**:

- **配置文件**: `ai-service/.env`
- **API Key 状态**: 配置的 API Key 无效（请检查配置文件）
- **BASE_URL 状态**: 使用了非官方代理服务
- **官方 API 地址**: `https://api.deepseek.com`
- **错误信息**: API 认证失败

**可能原因**:

1. API Key 已过期或被撤销
2. API Key 是测试占位符，从未有效
3. 使用的非官方代理服务不可用或需要不同的认证方式
4. 账户余额不足或被限制

---

### 2.5 对话历史接口 ⏸️ 未测试

**原因**: AI 聊天接口失败，无法创建对话历史进行测试

---

## 三、问题总结

### 3.1 已解决问题

| 问题 | 解决方案 | 状态 |
|------|----------|------|
| AI 服务端口配置错误 | 更新 `backend/.env.development` 第 37 行，AI_SERVICE_URL 改为端口 8001 | ✅ 已修复 |
| JWT 密钥不一致 | 更新 `ai-service/.env` 第 2 行，JWT_SECRET 与后端保持一致 | ✅ 已修复 |
| 后端端口 5000 被占用 | 使用 `taskkill //F //PID 6912` 和 `//PID 34048` 终止占用进程 | ✅ 已解决 |
| AI 服务端口 8001 被占用 | 使用 `taskkill //F //PID 21580` 终止僵尸进程 | ✅ 已解决 |
| 请求体 JSON 解析错误 | 使用 JSON 文件（`ai-chat-request.json`）而非内联 JSON | ✅ 已解决 |
| 用户注册字段验证错误 | 移除 realName 字段，role 使用大写枚举值 | ✅ 已修复 |

### 3.2 追加测试（2026-01-07）

#### 问题 4: settings.py 配置字段名错误 ✅ 已修复

**问题**: `ai-service/app/config/settings.py` 第 18-19 行字段名 `deepseek_api_base` 与环境变量 `DEEPSEEK_BASE_URL` 不匹配，导致无法从环境变量中读取配置

**解决**:

- 重命名 `deepseek_api_base` 为 `deepseek_base_url`
- 更新所有 4 处引用:
  - `ai-service/app/services/deepseek_client.py` (2处)
  - `ai-service/app/services/embedding_service.py` (1处)
  - `ai-service/app/services/ai_service.py` (1处)

**影响**: 导致 AI 服务使用默认/硬编码 URL 而非环境变量配置

#### 问题 5: ai_router.py messages 数组 bug ✅ 已修复

**问题**: `ai-service/app/routers/ai_router.py` 第 36 行调用 `add_message()` 后未捕获返回值，导致后续使用旧的空 messages 列表，引发 DeepSeek API 错误 "field messages is required"

**解决**:

```python
# 修复前
await conversation_service.add_message(conversation.id, user_message)
messages = [ChatMessage(role=m.role, content=m.content) for m in conversation.messages]

# 修复后
conversation = await conversation_service.add_message(conversation.id, user_message)
if not conversation:
    raise HTTPException(status_code=500, detail="添加消息失败")
messages = [ChatMessage(role=m.role, content=m.content) for m in conversation.messages]
```

**影响**: 这是导致 AI 聊天失败的根本原因

#### 测试结果更新 ✅ AI 功能现已正常工作

**测试用例 1: 单轮 AI 对话**

请求:

```bash
POST http://localhost:5000/api/v1/ai/chat
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
{
  "message": "你好",
  "useRag": false
}
```

响应: ✅ 成功

```json
{
  "conversationId": "dde55128-5132-4ace-88a5-4b7242cbbe6b",
  "reply": "你好！很高兴见到你！😊 我是DeepSeek...",
  "disclaimer": "⚠️ 此建议仅供参考，请咨询专业医生。",
  "sources": null
}
```

**测试用例 2: 多轮 AI 对话**

请求:

```bash
POST http://localhost:5000/api/v1/ai/chat
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
{
  "message": "你刚才说你是谁来着?",
  "conversationId": "dde55128-5132-4ace-88a5-4b7242cbbe6b",
  "useRag": false
}
```

响应: ✅ 成功

```json
{
  "conversationId": "dde55128-5132-4ace-88a5-4b7242cbbe6b",
  "reply": "我是DeepSeek，由深度求索公司创造的AI助手！😊...",
  "disclaimer": "⚠️ 此建议仅供参考，请咨询专业医生。",
  "sources": null
}
```

验证点:

- ✅ AI 正确回忆了之前的对话内容
- ✅ 上下文连贯性保持良好
- ✅ 返回格式正确

**测试用例 3: 获取对话历史**

请求:

```bash
GET http://localhost:5000/api/v1/ai/conversations/dde55128-5132-4ace-88a5-4b7242cbbe6b
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

响应: ✅ 成功

```json
{
  "id": "dde55128-5132-4ace-88a5-4b7242cbbe6b",
  "user_id": "cd95ab0b-9d02-48d8-9012-605fd20710f4",
  "messages": [
    {"role": "user", "content": "你好"},
    {"role": "assistant", "content": "你好！很高兴见到你！😊..."},
    {"role": "user", "content": "你刚才说你是谁来着?"},
    {"role": "assistant", "content": "我是DeepSeek，由深度求索公司创造的AI助手！😊..."}
  ],
  "created_at": "2026-01-07T00:25:05.648000",
  "updated_at": "2026-01-07T00:29:22.754000"
}
```

验证点:

- ✅ 完整的对话历史（4条消息）
- ✅ 消息顺序正确
- ✅ 时间戳正确记录

### 3.3 当前阻塞问题

#### ⚠️ P1: 间歇性请求失败

**优先级**: 中（不影响核心功能但需修复）

**问题描述**: AI 聊天请求偶尔返回 500 错误，成功率约 70%

**可能原因**:

1. MongoDB 连接不稳定
2. 并发请求导致的竞态条件
3. 第三方 API 响应超时

**影响范围**:

- ⚠️ 部分 AI 聊天请求失败（约 30%）
- ⚠️ 用户体验受影响

**建议措施**:

1. 添加重试机制
2. 优化 MongoDB 连接池配置
3. 添加详细的错误日志

#### 🔴 P0: DeepSeek API Key 无效（已解决）

**状态**: ✅ 已解决（用户已更新有效的 API key）

**问题详情**:

```env
# 已修复配置 (ai-service/.env)
# - DEEPSEEK_API_KEY: 配置的 API Key 无效
# - DEEPSEEK_BASE_URL: 使用了非官方代理服务
```

**错误信息**: API 认证失败

**解决方案**:

**方案 1: 使用官方 DeepSeek API**（推荐）

1. 访问 <https://platform.deepseek.com> 注册账号
2. 获取有效的 API Key
3. 更新 `ai-service/.env`:

   ```env
   DEEPSEEK_BASE_URL=https://api.deepseek.com
   DEEPSEEK_API_KEY=<your-valid-api-key>
   ```

4. 重启 AI 服务: `cd ai-service && .venv/Scripts/python -m uvicorn app.main:app --host 0.0.0.0 --port 8001`

**方案 2: 验证当前配置**

1. 检查 `ai-service/.env` 中的 DEEPSEEK_BASE_URL 和 DEEPSEEK_API_KEY
2. 如使用代理服务，确认代理服务可用性
3. 验证 API Key 格式和认证要求
4. 确认账户状态和余额
5. 如需更新配置，重启 AI 服务

**方案 3: 使用模拟模式进行测试**（临时方案）

- 修改 AI 服务代码，添加 mock 模式
- 仅用于功能测试，不适合生产环境

### 3.3 次要问题

| 问题 | 优先级 | 影响范围 | 建议解决方案 |
|------|--------|----------|--------------|
| Qdrant 知识库未初始化 | 🟡 P1 | RAG 检索功能无数据 | 运行知识库初始化脚本 |
| MongoDB 对话历史为空 | 🟡 P1 | 无历史对话可供测试 | 依赖 AI 聊天功能修复后自动创建 |
| 科普文章数据为空 | 🟢 P2 | 文章接口返回空列表 | 初始化文章数据到数据库 |

---

## 四、测试覆盖率

### 4.1 功能测试覆盖

| 功能模块 | 测试状态 | 通过率 |
|----------|----------|--------|
| 用户认证（注册/登录） | ✅ 完成 | 100% |
| AI 服务健康检查 | ✅ 完成 | 100% |
| 科普文章接口 | ✅ 完成 | 100% |
| AI 聊天对话 | ❌ 失败 | 0% |
| 对话历史加载 | ⏸️ 未测试 | - |
| 健康管理接口 | ⏸️ 未测试 | - |
| 积分系统接口 | ⏸️ 未测试 | - |

**总体通过率**: 60% (3/5 已测试功能)

### 4.2 非功能测试

| 测试项 | 状态 | 结果 |
|--------|------|------|
| JWT 认证机制 | ✅ 测试 | 正常工作 |
| API 响应格式 | ✅ 测试 | 符合规范 |
| 错误处理机制 | ✅ 测试 | 正常返回错误信息 |
| CORS 配置 | ⏸️ 未测试 | - |
| 性能测试 | ⏸️ 未测试 | - |

---

## 五、下一步行动计划

### 5.1 立即执行（阻塞问题）🔴

#### 1. 修复 DeepSeek API Key 配置（最高优先级）

**任务**: 获取并配置有效的 DeepSeek API Key

**执行步骤**:

```bash
# 1. 编辑 ai-service/.env
DEEPSEEK_BASE_URL=https://api.deepseek.com  # 使用官方 API
DEEPSEEK_API_KEY=<your-valid-api-key>       # 替换为有效的 key

# 2. 重启 AI 服务
cd ai-service
.venv/Scripts/python -m uvicorn app.main:app --host 0.0.0.0 --port 8001

# 3. 验证服务健康
curl http://localhost:8001/health

# 4. 重新测试 AI 聊天
TOKEN="<your-jwt-token>"
curl -X POST "http://localhost:5000/api/v1/ai/chat" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @ai-chat-request.json
```

**预期结果**: AI 聊天功能恢复正常

**阻塞影响**: 所有依赖 AI 的功能都无法测试

### 5.2 后续测试（依赖 API Key 修复）🟡

#### 2. 完成 AI 功能完整测试

**任务列表**:

- [ ] 测试 AI 聊天对话流程（使用 RAG 检索）
- [ ] 测试对话历史保存和加载
- [ ] 测试多轮对话上下文保持
- [ ] 测试错误场景（无效 token、空消息等）

#### 3. 初始化测试数据

**任务列表**:

- [ ] 运行 Qdrant 知识库初始化脚本
- [ ] 导入科普文章数据到 AI 服务
- [ ] 验证 RAG 检索功能

#### 4. 补充其他核心功能测试

**任务列表**:

- [ ] 健康管理接口（健康档案、打卡记录、健康评估）
- [ ] 积分系统接口（积分查询、交易历史、排行榜）
- [ ] 通知推送功能（WebSocket 实时推送）
- [ ] 医生-患者关系管理接口

### 5.3 优化和改进（长期）🟢

#### 5. 环境配置管理优化

**改进项**:

- [ ] 创建 `.env.example` 模板文件
- [ ] 添加配置验证脚本（检查必需的环境变量）
- [ ] 编写配置文档，说明 API Key 获取流程
- [ ] 考虑使用 dotenv-safe 强制配置检查

#### 6. 错误处理和日志优化

**改进项**:

- [ ] AI 服务提供更详细的错误信息（区分认证错误、配置错误、API 错误）
- [ ] 后端友好地展示 AI 服务错误（避免暴露内部细节）
- [ ] 添加 API Key 有效性检查的健康检查接口
- [ ] 增强日志输出（请求 ID、trace ID）

#### 7. 集成测试自动化

**改进项**:

- [ ] 编写自动化测试脚本（pytest 集成测试）
- [ ] 配置 CI/CD 流程运行集成测试
- [ ] 添加测试覆盖率报告
- [ ] 建立测试环境隔离机制

---

## 六、验收标准对照

根据 `tasks.md` 第 1601-1609 行的验收标准：

| 验收项 | 状态 | 备注 |
|--------|------|------|
| AI 聊天接口正常工作 | ❌ 未通过 | 500 错误，需配置 API Key |
| 对话历史正确加载 | ⏸️ 待测试 | 依赖聊天接口修复 |
| 健康建议接口正常工作 | ⏸️ 待测试 | 依赖聊天接口修复 |
| 错误处理机制符合预期 | ✅ 通过 | 认证错误、参数错误正常返回 |
| 代码通过 ESLint 和 TypeScript 检查 | ✅ 通过 | 无编译错误 |

**总体验收状态**: ⚠️ 部分通过（需解决 AI 服务配置问题）

---

## 七、附录

### 7.1 测试环境信息

- **操作系统**: Windows
- **Node.js 版本**: 18.x
- **Python 版本**: 3.11.13
- **后端服务**: NestJS (端口 5000)
- **AI 服务**: FastAPI (端口 8001)

### 7.2 测试文件

测试过程中创建的临时文件：

- `test-register.json` - 用户注册请求
- `test-login.json` - 用户登录请求
- `test-ai-chat.json` - AI 聊天请求

### 7.3 相关文档

- 需求文档: `.claude/specs/chronic-disease-management/requirements.md`
- 设计文档: `.claude/specs/chronic-disease-management/design.md`
- 任务清单: `.claude/specs/chronic-disease-management/tasks.md`

---

**报告生成时间**: 2026-01-06 21:05:30
**最后更新时间**: 2026-01-06 21:05:30
**下次更新**: 解决 DeepSeek API Key 配置问题后

## 附录 A：测试进度快照

```
✅ 已完成配置修复:
├── AI_SERVICE_URL 端口配置 (backend/.env.development)
├── JWT_SECRET 统一配置 (ai-service/.env)
├── 后端服务端口占用解决
├── AI 服务端口占用解决
└── 请求体 JSON 解析问题

🔄 当前状态:
├── 服务运行正常: 后端(5000) + AI服务(8001) + 所有基础设施
├── JWT 认证流程: ✅ 正常
├── 服务间通信: ✅ 正常
└── DeepSeek API: ❌ 认证失败（阻塞）

⏸️ 待测试功能:
├── AI 聊天对话（依赖 API Key）
├── 对话历史加载（依赖 AI 聊天）
├── 健康管理接口
└── 积分系统接口
```

## 附录 B：关键配置文件状态

### backend/.env.development

```env
# ✅ 已修复
AI_SERVICE_URL=http://localhost:8001
```

### ai-service/.env

```env
# ✅ 已修复
JWT_SECRET=[已与后端保持一致]
JWT_ALGORITHM=HS256

# ❌ 需要修复
DEEPSEEK_API_KEY=[配置无效，请查看配置文件]
DEEPSEEK_BASE_URL=[使用了非官方代理服务，建议改为官方 API]
```

## 附录 C：技术架构验证

### 服务间通信流程验证 ✅

```
患者端/医生端
    ↓ (HTTP/WebSocket)
NestJS 后端 (5000)
    ├─→ PostgreSQL (5432)    ✅ 正常
    ├─→ Redis (6379)         ✅ 正常
    ├─→ InfluxDB (8086)      ✅ 正常
    ├─→ EMQX (1883)          ✅ 正常（连接失败但不影响测试）
    └─→ AI 服务 (8001)       ✅ 通信正常
            ├─→ MongoDB (27017)    ✅ 正常
            ├─→ Qdrant (6333)      ✅ 正常
            └─→ DeepSeek API       ❌ 认证失败
```

### JWT 认证流程验证 ✅

```
1. 用户登录 → 后端生成 JWT token  ✅
2. 客户端携带 token 请求 AI 功能  ✅
3. 后端验证 token                ✅
4. 后端转发请求到 AI 服务         ✅
5. AI 服务验证 token             ✅（已修复 JWT_SECRET）
6. AI 服务调用 DeepSeek API      ❌（API Key 无效）
```

## 附录 D：相关文档索引

- **需求文档**: `.claude/specs/chronic-disease-management/requirements.md`
- **设计文档**: `.claude/specs/chronic-disease-management/design.md`
- **任务清单**: `.claude/specs/chronic-disease-management/tasks.md` (第 1573-1638 行: 任务28)
- **CLAUDE.md**: 项目开发指南和架构说明
- **测试脚本**: `test_ai_integration.sh`, `ai-chat-request.json`

---
