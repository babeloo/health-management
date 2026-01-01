# 架构审查请求

> **请求日期**: 2025-12-31
> **请求人**: @pm
> **审查人**: @architect
> **审查范围**: 3 个并行开发 worktree 的架构完整性和质量

---

## 审查目标

在合并 3 个并行开发分支到 master 之前，需要确保：

1. API 契约在前后端保持一致
2. 数据模型在各服务间保持一致
3. 认证授权流程正确实现
4. 错误处理和性能优化符合规范
5. 跨服务调用符合设计文档

---

## 审查范围

### 1. AI 服务 Worktree (feature/stage3-ai-service)

**完成任务**: 13-18（6个任务，100%完成）

**关键文件**:

- `ai-service/app/main.py` - FastAPI 应用入口
- `ai-service/app/api/v1/*.py` - API 路由（5个文件）
- `ai-service/app/services/*.py` - 服务层（14个文件）
- `ai-service/app/models/*.py` - 数据模型（4个文件）

**API 端点**:

```
POST /api/v1/ai/chat - AI 对话
POST /api/v1/ai/health-advice - 健康建议
POST /api/v1/ai/diagnosis-assist - 辅助诊断
POST /api/v1/rag/search - RAG 检索
POST /api/v1/agent/message - Agent 消息处理
GET /api/v1/knowledge/articles - 科普文章列表
POST /api/v1/knowledge/articles - 创建科普文章
```

**审查要点**:

- [ ] API 请求/响应格式是否与后端调用方一致
- [ ] JWT Token 认证是否正确实现
- [ ] 错误处理是否符合统一规范
- [ ] DeepSeek API 调用的重试和熔断机制是否合理
- [ ] Redis 缓存策略是否合理（1小时过期）
- [ ] Qdrant 向量检索性能是否满足要求（< 500ms）

---

### 2. 患者端 Worktree (feature/stage4-patient-app)

**完成任务**: 19-26（8个任务，87.5%完成，任务27未完成）

**关键文件**:

- `frontend-patient/src/pages/*.vue` - 页面组件（30+个）
- `frontend-patient/src/api/*.ts` - API 调用（10+个）
- `frontend-patient/src/stores/*.ts` - 状态管理（5+个）

**API 调用**:

```typescript
// 认证
POST /api/v1/auth/login
POST /api/v1/auth/register

// 健康档案
GET /api/v1/health/records/:userId
POST /api/v1/health/records
PUT /api/v1/health/records/:userId

// 健康打卡
POST /api/v1/health/check-ins
GET /api/v1/health/check-ins/:userId
GET /api/v1/health/check-ins/:userId/trends

// 风险评估
POST /api/v1/health/assessments
GET /api/v1/health/assessments/:userId

// AI 服务
POST /api/v1/ai/chat
POST /api/v1/ai/health-advice
GET /api/v1/knowledge/articles

// 积分系统
GET /api/v1/points/balance/:userId
GET /api/v1/points/transactions/:userId
GET /api/v1/points/leaderboard

// 医患沟通
GET /api/v1/chat/conversations/:userId
GET /api/v1/chat/messages/:conversationId
WebSocket: ws://localhost:5000
```

**审查要点**:

- [ ] API 调用路径是否与后端提供的一致
- [ ] 请求参数和响应数据结构是否匹配
- [ ] JWT Token 是否正确附加到请求头
- [ ] WebSocket 连接是否正确实现
- [ ] 错误处理是否友好（用户提示）
- [ ] 跨平台兼容性（微信小程序、H5、App）

---

### 3. 管理端 Worktree (feature/stage5-admin-web)

**完成任务**: 28-34（7个任务，85.7%完成，任务35未完成）

**关键文件**:

- `frontend-web/src/pages/*.tsx` - 页面组件（30+个）
- `frontend-web/src/services/*.ts` - API 服务（10+个）
- `frontend-web/src/stores/*.ts` - 状态管理（5+个）

**API 调用**:

```typescript
// 患者管理（医生端）
GET /api/v1/relations/doctor/:doctorId/patients
GET /api/v1/health/records/:userId
GET /api/v1/health/check-ins/:userId

// AI 辅助诊断（医生端）
POST /api/v1/ai/diagnosis-assist
GET /api/v1/health/:userId/health-trends

// 医患沟通（医生端）
GET /api/v1/chat/conversations/:userId
WebSocket: ws://localhost:5000

// 会员管理（管理师端）
GET /api/v1/relations/manager/:managerId/members
POST /api/v1/relations/manager-member
PUT /api/v1/relations/manager-member/:id/membership

// AI 干预助手（管理师端）
POST /api/v1/ai/diagnosis-assist
GET /api/v1/analytics/dashboard

// 数据可视化（管理后台）
GET /api/v1/analytics/dashboard
GET /api/v1/analytics/patient-stats
GET /api/v1/analytics/check-in-stats
POST /api/v1/analytics/export
```

**审查要点**:

