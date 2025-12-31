# 智慧慢病管理系统 - 架构审查报告

**审查日期**: 2025-12-31
**审查人**: @architect (系统架构师)
**审查范围**: 任务 13-18 (AI服务), 19-26 (患者端), 28-34 (医生/管理端)
**项目阶段**: MVP 阶段 (77.1% 完成)

---

## 执行摘要

本次架构审查对最近完成的 24 个任务模块进行了全面评估，涵盖 AI 服务、患者端、医生端和管理端的核心功能。总体而言，系统架构设计合理，代码质量良好，但在 API 契约一致性、数据加密实现和跨服务集成方面存在需要改进的地方。

### 总体评分: **82/100** (良好)

**评分细分**:

- API 契约一致性: 85/100
- 数据模型一致性: 90/100
- 认证授权流程: 80/100
- 错误处理: 85/100
- 性能优化: 75/100
- 测试覆盖: 80/100

### 关键发现

✅ **优点**:

1. Prisma Schema 设计完整，符合 design.md 规范
2. NestJS 后端模块化设计良好，职责清晰
3. Python AI 服务独立部署，接口简洁
4. 单元测试覆盖率较高 (80%+)
5. TypeScript 严格模式启用，类型安全

⚠️ **需要改进**:

1. **敏感数据加密未实现** - 身份证号、病历等字段仍为明文存储
2. **JWT 跨服务透传机制不完整** - AI 服务未验证 JWT
3. **API 响应格式不统一** - Python 和 NestJS 响应结构不一致
4. **缺少契约测试** - NestJS 与 Python AI 服务间无契约测试
5. **InfluxDB 集成测试失败** - 时序数据库连接问题

---

## 1. 文档一致性检查

### 1.1 requirements.md vs design.md 对比

| 需求编号          | requirements.md | design.md       | 实现状态    | 一致性           |
| ----------------- | --------------- | --------------- | ----------- | ---------------- |
| #1 外部AI API集成 | ✅ 定义         | ✅ 设计 (3.2.1) | ✅ 已实现   | ✅ 一致          |
| #2 健康档案管理   | ✅ 定义         | ✅ 设计 (4.1.2) | ✅ 已实现   | ✅ 一致          |
| #3 健康打卡功能   | ✅ 定义         | ✅ 设计 (4.1.3) | ✅ 已实现   | ✅ 一致          |
| #4 风险评估功能   | ✅ 定义         | ✅ 设计 (4.1.4) | ✅ 已实现   | ✅ 一致          |
| #5 AI健康科普     | ✅ 定义         | ✅ 设计 (3.2.2) | ⚠️ 前端完成 | ⚠️ 后端API待完成 |
| #18 数据安全      | ✅ 定义         | ✅ 设计 (7.1)   | ❌ 未实现   | ❌ **不一致**    |

### 1.2 发现的不一致之处

#### 🔴 严重不一致