- [ ] API 调用路径是否与后端提供的一致
- [ ] RBAC 权限控制是否正确实现
- [ ] 数据可视化图表数据格式是否正确
- [ ] WebSocket 实时通信是否正确实现
- [ ] 错误处理是否符合规范
- [ ] TypeScript 类型定义是否完整

---

## 跨服务架构审查

### 1. API 契约一致性

**后端提供的 API** (NestJS):

```
基础路径: http://localhost:5000/api/v1

认证模块:
POST /auth/register
POST /auth/login
POST /auth/refresh

用户模块:
GET /users/:id
PUT /users/:id
POST /users/:id/avatar

健康模块:
POST /health/records
GET /health/records/:userId
PUT /health/records/:userId
POST /health/check-ins
GET /health/check-ins/:userId
GET /health/check-ins/:userId/trends
POST /health/assessments
GET /health/assessments/:userId

积分模块:
POST /points/earn
POST /points/redeem
GET /points/balance/:userId
GET /points/transactions/:userId
GET /points/leaderboard

通讯模块:
GET /chat/conversations/:userId
GET /chat/messages/:conversationId
PUT /chat/messages/:id/read
WebSocket: ws://localhost:5000

关系模块:
POST /relations/doctor-patient
GET /relations/doctor/:doctorId/patients
GET /relations/patient/:patientId/doctors

分析模块:
GET /analytics/dashboard
GET /analytics/patient-stats
GET /analytics/check-in-stats
POST /analytics/export
```

**AI 服务提供的 API** (FastAPI):

```
基础路径: http://localhost:8001/api/v1

AI 对话:
POST /ai/chat

健康建议:
POST /ai/health-advice

辅助诊断:
POST /ai/diagnosis-assist

RAG 检索:
POST /rag/search

Agent 消息:
POST /agent/message

科普文章:
GET /knowledge/articles
POST /knowledge/articles
GET /knowledge/articles/:id
```

**审查清单**:

- [ ] 前端调用的 API 路径是否与后端定义一致
- [ ] 前端调用的 AI 服务 API 是否通过后端代理（或直接调用）
- [ ] 所有 API 的请求参数类型是否匹配
- [ ] 所有 API 的响应数据结构是否匹配

---

### 2. 数据模型一致性

**Prisma Schema 定义** (backend/prisma/schema.prisma):

```prisma
model User {
  id: String (UUID)
  username: String (unique)
  email: String (unique)
  phone: String (unique)
  role: UserRole (PATIENT | DOCTOR | HEALTH_MANAGER | ADMIN)
  status: UserStatus (ACTIVE | INACTIVE | SUSPENDED)
  ...
}

model HealthRecord {
  id: String (UUID)
  userId: String
  height: Float?
  weight: Float?
  bloodType: BloodType?
  ...
}

model CheckIn {
  id: String (UUID)
  userId: String
  type: CheckInType (BLOOD_PRESSURE | BLOOD_SUGAR | MEDICATION | EXERCISE | DIET | PHYSIOTHERAPY)
  checkInDate: DateTime
  data: Json
  pointsEarned: Int
  ...
}

model RiskAssessment {
  id: String (UUID)
  userId: String
  type: RiskType (DIABETES | STROKE)
  riskLevel: RiskLevel (LOW | MEDIUM | HIGH)
  score: Float
  ...
}
```

**前端 TypeScript 类型定义**:

```typescript
// frontend-patient/src/types/user.ts
interface User {
  id: string;
  username: string;
  email: string;
  phone: string;
  role: 'PATIENT' | 'DOCTOR' | 'HEALTH_MANAGER' | 'ADMIN';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  ...
}

// frontend-patient/src/types/health.ts
interface HealthRecord {
  id: string;
  userId: string;
  height?: number;
  weight?: number;
  bloodType?: 'A' | 'B' | 'AB' | 'O' | 'UNKNOWN';
  ...
}

interface CheckIn {
  id: string;
  userId: string;
  type: 'BLOOD_PRESSURE' | 'BLOOD_SUGAR' | 'MEDICATION' | 'EXERCISE' | 'DIET' | 'PHYSIOTHERAPY';
  checkInDate: string;
  data: any;
  pointsEarned: number;
  ...
}
```

**审查清单**:

- [ ] 前端类型定义的字段名称是否与后端一致
- [ ] 前端类型定义的字段类型是否与后端一致
- [ ] 枚举值是否在前后端保持一致
- [ ] 日期时间格式是否统一（ISO 8601）
- [ ] 可选字段（?）是否在前后端保持一致

---

### 3. 认证授权流程

**JWT Token 流程**:

```
1. 用户登录 → POST /api/v1/auth/login
2. 后端验证 → 生成 JWT Token (Access Token 15分钟, Refresh Token 7天)
3. 前端存储 → localStorage/sessionStorage
4. 前端调用 API → 附加 Authorization: Bearer <token>
5. 后端验证 Token → 解析用户信息
6. AI 服务调用 → 透传 Token（如果需要）
```

**RBAC 权限定义**:

```typescript
enum Permission {
  // 健康数据权限
  VIEW_OWN_HEALTH_DATA = 'view_own_health_data',
  VIEW_PATIENT_HEALTH_DATA = 'view_patient_health_data',
  EDIT_OWN_HEALTH_DATA = 'edit_own_health_data',

  // 用户管理权限
  MANAGE_USERS = 'manage_users',

  // AI 功能权限
  USE_AI_CHAT = 'use_ai_chat',
  USE_AI_DIAGNOSIS = 'use_ai_diagnosis',

  // 数据分析权限
  VIEW_ANALYTICS = 'view_analytics',
  EXPORT_DATA = 'export_data',

  // 系统配置权限
  MANAGE_SYSTEM_CONFIG = 'manage_system_config',
}

const rolePermissions = {
  PATIENT: [VIEW_OWN_HEALTH_DATA, EDIT_OWN_HEALTH_DATA, USE_AI_CHAT],
  DOCTOR: [VIEW_PATIENT_HEALTH_DATA, USE_AI_DIAGNOSIS, VIEW_ANALYTICS],
  HEALTH_MANAGER: [VIEW_PATIENT_HEALTH_DATA, USE_AI_DIAGNOSIS, VIEW_ANALYTICS, EXPORT_DATA],
  ADMIN: [ALL_PERMISSIONS],
};
```

**审查清单**:

- [ ] Token 过期时间是否合理
- [ ] Token 刷新机制是否正确实现
- [ ] 前端是否正确附加 Token 到请求头
- [ ] 后端是否正确验证 Token
- [ ] AI 服务是否正确验证 Token（如果需要）
- [ ] 权限检查是否在前后端都实现
- [ ] 权限不足时的错误处理是否正确

---

### 4. 错误处理

**统一错误响应格式** (design.md 5.2):

```typescript
interface ErrorResponse {
  success: false;
  message: string; // 用户友好的错误消息
  error?: string; // 错误代码（可选）
  statusCode: number; // HTTP 状态码
  timestamp?: string; // 时间戳（可选）
  path?: string; // 请求路径（可选）
}
```

**常见错误码**:

```
400 Bad Request - 请求参数错误
401 Unauthorized - 未认证
403 Forbidden - 权限不足
404 Not Found - 资源不存在
409 Conflict - 资源冲突（如重复打卡）
500 Internal Server Error - 服务器错误
503 Service Unavailable - 服务不可用（如 AI 服务离线）
```

**审查清单**:

- [ ] 所有服务是否使用统一的错误响应格式
- [ ] 错误消息是否用户友好（中文）
- [ ] 错误码是否有文档说明
- [ ] 前端是否正确处理各类错误
- [ ] 网络错误、超时错误是否有友好提示
- [ ] AI 服务调用失败时的降级处理是否合理

---

### 5. 性能优化

**缓存策略**:

```
Redis 缓存:
- 用户信息: 5分钟 TTL
- 排行榜: 实时更新（Sorted Set）
- AI 回答: 1小时 TTL
- 向量检索结果: 30分钟 TTL

前端缓存:
- Pinia 持久化: localStorage
- API 响应缓存: 根据业务需求
```

**数据库优化**:

```
索引:
- users: role, status, createdAt
- check_ins: userId, type, checkInDate
- risk_assessments: userId, type, riskLevel
- points_transactions: userId, createdAt

查询优化:
- 分页查询: 默认 20 条/页
- 批量查询: 使用 IN 查询避免 N+1
- 聚合查询: 使用 Prisma groupBy
```

**审查清单**:

- [ ] 缓存 Key 命名是否规范
- [ ] 缓存过期时间是否合理
- [ ] 缓存失效策略是否正确
- [ ] 数据库索引是否创建
- [ ] 是否有 N+1 查询问题
- [ ] 分页查询是否正确实现
- [ ] API 响应时间是否满足要求（< 1秒）

---

## 审查输出

请 @architect 完成审查后，提供以下输出：

### 1. 架构评分

```
总体评分: __/100

细分评分:
- API 契约一致性: __/20
- 数据模型一致性: __/20
- 认证授权: __/20
- 错误处理: __/15
- 性能优化: __/15
- 代码质量: __/10
```

### 2. 发现的问题

**高优先级问题** (必须修复):

- [ ] 问题描述
- [ ] 影响范围
- [ ] 修复建议

**中优先级问题** (建议修复):

- [ ] 问题描述
- [ ] 影响范围
- [ ] 修复建议

**低优先级问题** (可延后):

- [ ] 问题描述
- [ ] 影响范围
- [ ] 修复建议

### 3. 合并建议

- [ ] ✅ 可以合并（无阻塞问题）
- [ ] ⚠️ 可以合并（有非阻塞问题，需后续修复）
- [ ] ❌ 不建议合并（有阻塞问题，必须先修复）

### 4. 后续改进建议

---

**审查截止时间**: 2025-12-31 18:00
**审查报告输出**: `docs/reports/ARCHITECTURE-REVIEW-REPORT.md`