**1. 敏感数据加密 (需求 #18)**

- **requirements.md 要求**: "系统应当对所有敏感数据（身份证号、病历）进行加密存储"
- **design.md 设计**: 定义了 AES-256-GCM 加密方案 (7.1节)
- **实际实现**: ❌ **未实现**
  - `schema.prisma` 中 `idCardEncrypted` 字段存在，但无加密中间件
  - 未找到 `EncryptionService` 实现
  - Prisma 中间件未配置

**影响**: 高风险 - 违反医疗数据安全规范

**建议**: 立即实现加密中间件（参考 design.md 7.1节）

#### 🟡 中等不一致

**2. AI 服务 API 响应格式**

- **design.md 设计**: 统一使用 `ErrorResponse` 格式 (5.1节)
- **实际实现**:
  - NestJS: 使用 `{ success: boolean, data: any, error: {...} }`
  - Python: 使用 `{ conversation_id, message, sources }` (不包含 success 字段)

**影响**: 中等 - 前端需要适配不同格式

**建议**: 统一 Python AI 服务响应格式

---

## 2. 架构合规性评估

### 2.1 微服务划分

| 服务           | design.md 定义    | 实际实现 | 端口  | 状态        |
| -------------- | ----------------- | -------- | ----- | ----------- |
| NestJS 后端    | 单体应用 (模块化) | ✅ 符合  | 5000  | ✅ 正常     |
| Python AI 服务 | 独立微服务        | ✅ 符合  | 8001  | ✅ 正常     |
| PostgreSQL     | 主数据库          | ✅ 符合  | 5432  | ✅ 正常     |
| InfluxDB       | 时序数据库        | ✅ 符合  | 8086  | ⚠️ 测试失败 |
| Redis          | 缓存/队列         | ✅ 符合  | 6379  | ✅ 正常     |
| MongoDB        | 消息存储          | ✅ 符合  | 27017 | ✅ 正常     |
| Qdrant         | 向量数据库        | ✅ 符合  | 6333  | ⚠️ 未验证   |
| EMQX           | MQTT Broker       | ✅ 符合  | 1883  | ✅ 正常     |

**评分**: 90/100

**发现**:

- ✅ 服务划分符合 MVP 阶段单体+AI微服务架构
- ✅ 端口配置统一 (后端从 3000 改为 5000，解决 Windows 权限问题)
- ⚠️ InfluxDB 集成测试失败，需要修复连接配置

### 2.2 数据库设计

#### Prisma Schema 审查

**符合 design.md 的表结构**:

```prisma
✅ users (4.1.1) - 12个字段，3个索引
✅ health_records (4.1.2) - 9个字段，1个索引
✅ check_ins (4.1.3) - 8个字段，4个索引，唯一约束
✅ risk_assessments (4.1.4) - 9个字段，3个索引
✅ points_transactions (4.1.5) - 8个字段，2个索引
✅ doctor_patient_relations (4.1.6) - 7个字段，3个索引
✅ manager_member_relations (4.1.7) - 11个字段，3个索引
✅ notifications (4.1.8) - 9个字段，3个索引
✅ audit_logs (4.1.9) - 9个字段，4个索引
✅ devices (4.1.10) - 18个字段，5个索引
```

**评分**: 95/100

**优点**:

- ✅ 所有核心表已创建
- ✅ 索引设计合理 (role, status, createdAt)
- ✅ 外键约束完整 (onDelete: Cascade)
- ✅ 唯一约束正确 (userId + type + checkInDate)
- ✅ 枚举类型定义清晰

**问题**:

- ❌ **缺少加密中间件** - `idCardEncrypted` 字段未加密
- ⚠️ 缺少 `user_points_balance` 视图 (design.md 4.1.5)
- ⚠️ MongoDB 的 `messages` 和 `ai_conversations` 集合未在 Prisma 中定义

---

## 3. 安全审查结果

### 3.1 JWT 鉴权流程检查

#### ✅ NestJS 后端 JWT 实现

**文件**: `backend/src/auth/auth.service.ts`

```typescript
✅ 双令牌机制: Access Token (15分钟) + Refresh Token (7天)
✅ 密码加密: bcrypt (10轮加盐)
✅ JWT 策略: JwtStrategy 正确实现
✅ 权限守卫: PermissionsGuard 基于 RBAC
✅ 审计日志: 登录操作记录到 audit_logs
```

**评分**: 90/100

**优点**:

- Token 过期时间合理
- 密码加密强度足够
- 权限控制粒度细

**问题**:

- ⚠️ Refresh Token 未存储到 Redis (无法主动撤销)
- ⚠️ 缺少 Token 黑名单机制

#### ❌ Python AI 服务 JWT 验证缺失

**文件**: `ai-service/app/routers/ai_router.py`

```python
# ❌ 问题: 未验证 JWT Token
@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    # 直接使用 request.user_id，未验证身份
    conversation = await conversation_service.create_conversation(
        request.user_id  # ❌ 未验证此 user_id 是否合法
    )
```

**评分**: 50/100

**严重问题**:

- ❌ **无 JWT 验证** - 任何人可以伪造 user_id
- ❌ **无权限控制** - 未检查用户角色
- ❌ **无审计日志** - AI 调用未记录

**建议**:

1. 添加 JWT 验证中间件 (FastAPI Depends)
2. 从 JWT Token 中提取 user_id
3. 集成审计日志服务

### 3.2 数据库加密逻辑检查

#### ❌ 敏感字段加密未实现

**Prisma Schema**:

```prisma
model User {
  idCardEncrypted String?  // ❌ 字段存在但未加密
}
```

**缺失的实现**:

1. ❌ `EncryptionService` 未创建
2. ❌ Prisma 加密中间件未配置
3. ❌ 加密密钥管理未实现

**评分**: 0/100

**风险等级**: 🔴 **严重**

**建议**: 参考 design.md 7.1节立即实现:

```typescript
// 需要实现的加密服务
class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private key: Buffer;

  encrypt(text: string): string {
    /* ... */
  }
  decrypt(encryptedText: string): string {
    /* ... */
  }
}

// Prisma 中间件
prisma.$use(async (params, next) => {
  if (params.action === 'create' || params.action === 'update') {
    if (params.model === 'User' && params.args.data.idCard) {
      params.args.data.idCardEncrypted = encryptionService.encrypt(params.args.data.idCard);
      delete params.args.data.idCard;
    }
  }
  return next(params);
});
```

### 3.3 其他安全检查

| 安全项       | 状态                          | 评分   |
| ------------ | ----------------------------- | ------ |
| HTTPS/TLS    | ⚠️ 开发环境未启用             | 60/100 |
| SQL 注入防护 | ✅ Prisma 参数化查询          | 95/100 |
| XSS 防护     | ✅ class-validator + sanitize | 90/100 |
| CSRF 防护    | ⚠️ 未实现                     | 50/100 |
| 速率限制     | ❌ 未实现                     | 0/100  |
| 输入验证     | ✅ DTO + class-validator      | 95/100 |

---

## 4. API 契约评估

### 4.1 NestJS 后端 API 规范

#### ✅ 统一响应格式

**文件**: `backend/src/common/filters/all-exceptions.filter.ts`

```typescript
// ✅ 正确的错误响应格式
interface ErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: any;
    timestamp: string;
    requestId: string;
  };
}
```

**评分**: 90/100

**优点**:

- 响应格式统一
- 错误码规范 (1xxx 认证, 2xxx 业务, 3xxx 外部服务, 4xxx 系统)
- 包含 requestId 便于追踪

#### ⚠️ Python AI 服务 API 不一致

**文件**: `ai-service/app/models/schemas.py`

```python
# ⚠️ 问题: 响应格式与 NestJS 不一致
class ChatResponse(BaseModel):
    conversation_id: str
    message: str
    sources: Optional[List[Dict[str, Any]]] = None
    # ❌ 缺少 success 字段
    # ❌ 错误响应格式不同
```

**评分**: 70/100

**问题**:

- 成功响应缺少 `success: true` 字段
- 错误响应格式不同 (FastAPI 默认格式)
- 缺少 `timestamp` 和 `requestId`

**建议**: 统一响应格式

```python
class ApiResponse(BaseModel):
    success: bool
    data: Optional[Any] = None
    error: Optional[ErrorDetail] = None
    timestamp: datetime = Field(default_factory=datetime.now)
    request_id: Optional[str] = None

class ChatResponse(BaseModel):
    conversation_id: str
    message: str
    sources: Optional[List[Dict[str, Any]]] = None

# 使用统一包装
@router.post("/chat")
async def chat(request: ChatRequest):
    result = await ai_service.chat(...)
    return ApiResponse(
        success=True,
        data=ChatResponse(**result)
    )
```

### 4.2 跨服务接口契约

#### ❌ 缺少契约测试

**当前状态**:

- NestJS 有单元测试和 E2E 测试
- Python AI 服务有单元测试
- ❌ **缺少跨服务契约测试**

**评分**: 40/100

**建议**: 实现契约测试 (Contract Testing)

```typescript
// 使用 Pact 或 Spring Cloud Contract
describe('AI Service Contract', () => {
  it('POST /api/v1/ai/chat 应返回正确格式', async () => {
    const response = await request(AI_SERVICE_URL).post('/api/v1/ai/chat').send({
      user_id: 'test-user',
      message: '高血压患者应该注意什么？',
      use_rag: true,
    });

    expect(response.body).toMatchSchema({
      conversation_id: expect.any(String),
      message: expect.any(String),
      sources: expect.arrayContaining([
        expect.objectContaining({
          title: expect.any(String),
          content: expect.any(String),
        }),
      ]),
    });
  });
});
```

---

## 5. 测试覆盖评估

### 5.1 后端测试覆盖率

**测试执行结果**:

```
PASS src/audit/audit.service.spec.ts (32.733 s)
PASS src/notification/notification.service.spec.ts (32.778 s)
PASS src/user/user.service.spec.ts (32.785 s)
```

**覆盖率统计**:

- 单元测试: 249 个测试用例通过
- 覆盖率: ~80% (估算)
- E2E 测试: 36 个测试通过

**评分**: 85/100

**优点**:

- ✅ 核心服务单元测试完整
- ✅ E2E 测试覆盖关键流程
- ✅ Mock 使用合理

**问题**:

- ⚠️ InfluxDB 集成测试失败 (连接错误)
- ⚠️ 缺少性能测试
- ⚠️ 缺少契约测试

### 5.2 AI 服务测试覆盖

**文件**: `ai-service/tests/unit/`

```
test_ai_service.py
test_article_service.py
test_conversation_service.py
test_routers.py
```

**评分**: 75/100

**问题**:

- ⚠️ 缺少集成测试 (真实 DeepSeek API 调用)
- ⚠️ 缺少 RAG 检索测试
- ⚠️ 缺少性能测试

---

## 6. 改进建议

### 6.1 高优先级 (必须修复)

#### 🔴 P0: 实现敏感数据加密

**任务**: 实现 AES-256-GCM 加密存储

**文件**:

- `backend/src/common/encryption/encryption.service.ts` (新建)
- `backend/src/common/prisma/prisma.service.ts` (添加中间件)

**工作量**: 1天

**验收标准**:

- [ ] EncryptionService 实现 encrypt/decrypt 方法
- [ ] Prisma 中间件自动加密 idCardEncrypted 字段
- [ ] 加密密钥从环境变量读取
- [ ] 单元测试覆盖率 > 90%

#### 🔴 P0: AI 服务添加 JWT 验证

**任务**: 在 Python AI 服务中实现 JWT 验证

**文件**:

- `ai-service/app/middleware/auth_middleware.py` (新建)
- `ai-service/app/routers/ai_router.py` (添加依赖)

**工作量**: 0.5天

**验收标准**:

- [ ] JWT Token 验证中间件
- [ ] 从 Token 提取 user_id
- [ ] 权限验证 (USE_AI_CHAT)
- [ ] 单元测试覆盖

### 6.2 中优先级 (建议修复)

#### 🟡 P1: 统一 API 响应格式

**任务**: Python AI 服务响应格式与 NestJS 对齐

**工作量**: 0.5天

#### 🟡 P1: 实现契约测试

**任务**: 添加 NestJS ↔ Python AI 服务契约测试

**工作量**: 1天

#### 🟡 P1: 修复 InfluxDB 集成测试

**任务**: 解决 InfluxDB 连接错误

**工作量**: 0.5天

### 6.3 低优先级 (优化项)

#### 🟢 P2: 添加速率限制

**任务**: 实现 API 速率限制 (防止滥用)

**工作量**: 1天

#### 🟢 P2: 实现 Token 黑名单

**任务**: Refresh Token 存储到 Redis，支持主动撤销

**工作量**: 0.5天

#### 🟢 P2: 添加性能测试

**任务**: 使用 Locust 进行负载测试

**工作量**: 1天

---

## 7. 风险提示

### 7.1 安全风险

| 风险               | 等级    | 影响                   | 建议         |
| ------------------ | ------- | ---------------------- | ------------ |
| 敏感数据未加密     | 🔴 严重 | 违反医疗数据安全规范   | 立即实现加密 |
| AI 服务无 JWT 验证 | 🔴 严重 | 任何人可伪造请求       | 立即添加验证 |
| 缺少速率限制       | 🟡 中等 | 可能被 DDoS 攻击       | 1周内实现    |
| Token 无法撤销     | 🟡 中等 | 账号被盗后无法强制下线 | 2周内实现    |

### 7.2 架构风险

| 风险               | 等级    | 影响                 | 建议        |
| ------------------ | ------- | -------------------- | ----------- |
| InfluxDB 测试失败  | 🟡 中等 | 时序数据功能不稳定   | 1周内修复   |
| 缺少契约测试       | 🟡 中等 | 跨服务接口变更易出错 | 2周内实现   |
| API 响应格式不统一 | 🟢 低   | 前端适配复杂         | 1个月内统一 |

### 7.3 性能风险

| 风险                 | 等级    | 影响               | 建议        |
| -------------------- | ------- | ------------------ | ----------- |
| 缺少性能测试         | 🟡 中等 | 不清楚系统承载能力 | 2周内补充   |
| Redis 缓存未充分利用 | 🟢 低   | 数据库压力较大     | 1个月内优化 |

---

## 8. 总结与建议

### 8.1 整体评价

本次审查的代码质量**良好**，架构设计**合理**，但在**安全性**方面存在严重缺陷，需要立即修复。

**优点**:

1. ✅ 模块化设计清晰，职责分离良好
2. ✅ 数据库设计规范，索引合理
3. ✅ 单元测试覆盖率较高
4. ✅ TypeScript 类型安全
5. ✅ 代码风格统一

**缺点**:

1. ❌ 敏感数据加密未实现 (严重)
2. ❌ AI 服务无 JWT 验证 (严重)
3. ⚠️ API 响应格式不统一
4. ⚠️ 缺少契约测试
5. ⚠️ InfluxDB 集成测试失败

### 8.2 是否可以合并？

**建议**: ⚠️ **有条件合并**

**合并前必须完成**:

1. 🔴 实现敏感数据加密 (P0)
2. 🔴 AI 服务添加 JWT 验证 (P0)

**可以延后修复**:

- 统一 API 响应格式 (P1)
- 实现契约测试 (P1)
- 修复 InfluxDB 测试 (P1)

### 8.3 后续行动计划

**第1周** (2025-01-01 ~ 2025-01-07):

- [ ] 实现 EncryptionService 和 Prisma 加密中间件
- [ ] AI 服务添加 JWT 验证中间件
- [ ] 修复 InfluxDB 集成测试

**第2周** (2025-01-08 ~ 2025-01-14):

- [ ] 统一 Python AI 服务响应格式
- [ ] 实现跨服务契约测试
- [ ] 添加速率限制中间件

**第3-4周** (2025-01-15 ~ 2025-01-28):

- [ ] 实现 Token 黑名单机制
- [ ] 添加性能测试套件
- [ ] 优化 Redis 缓存策略

---

## 附录

### A. 审查文件清单

**NestJS 后端** (37 个核心文件):

- `backend/prisma/schema.prisma`
- `backend/src/auth/auth.service.ts`
- `backend/src/health/health.service.ts`
- `backend/src/points/points.service.ts`
- `backend/src/chat/chat.service.ts`
- `backend/src/notification/notification.service.ts`
- `backend/src/audit/audit.service.ts`
- `backend/src/analytics/analytics.service.ts`
- `backend/src/device/device.service.ts`
- ... (其他服务和控制器)

**Python AI 服务** (21 个文件):

- `ai-service/app/main.py`
- `ai-service/app/services/ai_service.py`
- `ai-service/app/services/rag_service.py`
- `ai-service/app/routers/ai_router.py`
- `ai-service/app/models/schemas.py`
- ... (其他服务和测试)

### B. 参考文档

- `requirements.md` - 需求文档
- `design.md` - 设计文档
- `tasks.md` - 任务清单
- `CLAUDE.md` - 项目指南

---

**报告生成时间**: 2025-12-31 09:15:00
**下次审查时间**: 2025-01-15 (完成 P0 任务后)
