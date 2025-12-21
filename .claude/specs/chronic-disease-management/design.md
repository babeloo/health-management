# 智慧慢病管理系统设计文档

## 1. 概述

### 1.1 设计目标

本系统旨在构建一个深度融合AI大模型（DeepSeek等）的智慧慢病管理平台，实现"院内+院外"、"线上+线下"一体化服务。系统支持患者、医生、健康管理师三端应用和管理后台，提供健康档案管理、智能打卡、风险评估、AI健康助手、多方协作等核心功能。

### 1.2 设计原则

- **模块化设计**：各功能模块高内聚低耦合，便于独立开发和维护
- **可扩展性**：支持多AI模型提供商接入，易于添加新功能
- **高可用性**：关键服务采用冗余设计，确保系统稳定运行
- **安全性优先**：医疗数据加密存储，严格的访问控制和审计
- **性能优化**：缓存策略、异步处理、数据库优化确保响应速度
- **跨平台支持**：Web端、iOS、Android统一架构，代码复用

### 1.3 技术架构演进策略

本系统采用**渐进式演进架构**，分为两个阶段：

#### 阶段一：MVP快速上线方案（3-4个月）
目标：快速验证市场需求，低成本获取早期用户反馈

#### 阶段二：企业级升级方案（6-8个月）
目标：服务大型医疗机构，支持高并发、高可用

---

### 1.3.1 MVP阶段技术栈（第一阶段）

**前端技术栈**：
- **患者端**：Uni-app（Vue 3语法）
  - 编译目标：微信小程序（主要）+ H5 + iOS/Android App
  - UI框架：uni-ui / uView
  - 状态管理：Pinia
- **医生端/管理端**：React 18 + TypeScript + Vite
  - UI框架：Ant Design Pro
  - 状态管理：Zustand
  - 图表：ECharts

**后端技术栈**：
- **主框架**：Node.js 18 + NestJS（TypeScript）
  - 单体架构（模块化设计，预留微服务拆分接口）
- **API标准**：RESTful API
- **数据库**：
  - PostgreSQL 15（主数据库）
  - InfluxDB 2.7（时序数据：血压、血糖等健康指标）
  - Redis 7（缓存、Session、消息队列）
  - Qdrant（向量数据库，RAG知识库）
- **ORM**：Prisma
- **认证授权**：JWT + Passport.js + RBAC
- **实时通信**：Socket.io
- **任务队列**：Bull（基于Redis）
- **文件存储**：MinIO（私有化）/ 阿里云OSS

**AI服务**（独立微服务）：
- **框架**：Python 3.11 + FastAPI
- **大模型**：DeepSeek API
- **AI框架**：LangChain + LlamaIndex
- **向量检索**：Qdrant
- **部署**：独立容器，通过HTTP与主后端通信

**物联网设备接入**：
- **协议**：MQTT
- **Broker**：EMQX（开源版）

**部署方案**：
- **容器化**：Docker + Docker Compose
- **服务器**：单台阿里云ECS（4核8G起步）
- **CI/CD**：GitHub Actions
- **监控**：简化版（Docker日志 + 应用日志）

---

### 1.3.2 企业级阶段技术栈（第二阶段）

**前端技术栈**（复用MVP代码）：
- **患者端**：Uni-app（不变）
- **医生端/管理端**：React（增强）
  - 增加离线缓存、性能优化
  - 引入微前端架构（qiankun）支持多机构定制

**后端技术栈**（架构升级）：
- **核心选型**：Java 17 + Spring Cloud Alibaba
  - 微服务架构（从NestJS平滑迁移）
- **服务注册/配置**：Nacos
- **API网关**：Spring Cloud Gateway + Sentinel（限流熔断）
- **消息中间件**：RocketMQ
- **数据库**：
  - MySQL 8.0（主库，读写分离）
  - InfluxDB（保持）
  - Redis Cluster（集群版）
  - Milvus（向量库升级）
- **分库分表**：ShardingSphere
- **认证授权**：Spring Security + OAuth2 + RBAC
- **文件存储**：对象存储（阿里云OSS / 私有MinIO集群）

**AI服务**（保持不变）：
- Python FastAPI（核心代码复用）
- 增加模型微调能力
- 支持私有化部署DeepSeek模型

**物联网设备**（保持）：
- MQTT + EMQX（升级为企业版）

**部署方案**：
- **编排**：Kubernetes（K8s）
- **服务器**：多台服务器集群（高可用）
- **监控**：Prometheus + Grafana
- **日志**：ELK Stack（Elasticsearch + Logstash + Kibana）
- **链路追踪**：SkyWalking
- **安全**：等保三级合规改造

---

### 1.3.3 架构演进路径对比

| 维度 | MVP阶段 | 企业级阶段 | 迁移策略 |
|------|---------|------------|----------|
| **前端** | Uni-app + React | 同左（复用代码） | ✅ 无需迁移 |
| **后端语言** | Node.js/TypeScript | Java/Spring Cloud | 🔄 重写（接口定义复用） |
| **AI服务** | Python FastAPI | 同左（增强） | ✅ 代码复用 |
| **数据库** | PostgreSQL | MySQL | 🔄 数据迁移 |
| **时序库** | InfluxDB | 同左 | ✅ 无需迁移 |
| **向量库** | Qdrant | Milvus | 🔄 数据迁移 |
| **缓存** | Redis单机 | Redis Cluster | 🔄 配置升级 |
| **部署** | Docker Compose | Kubernetes | 🔄 重新编排 |
| **物联网** | MQTT/EMQX | 同左（企业版） | ✅ 配置升级 |

**关键迁移点**：
- ✅ 绿色：可直接复用，无需修改
- 🔄 黄色：需要迁移，但有工具支持
- ⚠️ 红色：需要重写（无）

---

### 1.3.4 为什么这样设计？

#### MVP阶段选择Node.js的理由：
1. **开发速度快**：前后端统一语言，团队协作成本低
2. **生态丰富**：npm包丰富，快速集成第三方服务
3. **成本低**：单台服务器即可运行，节省初期成本
4. **TypeScript**：类型安全，代码质量有保障
5. **模块化设计**：NestJS天然支持模块化，为微服务拆分做准备

#### 企业级阶段切换Java的理由：
1. **医疗行业标准**：大型医院HIS系统多为Java，对接容易
2. **稳定性验证**：经过大量金融、医疗项目验证
3. **等保合规**：符合等保三级要求，安全方案成熟
4. **团队扩张**：Java工程师市场成熟，易于招聘
5. **生态成熟**：Spring Cloud全家桶，微服务治理完善

#### AI服务始终使用Python的理由：
1. **AI生态无可替代**：LangChain、Transformers等框架只有Python版本成熟
2. **DeepSeek集成**：官方SDK、模型微调工具都是Python优先
3. **独立演进**：AI算法迭代快，Python灵活性更适合快速实验
4. **代码复用**：从MVP到企业版，AI核心代码可100%复用

---

### 1.3.5 平滑迁移保障

为确保从MVP到企业级的平滑过渡，设计时遵循以下原则：

#### 1. 接口标准化
```typescript
// MVP阶段（Node.js）定义的接口
interface HealthCheckInRequest {
  userId: string;
  type: 'blood_pressure' | 'blood_sugar';
  data: {
    systolic?: number;
    diastolic?: number;
    bloodSugar?: number;
  };
  timestamp: Date;
}

// 企业级阶段（Java）保持相同接口定义
// 前端代码无需修改
```

#### 2. 数据库设计前瞻性
```sql
-- MVP阶段建表时就考虑分库分表
CREATE TABLE check_ins (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  -- 预留分片键
  shard_key VARCHAR(50) GENERATED ALWAYS AS (SUBSTRING(user_id::text, 1, 2)) STORED,
  type VARCHAR(50) NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- 为未来分表做准备的索引
  INDEX idx_shard_user (shard_key, user_id, created_at)
);
```

#### 3. AI服务独立部署
```yaml
# AI服务通过独立域名访问
MVP阶段:  http://ai-service:8000
企业版:    http://ai-service:8000  # 相同接口，无需改动

# 前端/后端调用方式不变
POST /ai/chat
POST /ai/health-advice
```

#### 4. 配置外部化
```yaml
# config/database.yml
# MVP和企业版使用相同配置结构，只改连接串
production:
  primary:
    url: ${DATABASE_URL}  # MVP: PostgreSQL / 企业版: MySQL
  timeseries:
    url: ${INFLUXDB_URL}  # 两阶段不变
```

---

### 1.3.6 数据安全（两阶段通用）

无论MVP还是企业级，都必须满足：
- **加密**：AES-256（数据加密）+ TLS 1.3（传输加密）
- **敏感数据**：身份证、病历等字段级加密存储
- **审计日志**：所有健康数据访问记录
- **权限控制**：RBAC基于角色的访问控制

---

## 2. 系统架构演进

### 2.1 MVP阶段架构（第一阶段）

**架构特点**：单体应用 + AI微服务，快速开发，低成本运维

```
┌─────────────────────────────────────────────────────────────────┐
│                         客户端层                                   │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐     │
│  │ 患者端 (Uni-app)│  │ 医生端 (React) │  │ 管理端 (React) │     │
│  │ 微信小程序/H5/App│  │     Web响应式   │  │   后台管理     │     │
│  └────────────────┘  └────────────────┘  └────────────────┘     │
└───────────┬───────────────────┬────────────────┬────────────────┘
            │                   │                │
            └───────────────────┴────────────────┘
                         │
          ┌──────────────▼─────────────────────────────┐
          │           Nginx 反向代理                     │
          │   - SSL终止  - 静态资源  - 负载均衡         │
          └──────────────┬─────────────────────────────┘
                         │
          ┌──────────────▼─────────────────────────────┐
          │          应用服务层（单台服务器）             │
          │                                            │
          │  ┌──────────────────────────────────────┐ │
          │  │   主服务 (NestJS 单体应用)            │ │
          │  │   - 用户模块                         │ │
          │  │   - 健康管理模块                     │ │
          │  │   - 积分模块                         │ │
          │  │   - 通讯模块 (Socket.io)             │ │
          │  │   - 通知模块                         │ │
          │  │   端口: 3000                         │ │
          │  └──────────────────────────────────────┘ │
          │                                            │
          │  ┌──────────────────────────────────────┐ │
          │  │   AI服务 (Python FastAPI)            │ │
          │  │   - DeepSeek API调用                 │ │
          │  │   - RAG知识库检索                    │ │
          │  │   - AI Agent对话                     │ │
          │  │   端口: 8000                         │ │
          │  └──────────────────────────────────────┘ │
          │                                            │
          │  ┌──────────────────────────────────────┐ │
          │  │   EMQX (MQTT Broker)                 │ │
          │  │   - 物联网设备接入                   │ │
          │  │   端口: 1883                         │ │
          │  └──────────────────────────────────────┘ │
          └─────────────────────────────────────────────┘
                         │
          ┌──────────────▼─────────────────────────────┐
          │              数据层（同一服务器）            │
          │  ┌────────────┐  ┌──────────┐  ┌────────┐ │
          │  │ PostgreSQL │  │ InfluxDB │  │ Qdrant │ │
          │  │   主数据库  │  │  时序库   │  │ 向量库 │ │
          │  │   端口5432  │  │  端口8086 │  │端口6333│ │
          │  └────────────┘  └──────────┘  └────────┘ │
          │  ┌────────────┐  ┌──────────┐             │
          │  │   Redis    │  │  MinIO   │             │
          │  │  缓存/队列  │  │ 对象存储 │             │
          │  │  端口6379   │  │ 端口9000 │             │
          │  └────────────┘  └──────────┘             │
          └─────────────────────────────────────────────┘
                         │
          ┌──────────────▼─────────────────────────────┐
          │            外部服务层                        │
          │  ┌──────────┐  ┌──────────┐               │
          │  │DeepSeek  │  │ 短信推送 │               │
          │  │  API     │  │ (阿里云) │               │
          │  └──────────┘  └──────────┘               │
          └─────────────────────────────────────────────┘

💰 成本预估：
- 服务器：阿里云ECS 4核8G (约¥200/月)
- 数据库：自建 (包含在服务器费用中)
- 对象存储：MinIO自建 (约¥50/月)
- AI调用：DeepSeek API (按量付费，约¥500/月)
- 总计：约¥800-1000/月

👥 团队配置：
- 2前端 + 2后端 + 1AI工程师 = 5人
```

---

### 2.2 企业级架构（第二阶段）

**架构特点**：微服务集群 + 高可用 + 等保三级合规

```
┌─────────────────────────────────────────────────────────────────┐
│                         客户端层                                   │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐     │
│  │ 患者端 (Uni-app)│  │ 医生端 (React) │  │ 管理端 (React) │     │
│  │   复用MVP代码   │  │  微前端增强版   │  │  微前端增强版   │     │
│  └────────────────┘  └────────────────┘  └────────────────┘     │
└───────────┬───────────────────┬────────────────┬────────────────┘
            │                   │                │
            └───────────────────┴────────────────┘
                         │
          ┌──────────────▼─────────────────────────────┐
          │    API网关集群 (Spring Cloud Gateway)       │
          │    - 路由  - 限流  - 熔断  - 鉴权           │
          │    - Sentinel流量控制                      │
          └──────────────┬─────────────────────────────┘
                         │
          ┌──────────────▼─────────────────────────────┐
          │          微服务集群 (Kubernetes)             │
          │                                            │
          │  ┌────────┐  ┌────────┐  ┌────────┐       │
          │  │用户服务│  │健康服务│  │AI服务  │       │
          │  │Java 3实│  │Java 3实│  │Python  │       │
          │  │例(Pod) │  │例(Pod) │  │2实例   │       │
          │  └────────┘  └────────┘  └────────┘       │
          │                                            │
          │  ┌────────┐  ┌────────┐  ┌────────┐       │
          │  │通讯服务│  │积分服务│  │通知服务│       │
          │  │Java 2实│  │Java 2实│  │Java 2实│       │
          │  │例      │  │例      │  │例      │       │
          │  └────────┘  └────────┘  └────────┘       │
          │                                            │
          │  ┌────────────────────────────────────┐   │
          │  │  Nacos (服务注册/配置中心)          │   │
          │  │  RocketMQ (消息队列)                │   │
          │  │  SkyWalking (链路追踪)              │   │
          │  └────────────────────────────────────┘   │
          └─────────────────────────────────────────────┘
                         │
          ┌──────────────▼─────────────────────────────┐
          │              数据层（多服务器集群）           │
          │  ┌──────────────────────────────────────┐  │
          │  │  MySQL主从集群 (读写分离)             │  │
          │  │  - 主库1台 + 从库2台                  │  │
          │  │  - ShardingSphere分库分表            │  │
          │  └──────────────────────────────────────┘  │
          │  ┌──────────────────────────────────────┐  │
          │  │  Redis Cluster (6节点)               │  │
          │  └──────────────────────────────────────┘  │
          │  ┌──────────────────────────────────────┐  │
          │  │  InfluxDB (保持不变)                  │  │
          │  └──────────────────────────────────────┘  │
          │  ┌──────────────────────────────────────┐  │
          │  │  Milvus 向量库集群                    │  │
          │  └──────────────────────────────────────┘  │
          └─────────────────────────────────────────────┘
                         │
          ┌──────────────▼─────────────────────────────┐
          │        监控与运维层                          │
          │  Prometheus + Grafana (监控)               │
          │  ELK Stack (日志)                          │
          │  SkyWalking (链路追踪)                     │
          └─────────────────────────────────────────────┘

💰 成本预估：
- 服务器集群：10台ECS (约¥2000/月)
- RDS数据库：MySQL读写分离 (约¥1500/月)
- Redis集群：阿里云版 (约¥800/月)
- 对象存储：OSS (约¥300/月)
- K8s托管：ACK (约¥500/月)
- AI调用：DeepSeek (约¥2000/月)
- 监控日志：约¥500/月
- 总计：约¥7500-8500/月

👥 团队配置：
- 3前端 + 5后端 + 2AI + 1DevOps = 11人
```

---

### 2.3 架构演进对比总结

| 对比维度 | MVP阶段 | 企业级阶段 |
|---------|---------|-----------|
| **并发能力** | 支持1000人同时在线 | 支持10万+人同时在线 |
| **可用性** | 单点故障风险 | 99.9%可用性保证 |
| **数据容量** | 支持10万条记录 | 支持亿级记录，分库分表 |
| **开发周期** | 3-4个月上线 | 6-8个月完成迁移 |
| **月成本** | ¥800-1000 | ¥7500-8500 |
| **团队规模** | 5人 | 11人 |
| **扩展性** | 垂直扩展（升级服务器） | 水平扩展（增加节点） |
| **合规性** | 基础安全 | 等保三级认证 |

### 2.2 微服务划分

#### 2.2.1 用户服务（User Service）
- **职责**：用户认证、授权、角色管理、个人信息管理
- **端口**：3001
- **数据库**：PostgreSQL（users, roles, permissions表）
- **关键接口**：
  - `POST /auth/register` - 用户注册
  - `POST /auth/login` - 用户登录
  - `GET /users/:id` - 获取用户信息
  - `PUT /users/:id` - 更新用户信息

#### 2.2.2 健康服务（Health Service）
- **职责**：健康档案、打卡记录、风险评估、健康数据分析
- **端口**：3002
- **数据库**：PostgreSQL（health_records, check_ins, assessments表）
- **关键接口**：
  - `POST /health/records` - 创建健康档案
  - `POST /health/check-ins` - 提交打卡数据
  - `POST /health/assessments` - 进行风险评估
  - `GET /health/records/:userId` - 获取用户健康档案
  - `GET /health/check-ins/:userId/trends` - 获取打卡趋势

#### 2.2.3 AI服务（AI Service）
- **职责**：AI模型集成、健康科普、智能对话、辅助诊断
- **端口**：3003
- **数据库**：MongoDB（ai_conversations, ai_logs表）+ Qdrant（向量检索）
- **关键接口**：
  - `POST /ai/chat` - AI对话
  - `POST /ai/health-advice` - 健康建议生成
  - `POST /ai/diagnosis-assist` - 辅助诊断
  - `GET /ai/popular-science` - 科普内容推荐
  - `POST /ai/config` - 配置AI模型参数

#### 2.2.4 通讯服务（Communication Service）
- **职责**：即时通讯、医患沟通、师患沟通、消息通知
- **端口**：3004
- **数据库**：MongoDB（messages表）+ Redis（在线状态）
- **技术**：Socket.io（WebSocket实时通信）
- **关键接口**：
  - `WebSocket /chat` - 实时聊天连接
  - `GET /messages/:conversationId` - 获取聊天记录
  - `POST /messages/send` - 发送消息
  - `GET /conversations/:userId` - 获取会话列表

#### 2.2.5 积分服务（Points Service）
- **职责**：积分计算、积分交易、礼品兑换、排行榜
- **端口**：3005
- **数据库**：PostgreSQL（points_transactions, gifts表）+ Redis（排行榜缓存）
- **关键接口**：
  - `POST /points/earn` - 获得积分
  - `POST /points/redeem` - 积分兑换
  - `GET /points/balance/:userId` - 查询积分余额
  - `GET /points/leaderboard` - 获取排行榜

#### 2.2.6 通知服务（Notification Service）
- **职责**：推送通知、短信提醒、邮件提醒、任务调度
- **端口**：3006
- **数据库**：PostgreSQL（notifications表）+ Redis（任务队列）
- **技术**：Bull队列、FCM/APNs（移动推送）
- **关键接口**：
  - `POST /notifications/push` - 发送推送通知
  - `POST /notifications/schedule` - 定时提醒
  - `GET /notifications/:userId` - 获取通知列表
  - `PUT /notifications/:id/read` - 标记已读

#### 2.2.7 数据分析服务（Analytics Service）
- **职责**：数据统计、可视化、报表生成
- **端口**：3007
- **数据库**：PostgreSQL（读副本）+ Redis（缓存）
- **关键接口**：
  - `GET /analytics/dashboard` - 仪表盘数据
  - `GET /analytics/patient-stats` - 患者统计
  - `POST /analytics/export` - 导出报表

### 2.3 数据流架构

#### 2.3.1 用户打卡流程
```
患者App → API网关 → 健康服务 → PostgreSQL
                  ↓
              积分服务 → Redis更新积分
                  ↓
              通知服务 → 推送打卡成功通知
```

#### 2.3.2 AI对话流程
```
患者端 → API网关 → AI服务 → DeepSeek API
                          ↓
                    向量数据库检索上下文
                          ↓
                    MongoDB保存对话历史
                          ↓
              返回AI回复 → 患者端
```

#### 2.3.3 风险评估与预警流程
```
定时任务 → 健康服务读取患者数据
              ↓
          AI服务分析预测
              ↓
         检测到高风险
              ↓
      通知服务 → 推送给患者/医生/管理师
```

---

## 3. 核心组件与接口

### 3.1 认证授权组件

#### 3.1.1 JWT认证流程
```typescript
// 登录流程
1. 用户提交账号密码
2. 用户服务验证凭据
3. 生成JWT Token（包含用户ID、角色、过期时间）
4. 返回Access Token（15分钟过期）和Refresh Token（7天过期）
5. 客户端存储Token，后续请求携带Authorization Header
6. API网关验证Token，提取用户信息
7. 通过后转发到业务服务

// Token结构
{
  "sub": "user_id",
  "role": "patient" | "doctor" | "health_manager" | "admin",
  "permissions": ["read:health", "write:health"],
  "iat": 1234567890,
  "exp": 1234567890
}
```

#### 3.1.2 RBAC权限模型
```typescript
// 角色定义
enum Role {
  PATIENT = 'patient',           // 患者
  DOCTOR = 'doctor',             // 医生
  HEALTH_MANAGER = 'health_manager', // 健康管理师
  ADMIN = 'admin'                // 管理员
}

// 权限定义
enum Permission {
  // 健康数据
  READ_OWN_HEALTH = 'read:own_health',
  WRITE_OWN_HEALTH = 'write:own_health',
  READ_PATIENT_HEALTH = 'read:patient_health',

  // 用户管理
  MANAGE_PATIENTS = 'manage:patients',
  MANAGE_USERS = 'manage:users',

  // AI功能
  USE_AI_CHAT = 'use:ai_chat',
  ACCESS_AI_DIAGNOSIS = 'access:ai_diagnosis',

  // 系统配置
  CONFIGURE_SYSTEM = 'configure:system',
  VIEW_ANALYTICS = 'view:analytics'
}

// 角色权限映射
const rolePermissions = {
  [Role.PATIENT]: [
    Permission.READ_OWN_HEALTH,
    Permission.WRITE_OWN_HEALTH,
    Permission.USE_AI_CHAT
  ],
  [Role.DOCTOR]: [
    Permission.READ_PATIENT_HEALTH,
    Permission.MANAGE_PATIENTS,
    Permission.ACCESS_AI_DIAGNOSIS
  ],
  [Role.HEALTH_MANAGER]: [
    Permission.READ_PATIENT_HEALTH,
    Permission.MANAGE_PATIENTS,
    Permission.USE_AI_CHAT
  ],
  [Role.ADMIN]: Object.values(Permission) // 所有权限
}
```

### 3.2 AI集成组件

#### 3.2.1 AI服务适配器模式
```typescript
// AI Provider抽象接口
interface AIProvider {
  chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse>;
  embeddings(text: string): Promise<number[]>;
  healthAdvice(patientData: PatientData): Promise<HealthAdvice>;
}

// DeepSeek实现
class DeepSeekProvider implements AIProvider {
  private apiKey: string;
  private baseURL: string;

  async chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse> {
    const response = await axios.post(`${this.baseURL}/chat/completions`, {
      model: options?.model || 'deepseek-chat',
      messages,
      temperature: options?.temperature || 0.7,
      max_tokens: options?.maxTokens || 2000
    }, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });

    return {
      content: response.data.choices[0].message.content,
      usage: response.data.usage
    };
  }

  async healthAdvice(patientData: PatientData): Promise<HealthAdvice> {
    // 构建健康建议提示词
    const prompt = this.buildHealthAdvicePrompt(patientData);
    const response = await this.chat([{ role: 'user', content: prompt }]);
    return this.parseHealthAdvice(response.content);
  }
}

// 多模型管理器
class AIModelManager {
  private providers: Map<string, AIProvider> = new Map();

  registerProvider(name: string, provider: AIProvider) {
    this.providers.set(name, provider);
  }

  getProvider(name: string): AIProvider {
    return this.providers.get(name) || this.providers.get('default');
  }
}
```

#### 3.2.2 RAG（检索增强生成）架构
```typescript
// 知识库检索组件
class HealthKnowledgeBase {
  private vectorDB: QdrantClient;
  private collectionName = 'health_knowledge';

  // 添加科普文档
  async addDocument(doc: HealthDocument): Promise<void> {
    const embedding = await aiProvider.embeddings(doc.content);
    await this.vectorDB.upsert(this.collectionName, {
      id: doc.id,
      vector: embedding,
      payload: {
        title: doc.title,
        content: doc.content,
        category: doc.category,
        tags: doc.tags
      }
    });
  }

  // 检索相关知识
  async search(query: string, limit = 3): Promise<HealthDocument[]> {
    const queryEmbedding = await aiProvider.embeddings(query);
    const results = await this.vectorDB.search(this.collectionName, {
      vector: queryEmbedding,
      limit
    });

    return results.map(r => r.payload as HealthDocument);
  }
}

// AI健康科普服务
class HealthEducationService {
  async answerQuestion(question: string, patientContext?: PatientData): Promise<string> {
    // 1. 检索相关知识
    const relevantDocs = await knowledgeBase.search(question);

    // 2. 构建增强提示词
    const context = relevantDocs.map(d => d.content).join('\n\n');
    const prompt = `
      基于以下医学知识回答患者问题：

      知识库内容：
      ${context}

      患者问题：${question}

      ${patientContext ? `患者背景：${JSON.stringify(patientContext)}` : ''}

      请用通俗易懂的语言回答，并在最后提醒患者"此建议仅供参考，请咨询专业医生"。
    `;

    // 3. 调用AI生成回答
    const response = await aiProvider.chat([
      { role: 'system', content: '你是一个专业的健康科普助手' },
      { role: 'user', content: prompt }
    ]);

    return response.content;
  }
}
```

#### 3.2.3 AI Agent对话管理
```typescript
// 对话状态管理
interface ConversationState {
  conversationId: string;
  userId: string;
  messages: Message[];
  context: {
    currentTask?: 'check_in' | 'health_question' | 'symptom_report';
    pendingData?: Record<string, any>;
  };
}

// AI Agent控制器
class AIAgentController {
  private conversations: Map<string, ConversationState> = new Map();

  async handleMessage(userId: string, message: string): Promise<string> {
    // 1. 获取或创建对话状态
    let conversation = this.conversations.get(userId);
    if (!conversation) {
      conversation = this.createConversation(userId);
    }

    // 2. 添加用户消息
    conversation.messages.push({ role: 'user', content: message });

    // 3. 意图识别
    const intent = await this.detectIntent(message);

    // 4. 根据意图处理
    let response: string;
    switch (intent.type) {
      case 'check_in':
        response = await this.handleCheckIn(conversation, intent.data);
        break;
      case 'health_question':
        response = await healthEducationService.answerQuestion(message);
        break;
      case 'symptom_report':
        response = await this.handleSymptomReport(conversation, intent.data);
        break;
      default:
        response = await this.chatWithAI(conversation);
    }

    // 5. 保存对话历史
    conversation.messages.push({ role: 'assistant', content: response });
    await this.saveConversation(conversation);

    return response;
  }

  private async detectIntent(message: string): Promise<Intent> {
    // 使用AI进行意图识别
    const prompt = `
      分析用户消息的意图，返回JSON格式：
      {"type": "check_in|health_question|symptom_report|chat", "data": {...}}

      用户消息：${message}
    `;

    const response = await aiProvider.chat([
      { role: 'system', content: '你是意图识别助手' },
      { role: 'user', content: prompt }
    ], { temperature: 0.1 });

    return JSON.parse(response.content);
  }

  private async handleCheckIn(conversation: ConversationState, data: any): Promise<string> {
    // 协助用户完成打卡
    if (!data.bloodPressure) {
      return '请告诉我您今天的血压数值（例如：120/80）';
    }

    // 保存打卡数据
    await healthService.createCheckIn({
      userId: conversation.userId,
      type: 'blood_pressure',
      value: data.bloodPressure,
      timestamp: new Date()
    });

    return '血压打卡成功！您获得了10积分。请问还需要记录其他健康数据吗？';
  }
}
```

### 3.3 实时通信组件

#### 3.3.1 WebSocket架构
```typescript
// Socket.io服务端
class ChatSocketServer {
  private io: Server;

  initialize(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: { origin: '*' },
      transports: ['websocket', 'polling']
    });

    // 认证中间件
    this.io.use(async (socket, next) => {
      const token = socket.handshake.auth.token;
      try {
        const user = await verifyToken(token);
        socket.data.user = user;
        next();
      } catch (err) {
        next(new Error('Authentication failed'));
      }
    });

    // 连接处理
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });
  }

  private handleConnection(socket: Socket) {
    const userId = socket.data.user.id;

    // 加入用户专属房间
    socket.join(`user:${userId}`);

    // 更新在线状态
    redisClient.hset('online_users', userId, Date.now());

    // 监听消息发送
    socket.on('send_message', async (data) => {
      await this.handleSendMessage(socket, data);
    });

    // 断开连接
    socket.on('disconnect', () => {
      redisClient.hdel('online_users', userId);
    });
  }

  private async handleSendMessage(socket: Socket, data: MessageData) {
    const { recipientId, content, type } = data;
    const senderId = socket.data.user.id;

    // 保存消息到数据库
    const message = await messageRepository.create({
      senderId,
      recipientId,
      content,
      type,
      timestamp: new Date()
    });

    // 实时推送给接收者
    this.io.to(`user:${recipientId}`).emit('new_message', message);

    // 发送通知
    await notificationService.pushNotification(recipientId, {
      title: '新消息',
      body: content,
      data: { messageId: message.id }
    });
  }
}
```

### 3.4 文件存储组件

#### 3.4.1 OSS存储服务
```typescript
class FileStorageService {
  private ossClient: OSS;
  private bucketName = 'health-mgmt';

  async uploadHealthDocument(
    file: Buffer,
    userId: string,
    fileName: string
  ): Promise<string> {
    // 生成唯一文件名
    const fileExt = path.extname(fileName);
    const uniqueName = `health_docs/${userId}/${Date.now()}${fileExt}`;

    // 上传到OSS
    await this.ossClient.put(uniqueName, file, {
      headers: {
        'Content-Type': this.getContentType(fileExt),
        'x-oss-object-acl': 'private' // 私有访问
      }
    });

    // 返回访问URL（带签名，1小时过期）
    const url = this.ossClient.signatureUrl(uniqueName, {
      expires: 3600
    });

    return url;
  }

  async getSignedUrl(filePath: string): Promise<string> {
    return this.ossClient.signatureUrl(filePath, { expires: 3600 });
  }
}
```

---

## 4. 数据模型

### 4.1 核心数据表设计

#### 4.1.1 用户表（users）
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(100) UNIQUE,
  phone VARCHAR(20) UNIQUE,
  role VARCHAR(20) NOT NULL, -- patient, doctor, health_manager, admin

  -- 个人信息
  full_name VARCHAR(100),
  gender VARCHAR(10),
  birth_date DATE,
  id_card_encrypted TEXT, -- 加密存储身份证号
  avatar_url TEXT,

  -- 状态
  status VARCHAR(20) DEFAULT 'active', -- active, inactive, banned
  email_verified BOOLEAN DEFAULT false,
  phone_verified BOOLEAN DEFAULT false,

  -- 时间戳
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP,

  -- 索引
  INDEX idx_role (role),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);
```

#### 4.1.2 健康档案表（health_records）
```sql
CREATE TABLE health_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- 基础信息
  height DECIMAL(5,2), -- 身高(cm)
  weight DECIMAL(5,2), -- 体重(kg)
  blood_type VARCHAR(5), -- 血型

  -- 病史
  chronic_diseases JSONB, -- [{name: '高血压', diagnosedAt: '2020-01-01'}]
  allergies JSONB, -- ['青霉素', '花生']
  family_history JSONB, -- 家族病史

  -- 医疗文档
  documents JSONB, -- [{type: 'report', url: '...', uploadedAt: '...'}]

  -- 时间戳
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- 索引
  INDEX idx_user_id (user_id)
);
```

#### 4.1.3 打卡记录表（check_ins）
```sql
CREATE TABLE check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- 打卡类型
  type VARCHAR(50) NOT NULL, -- blood_pressure, blood_sugar, medication, exercise, diet, therapy

  -- 打卡数据（JSON格式存储不同类型的数据）
  data JSONB NOT NULL,
  -- 示例：
  -- 血压: {systolic: 120, diastolic: 80, pulse: 72}
  -- 血糖: {value: 5.5, timing: 'before_meal'}
  -- 用药: {medication: '阿司匹林', dosage: '100mg', taken: true}
  -- 运动: {type: '跑步', duration: 30, intensity: 'moderate'}
  -- 饮食: {meal: '早餐', items: ['燕麦', '鸡蛋'], calories: 350}

  -- 备注
  notes TEXT,

  -- 积分奖励
  points_earned INT DEFAULT 0,

  -- 时间
  check_in_date DATE NOT NULL, -- 打卡日期
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- 索引
  INDEX idx_user_date (user_id, check_in_date),
  INDEX idx_type (type),
  INDEX idx_created_at (created_at),

  -- 唯一约束：每天每种类型只能打卡一次
  UNIQUE (user_id, type, check_in_date)
);
```

#### 4.1.4 风险评估表（risk_assessments）
```sql
CREATE TABLE risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- 评估类型
  type VARCHAR(50) NOT NULL, -- diabetes, stroke, vascular_age, heart_disease

  -- 评估数据
  questionnaire_data JSONB, -- 问卷回答
  device_data JSONB, -- 设备检测数据

  -- 评估结果
  risk_level VARCHAR(20) NOT NULL, -- low, medium, high
  risk_score DECIMAL(5,2), -- 风险分数(0-100)
  result_details JSONB, -- 详细结果

  -- AI建议
  ai_recommendations TEXT,

  -- 时间
  assessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- 索引
  INDEX idx_user_type (user_id, type),
  INDEX idx_risk_level (risk_level),
  INDEX idx_assessed_at (assessed_at)
);
```

#### 4.1.5 积分交易表（points_transactions）
```sql
CREATE TABLE points_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- 交易类型
  type VARCHAR(20) NOT NULL, -- earn, redeem, bonus, penalty

  -- 积分变化
  points INT NOT NULL, -- 正数为获得，负数为消费

  -- 来源/用途
  source VARCHAR(50), -- check_in, continuous_streak, gift_redemption
  source_id UUID, -- 关联ID（打卡ID、礼品ID等）

  -- 描述
  description TEXT,

  -- 时间
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- 索引
  INDEX idx_user_created (user_id, created_at),
  INDEX idx_type (type)
);

-- 积分余额视图
CREATE VIEW user_points_balance AS
SELECT
  user_id,
  SUM(points) as balance
FROM points_transactions
GROUP BY user_id;
```

#### 4.1.6 医患关系表（doctor_patient_relations）
```sql
CREATE TABLE doctor_patient_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES users(id),
  patient_id UUID NOT NULL REFERENCES users(id),

  -- 关系状态
  status VARCHAR(20) DEFAULT 'active', -- active, inactive

  -- 备注
  notes TEXT,

  -- 时间
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- 索引
  INDEX idx_doctor (doctor_id),
  INDEX idx_patient (patient_id),
  UNIQUE (doctor_id, patient_id)
);
```

#### 4.1.7 健康管理师会员关系表（manager_member_relations）
```sql
CREATE TABLE manager_member_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID NOT NULL REFERENCES users(id),
  member_id UUID NOT NULL REFERENCES users(id),

  -- 会员类型
  membership_type VARCHAR(50), -- basic, premium, vip

  -- 管理时长统计
  service_count INT DEFAULT 0,
  total_service_hours DECIMAL(10,2) DEFAULT 0,

  -- 状态
  status VARCHAR(20) DEFAULT 'active',

  -- 时间
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,

  -- 索引
  INDEX idx_manager (manager_id),
  INDEX idx_member (member_id),
  UNIQUE (manager_id, member_id)
);
```

#### 4.1.8 消息表（messages - MongoDB）
```javascript
// MongoDB集合结构
{
  _id: ObjectId,
  conversationId: String, // 会话ID
  senderId: String, // 发送者UUID
  recipientId: String, // 接收者UUID

  // 消息内容
  type: String, // text, image, voice, video, file
  content: String, // 文本内容或文件URL
  metadata: {
    fileName: String,
    fileSize: Number,
    duration: Number // 语音/视频时长
  },

  // 状态
  status: String, // sent, delivered, read
  readAt: Date,

  // 时间
  createdAt: Date,

  // 索引
  indexes: [
    { conversationId: 1, createdAt: -1 },
    { senderId: 1, createdAt: -1 },
    { recipientId: 1, status: 1 }
  ]
}
```

#### 4.1.9 AI对话历史表（ai_conversations - MongoDB）
```javascript
{
  _id: ObjectId,
  userId: String,
  conversationId: String,

  // 对话消息
  messages: [
    {
      role: String, // user, assistant, system
      content: String,
      timestamp: Date
    }
  ],

  // 上下文
  context: {
    task: String, // check_in, health_question, symptom_report
    pendingData: Object
  },

  // 元数据
  metadata: {
    modelUsed: String, // deepseek-chat
    totalTokens: Number,
    cost: Number
  },

  // 时间
  createdAt: Date,
  updatedAt: Date,

  indexes: [
    { userId: 1, createdAt: -1 },
    { conversationId: 1 }
  ]
}
```

### 4.2 数据关系图

```mermaid
erDiagram
    users ||--o{ health_records : "has"
    users ||--o{ check_ins : "creates"
    users ||--o{ risk_assessments : "takes"
    users ||--o{ points_transactions : "earns/spends"
    users ||--o{ doctor_patient_relations : "participates"
    users ||--o{ manager_member_relations : "participates"

    users {
        uuid id PK
        string username
        string role
        string full_name
        timestamp created_at
    }

    health_records {
        uuid id PK
        uuid user_id FK
        decimal height
        decimal weight
        jsonb chronic_diseases
    }

    check_ins {
        uuid id PK
        uuid user_id FK
        string type
        jsonb data
        date check_in_date
    }

    risk_assessments {
        uuid id PK
        uuid user_id FK
        string type
        string risk_level
        decimal risk_score
    }
```

---

## 5. 错误处理

### 5.1 错误分类与编码

```typescript
// 错误代码规范
enum ErrorCode {
  // 1xxx - 认证授权错误
  UNAUTHORIZED = 1001,
  FORBIDDEN = 1002,
  TOKEN_EXPIRED = 1003,
  INVALID_CREDENTIALS = 1004,

  // 2xxx - 业务逻辑错误
  RESOURCE_NOT_FOUND = 2001,
  DUPLICATE_RESOURCE = 2002,
  INVALID_INPUT = 2003,
  CHECK_IN_ALREADY_EXISTS = 2004,
  INSUFFICIENT_POINTS = 2005,

  // 3xxx - 外部服务错误
  AI_SERVICE_ERROR = 3001,
  OSS_UPLOAD_FAILED = 3002,
  SMS_SEND_FAILED = 3003,

  // 4xxx - 系统错误
  DATABASE_ERROR = 4001,
  INTERNAL_SERVER_ERROR = 4002,
  SERVICE_UNAVAILABLE = 4003
}

// 统一错误响应格式
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

// 自定义异常类
class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public message: string,
    public statusCode: number = 400,
    public details?: any
  ) {
    super(message);
  }
}
```

### 5.2 全局异常处理器

```typescript
// NestJS全局异常过滤器
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let errorResponse: ErrorResponse;

    if (exception instanceof AppError) {
      // 自定义业务异常
      errorResponse = {
        success: false,
        error: {
          code: exception.code,
          message: exception.message,
          details: exception.details,
          timestamp: new Date().toISOString(),
          requestId: request.id
        }
      };
      response.status(exception.statusCode).json(errorResponse);
    } else if (exception instanceof HttpException) {
      // HTTP异常
      const status = exception.getStatus();
      errorResponse = {
        success: false,
        error: {
          code: this.mapHttpStatusToErrorCode(status),
          message: exception.message,
          timestamp: new Date().toISOString(),
          requestId: request.id
        }
      };
      response.status(status).json(errorResponse);
    } else {
      // 未知异常
      logger.error('Unhandled exception', exception);
      errorResponse = {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          message: '服务器内部错误',
          timestamp: new Date().toISOString(),
          requestId: request.id
        }
      };
      response.status(500).json(errorResponse);
    }
  }
}
```

### 5.3 重试与熔断策略

```typescript
// AI服务调用重试装饰器
function RetryOnFailure(maxRetries = 3, delay = 1000) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      let lastError: Error;

      for (let i = 0; i < maxRetries; i++) {
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          lastError = error;
          if (i < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
          }
        }
      }

      throw new AppError(
        ErrorCode.AI_SERVICE_ERROR,
        `AI服务调用失败，已重试${maxRetries}次`,
        503,
        { originalError: lastError.message }
      );
    };

    return descriptor;
  };
}

// 熔断器实现
class CircuitBreaker {
  private failureCount = 0;
  private successCount = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private nextAttempt: number = Date.now();

  constructor(
    private threshold: number = 5, // 失败阈值
    private timeout: number = 60000 // 熔断超时(ms)
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new AppError(
          ErrorCode.SERVICE_UNAVAILABLE,
          '服务暂时不可用，请稍后重试',
          503
        );
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
    }
  }

  private onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
    }
  }
}
```

---

## 6. 测试策略

### 6.1 测试金字塔

```
           /\
          /  \  E2E测试 (10%)
         /────\  - 关键业务流程端到端测试
        /      \
       /        \ 集成测试 (30%)
      /──────────\ - API接口测试
     /            \ - 数据库集成测试
    /              \ - 外部服务Mock测试
   /────────────────\
  /                  \ 单元测试 (60%)
 /____________________\ - 业务逻辑单元测试
                         - 工具函数测试
```

### 6.2 单元测试示例

```typescript
// 健康打卡服务单元测试
describe('CheckInService', () => {
  let service: CheckInService;
  let repository: CheckInRepository;
  let pointsService: PointsService;

  beforeEach(() => {
    repository = mock<CheckInRepository>();
    pointsService = mock<PointsService>();
    service = new CheckInService(repository, pointsService);
  });

  describe('createCheckIn', () => {
    it('应该成功创建血压打卡记录并发放积分', async () => {
      // Arrange
      const userId = 'user-123';
      const checkInData = {
        type: 'blood_pressure',
        data: { systolic: 120, diastolic: 80 },
        checkInDate: '2025-01-15'
      };

      repository.findByUserAndDate.mockResolvedValue(null);
      repository.create.mockResolvedValue({ id: 'check-in-1', ...checkInData });
      pointsService.earnPoints.mockResolvedValue({ points: 10 });

      // Act
      const result = await service.createCheckIn(userId, checkInData);

      // Assert
      expect(result.id).toBe('check-in-1');
      expect(pointsService.earnPoints).toHaveBeenCalledWith(
        userId,
        10,
        'check_in',
        'check-in-1'
      );
    });

    it('应该在重复打卡时抛出异常', async () => {
      // Arrange
      repository.findByUserAndDate.mockResolvedValue({ id: 'existing' });

      // Act & Assert
      await expect(
        service.createCheckIn('user-123', {
          type: 'blood_pressure',
          data: {},
          checkInDate: '2025-01-15'
        })
      ).rejects.toThrow(AppError);
    });
  });
});
```

### 6.3 集成测试示例

```typescript
// API集成测试
describe('Health API Integration Tests', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    // 登录获取Token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'testuser', password: 'password123' });
    authToken = loginResponse.body.data.accessToken;
  });

  it('POST /health/check-ins 应该创建打卡记录', async () => {
    const response = await request(app.getHttpServer())
      .post('/health/check-ins')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        type: 'blood_pressure',
        data: { systolic: 120, diastolic: 80 },
        checkInDate: '2025-01-15'
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.type).toBe('blood_pressure');
  });

  afterAll(async () => {
    await app.close();
  });
});
```

### 6.4 E2E测试示例

```typescript
// 使用Playwright进行E2E测试
import { test, expect } from '@playwright/test';

test('患者完整打卡流程', async ({ page }) => {
  // 1. 登录
  await page.goto('http://localhost:3000/login');
  await page.fill('[name="username"]', 'patient@test.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/.*dashboard/);

  // 2. 进入打卡页面
  await page.click('text=健康打卡');
  await expect(page.locator('h1')).toContainText('健康打卡');

  // 3. 填写血压数据
  await page.click('text=血压打卡');
  await page.fill('[name="systolic"]', '120');
  await page.fill('[name="diastolic"]', '80');
  await page.click('button:has-text("提交")');

  // 4. 验证成功提示和积分增加
  await expect(page.locator('.success-message')).toContainText('打卡成功');
  await expect(page.locator('.points-display')).toContainText('+10');

  // 5. 验证日历标记
  await page.goto('http://localhost:3000/calendar');
  const todayCell = page.locator('.calendar-cell.today');
  await expect(todayCell.locator('.check-mark')).toBeVisible();
});
```

### 6.5 AI功能测试策略

```typescript
// AI服务Mock测试
describe('AI Health Advice', () => {
  let aiService: AIService;
  let mockProvider: jest.Mocked<AIProvider>;

  beforeEach(() => {
    mockProvider = {
      chat: jest.fn(),
      healthAdvice: jest.fn()
    } as any;

    aiService = new AIService(mockProvider);
  });

  it('应该基于患者数据生成健康建议', async () => {
    // Mock AI响应
    mockProvider.healthAdvice.mockResolvedValue({
      advice: '建议控制饮食，增加运动',
      riskLevel: 'medium',
      actions: ['减少盐分摄入', '每日步行30分钟']
    });

    const patientData = {
      age: 45,
      checkIns: [
        { type: 'blood_pressure', data: { systolic: 145, diastolic: 90 } }
      ]
    };

    const advice = await aiService.generateHealthAdvice(patientData);

    expect(advice.advice).toBeDefined();
    expect(advice.riskLevel).toBe('medium');
    expect(mockProvider.healthAdvice).toHaveBeenCalledWith(patientData);
  });
});

// 真实AI接口测试（仅在特定环境运行）
describe('Real AI Integration', () => {
  if (process.env.RUN_AI_TESTS !== 'true') {
    test.skip('跳过真实AI测试');
    return;
  }

  it('应该从DeepSeek获取真实响应', async () => {
    const provider = new DeepSeekProvider(process.env.DEEPSEEK_API_KEY);
    const response = await provider.chat([
      { role: 'user', content: '高血压患者应该注意什么？' }
    ]);

    expect(response.content).toBeTruthy();
    expect(response.content.length).toBeGreaterThan(50);
  }, 30000); // 30秒超时
});
```

---

## 7. 安全设计

### 7.1 数据加密

```typescript
// 敏感字段加密服务
class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private key: Buffer;

  constructor(secretKey: string) {
    this.key = crypto.scryptSync(secretKey, 'salt', 32);
  }

  encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // 返回格式: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  decrypt(encryptedText: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedText.split(':');

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

// Prisma中间件自动加密解密
prisma.$use(async (params, next) => {
  // 加密敏感字段
  if (params.action === 'create' || params.action === 'update') {
    if (params.model === 'User' && params.args.data.idCard) {
      params.args.data.idCardEncrypted = encryptionService.encrypt(
        params.args.data.idCard
      );
      delete params.args.data.idCard;
    }
  }

  const result = await next(params);

  // 解密敏感字段
  if (params.model === 'User' && result?.idCardEncrypted) {
    result.idCard = encryptionService.decrypt(result.idCardEncrypted);
  }

  return result;
});
```

### 7.2 SQL注入防护

```typescript
// 使用Prisma ORM，自动防止SQL注入
// ✅ 安全的查询
const user = await prisma.user.findUnique({
  where: { id: userId } // 参数化查询
});

// ❌ 避免原始SQL（除非必要）
// const users = await prisma.$queryRaw`SELECT * FROM users WHERE id = ${userId}`;
// 如果必须使用，应使用Prisma.sql模板标签

// ✅ 安全的原始查询
const users = await prisma.$queryRaw`
  SELECT * FROM users WHERE id = ${Prisma.sql`${userId}`}
`;
```

### 7.3 XSS防护

```typescript
// 输入验证与清理
import { sanitizeHtml } from 'sanitize-html';

class InputSanitizer {
  static sanitizeText(input: string): string {
    // 移除HTML标签和脚本
    return sanitizeHtml(input, {
      allowedTags: [], // 不允许任何HTML标签
      allowedAttributes: {}
    });
  }

  static sanitizeRichText(input: string): string {
    // 允许部分安全的HTML标签（如科普文章）
    return sanitizeHtml(input, {
      allowedTags: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li'],
      allowedAttributes: {}
    });
  }
}

// DTO验证
class CreateCheckInDto {
  @IsEnum(['blood_pressure', 'blood_sugar', 'medication', 'exercise', 'diet'])
  type: string;

  @ValidateNested()
  @Type(() => CheckInDataDto)
  data: CheckInDataDto;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => InputSanitizer.sanitizeText(value))
  notes?: string;
}
```

### 7.4 访问控制

```typescript
// 基于RBAC的权限守卫
@Injectable()
export class PermissionsGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<Permission[]>(
      'permissions',
      context.getHandler()
    );

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    const userPermissions = rolePermissions[user.role] || [];

    return requiredPermissions.every(permission =>
      userPermissions.includes(permission)
    );
  }
}

// 使用示例
@Controller('health')
export class HealthController {
  @Get('records/:patientId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(Permission.READ_PATIENT_HEALTH)
  async getPatientRecords(@Param('patientId') patientId: string, @User() user) {
    // 额外检查：医生只能查看自己管理的患者
    if (user.role === Role.DOCTOR) {
      const hasAccess = await this.checkDoctorPatientRelation(user.id, patientId);
      if (!hasAccess) {
        throw new ForbiddenException('无权访问此患者数据');
      }
    }

    return this.healthService.getRecords(patientId);
  }
}
```

### 7.5 审计日志

```typescript
// 审计日志表
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(50) NOT NULL, -- read, create, update, delete
  resource_type VARCHAR(50) NOT NULL, -- health_record, user, etc.
  resource_id UUID,
  ip_address VARCHAR(50),
  user_agent TEXT,
  request_data JSONB,
  response_status INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_user_action (user_id, action, created_at),
  INDEX idx_resource (resource_type, resource_id)
);

// 审计日志中间件
@Injectable()
export class AuditLogMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();

    res.on('finish', async () => {
      if (this.shouldAudit(req)) {
        await auditLogRepository.create({
          userId: req.user?.id,
          action: this.mapMethodToAction(req.method),
          resourceType: this.extractResourceType(req.path),
          resourceId: req.params.id,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          requestData: this.sanitizeRequestData(req.body),
          responseStatus: res.statusCode,
          duration: Date.now() - startTime
        });
      }
    });

    next();
  }

  private shouldAudit(req: Request): boolean {
    // 仅审计敏感操作
    return [
      '/health/records',
      '/users',
      '/ai/diagnosis-assist'
    ].some(path => req.path.includes(path));
  }
}
```

---

## 8. 性能优化

### 8.1 数据库优化

```typescript
// 1. 索引优化
CREATE INDEX CONCURRENTLY idx_check_ins_user_date
ON check_ins(user_id, check_in_date DESC);

CREATE INDEX CONCURRENTLY idx_messages_conversation
ON messages(conversation_id, created_at DESC);

// 2. 查询优化 - 使用分页
async function getCheckInHistory(userId: string, page = 1, limit = 20) {
  const offset = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.checkIn.findMany({
      where: { userId },
      orderBy: { checkInDate: 'desc' },
      take: limit,
      skip: offset
    }),
    prisma.checkIn.count({ where: { userId } })
  ]);

  return { items, total, page, totalPages: Math.ceil(total / limit) };
}

// 3. 批量查询优化
async function getPatientListWithStats(doctorId: string) {
  // 使用单个SQL查询获取统计数据
  const patients = await prisma.$queryRaw`
    SELECT
      u.id, u.full_name, u.avatar_url,
      COUNT(DISTINCT c.id) as check_in_count,
      MAX(c.check_in_date) as last_check_in,
      AVG(CASE WHEN ra.risk_level = 'high' THEN 3
               WHEN ra.risk_level = 'medium' THEN 2
               ELSE 1 END) as avg_risk_score
    FROM users u
    JOIN doctor_patient_relations dpr ON u.id = dpr.patient_id
    LEFT JOIN check_ins c ON u.id = c.user_id
      AND c.check_in_date >= NOW() - INTERVAL '30 days'
    LEFT JOIN risk_assessments ra ON u.id = ra.user_id
      AND ra.assessed_at >= NOW() - INTERVAL '90 days'
    WHERE dpr.doctor_id = ${doctorId} AND dpr.status = 'active'
    GROUP BY u.id, u.full_name, u.avatar_url
    ORDER BY avg_risk_score DESC
  `;

  return patients;
}
```

### 8.2 缓存策略

```typescript
// Redis缓存服务
class CacheService {
  // 1. 用户信息缓存（TTL: 1小时）
  async getUserById(userId: string): Promise<User> {
    const cacheKey = `user:${userId}`;

    // 尝试从缓存获取
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // 缓存未命中，从数据库查询
    const user = await prisma.user.findUnique({ where: { id: userId } });

    // 写入缓存
    await redis.setex(cacheKey, 3600, JSON.stringify(user));

    return user;
  }

  // 2. 打卡数据缓存（按天）
  async getCachedCheckIns(userId: string, date: string): Promise<CheckIn[]> {
    const cacheKey = `check_ins:${userId}:${date}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const checkIns = await prisma.checkIn.findMany({
      where: { userId, checkInDate: new Date(date) }
    });

    // 缓存到当天结束
    const ttl = this.getSecondsUntilEndOfDay();
    await redis.setex(cacheKey, ttl, JSON.stringify(checkIns));

    return checkIns;
  }

  // 3. 排行榜缓存（使用Sorted Set）
  async updateLeaderboard(userId: string, points: number): Promise<void> {
    await redis.zadd('leaderboard:points', points, userId);
  }

  async getLeaderboard(limit = 100): Promise<LeaderboardEntry[]> {
    const results = await redis.zrevrange(
      'leaderboard:points',
      0,
      limit - 1,
      'WITHSCORES'
    );

    // 批量获取用户信息
    const userIds = results.filter((_, i) => i % 2 === 0);
    const users = await this.batchGetUsers(userIds);

    return results
      .filter((_, i) => i % 2 === 1)
      .map((points, index) => ({
        rank: index + 1,
        user: users[index],
        points: parseInt(points)
      }));
  }

  // 4. AI对话上下文缓存
  async cacheConversationContext(
    conversationId: string,
    context: any,
    ttl = 1800 // 30分钟
  ): Promise<void> {
    const key = `ai:context:${conversationId}`;
    await redis.setex(key, ttl, JSON.stringify(context));
  }
}
```

### 8.3 异步处理

```typescript
// 使用Bull队列处理耗时任务
@Processor('health-analysis')
export class HealthAnalysisProcessor {
  @Process('risk-prediction')
  async handleRiskPrediction(job: Job) {
    const { userId } = job.data;

    try {
      // 1. 获取患者历史数据
      const healthData = await healthService.getHistoricalData(userId, 90);

      // 2. 调用AI模型预测
      const prediction = await aiService.predictRisk(healthData);

      // 3. 保存预测结果
      await riskAssessmentRepository.create({
        userId,
        type: 'ai_prediction',
        riskLevel: prediction.level,
        riskScore: prediction.score,
        resultDetails: prediction.details
      });

      // 4. 如果高风险，发送通知
      if (prediction.level === 'high') {
        await notificationQueue.add('send-alert', {
          userId,
          type: 'high_risk_warning',
          message: prediction.warning
        });
      }

      return { success: true };
    } catch (error) {
      logger.error('Risk prediction failed', error);
      throw error; // 任务失败会自动重试
    }
  }
}

// 定时任务 - 每日风险分析
@Injectable()
export class HealthScheduler {
  @Cron('0 2 * * *') // 每天凌晨2点执行
  async dailyRiskAnalysis() {
    const activeUsers = await userRepository.findActivePatients();

    // 批量添加任务到队列
    const jobs = activeUsers.map(user => ({
      name: 'risk-prediction',
      data: { userId: user.id }
    }));

    await healthAnalysisQueue.addBulk(jobs);

    logger.info(`Queued ${jobs.length} risk analysis tasks`);
  }
}
```

### 8.4 前端性能优化

```typescript
// 1. React Query数据预取
function PatientListPage() {
  const queryClient = useQueryClient();

  const { data: patients } = useQuery({
    queryKey: ['patients'],
    queryFn: fetchPatients,
    staleTime: 5 * 60 * 1000 // 5分钟内不重新请求
  });

  // 鼠标悬停时预取详情
  const handlePatientHover = (patientId: string) => {
    queryClient.prefetchQuery({
      queryKey: ['patient', patientId],
      queryFn: () => fetchPatientDetails(patientId)
    });
  };

  return (
    <div>
      {patients?.map(patient => (
        <PatientCard
          key={patient.id}
          patient={patient}
          onMouseEnter={() => handlePatientHover(patient.id)}
        />
      ))}
    </div>
  );
}

// 2. 虚拟滚动 - 处理大列表
import { FixedSizeList } from 'react-window';

function CheckInHistoryList({ checkIns }: { checkIns: CheckIn[] }) {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <CheckInItem data={checkIns[index]} />
    </div>
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={checkIns.length}
      itemSize={80}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}

// 3. 代码分割
const DashboardPage = lazy(() => import('./pages/Dashboard'));
const HealthRecordsPage = lazy(() => import('./pages/HealthRecords'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/health" element={<HealthRecordsPage />} />
      </Routes>
    </Suspense>
  );
}

// 4. 图片优化
function PatientAvatar({ url }: { url: string }) {
  return (
    <img
      src={url}
      alt="Avatar"
      loading="lazy"
      srcSet={`
        ${url}?w=100 100w,
        ${url}?w=200 200w,
        ${url}?w=400 400w
      `}
      sizes="(max-width: 600px) 100px, 200px"
    />
  );
}
```

---

## 9. 部署架构

### 9.1 Docker容器化

```dockerfile
# backend/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# 安装依赖
COPY package*.json ./
COPY pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# 编译TypeScript
COPY . .
RUN pnpm build

# 生产镜像
FROM node:18-alpine

WORKDIR /app

# 只安装生产依赖
COPY package*.json ./
COPY pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --prod --frozen-lockfile

# 复制编译产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# 运行数据库迁移和启动
CMD ["sh", "-c", "pnpm prisma migrate deploy && node dist/main.js"]

EXPOSE 3000
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  # PostgreSQL数据库
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: health_mgmt
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U admin"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis缓存
  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"

  # MongoDB
  mongodb:
    image: mongo:6
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
    volumes:
      - mongo_data:/data/db
    ports:
      - "27017:27017"

  # 用户服务
  user-service:
    build:
      context: ./services/user
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql://admin:${DB_PASSWORD}@postgres:5432/health_mgmt
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    ports:
      - "3001:3000"

  # 健康服务
  health-service:
    build:
      context: ./services/health
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql://admin:${DB_PASSWORD}@postgres:5432/health_mgmt
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
    depends_on:
      - postgres
      - redis
    ports:
      - "3002:3000"

  # AI服务
  ai-service:
    build:
      context: ./services/ai
      dockerfile: Dockerfile
    environment:
      MONGODB_URL: mongodb://admin:${MONGO_PASSWORD}@mongodb:27017
      DEEPSEEK_API_KEY: ${DEEPSEEK_API_KEY}
      QDRANT_URL: http://qdrant:6333
    depends_on:
      - mongodb
      - qdrant
    ports:
      - "3003:3000"

  # 向量数据库
  qdrant:
    image: qdrant/qdrant:latest
    volumes:
      - qdrant_data:/qdrant/storage
    ports:
      - "6333:6333"

  # Nginx网关
  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - user-service
      - health-service
      - ai-service

  # 前端应用
  web-app:
    build:
      context: ./frontend/web
      dockerfile: Dockerfile
    ports:
      - "3000:80"

volumes:
  postgres_data:
  redis_data:
  mongo_data:
  qdrant_data:
```

### 9.2 Kubernetes部署

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: health-service
  labels:
    app: health-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: health-service
  template:
    metadata:
      labels:
        app: health-service
    spec:
      containers:
      - name: health-service
        image: health-mgmt/health-service:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-credentials
              key: url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: health-service
spec:
  selector:
    app: health-service
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: ClusterIP

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: health-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: health-service
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### 9.3 CI/CD流程

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install pnpm
        run: npm install -g pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run tests
        run: pnpm test

      - name: Run E2E tests
        run: pnpm test:e2e

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Build and push images
        run: |
          docker build -t health-mgmt/user-service:${{ github.sha }} ./services/user
          docker push health-mgmt/user-service:${{ github.sha }}

          docker build -t health-mgmt/health-service:${{ github.sha }} ./services/health
          docker push health-mgmt/health-service:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Kubernetes
        uses: azure/k8s-deploy@v4
        with:
          manifests: |
            k8s/deployment.yaml
            k8s/service.yaml
          images: |
            health-mgmt/user-service:${{ github.sha }}
            health-mgmt/health-service:${{ github.sha }}
          kubectl-version: 'latest'
```

---

## 10. 监控与运维

### 10.1 日志收集

```typescript
// Winston日志配置
import winston from 'winston';
import 'winston-daily-rotate-file';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'health-service',
    environment: process.env.NODE_ENV
  },
  transports: [
    // 控制台输出
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),

    // 按日期轮转的文件日志
    new winston.transports.DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '100m',
      maxFiles: '30d'
    }),

    // 错误日志单独存储
    new winston.transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '90d'
    })
  ]
});

// 结构化日志示例
logger.info('User check-in created', {
  userId: 'user-123',
  checkInType: 'blood_pressure',
  value: { systolic: 120, diastolic: 80 },
  pointsEarned: 10
});
```

### 10.2 性能监控

```typescript
// Prometheus指标导出
import { Registry, Counter, Histogram } from 'prom-client';

const register = new Registry();

// HTTP请求计数器
const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register]
});

// 请求延迟直方图
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register]
});

// AI调用计数器
const aiCallsTotal = new Counter({
  name: 'ai_calls_total',
  help: 'Total AI API calls',
  labelNames: ['provider', 'model', 'status'],
  registers: [register]
});

// 中间件收集指标
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;

    httpRequestsTotal.inc({
      method: req.method,
      route,
      status: res.statusCode
    });

    httpRequestDuration.observe(
      { method: req.method, route, status: res.statusCode },
      duration
    );
  });

  next();
});

// 暴露metrics端点
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

---

## 12. 架构演进迁移指南

### 12.1 迁移决策判断

**何时从MVP升级到企业级？**

满足以下**任一条件**时，建议启动架构升级：

| 触发条件 | 阈值 | 说明 |
|---------|------|------|
| **用户规模** | 注册用户 > 5万 | 单体架构性能瓶颈 |
| **并发压力** | 同时在线 > 5000人 | 需要负载均衡和集群 |
| **数据量** | 健康数据 > 500万条 | 需要分库分表 |
| **企业客户** | 签约大型医院/机构 | 需要高可用性保证 |
| **合规要求** | 等保三级认证需求 | 必须符合医疗行业标准 |
| **设备接入** | IoT设备 > 1万台 | MQTT需要集群化 |
| **营收** | 月营收 > 50万 | 有预算支撑升级成本 |

**决策流程**：
```
评估当前情况
    │
    ├─ 达到触发条件？
    │       │
    │       ├─ 是 → 准备迁移计划
    │       │       ├─ 预算评估
    │       │       ├─ 团队扩充
    │       │       └─ 制定时间表
    │       │
    │       └─ 否 → 继续优化MVP
    │               ├─ 数据库索引优化
    │               ├─ 缓存策略优化
    │               └─ 垂直扩容（升级服务器）
```

---

### 12.2 分阶段迁移路线图

**总时长：6-8个月**（建议在业务低谷期进行）

#### 阶段0：准备期（1个月）

**目标**：制定详细迁移计划，降低风险

**关键任务**：
- [ ] 代码审计：评估MVP代码质量，标记需要重构的模块
- [ ] 数据盘点：统计数据量、增长速度、热点数据
- [ ] 接口梳理：整理所有API接口文档（OpenAPI规范）
- [ ] 团队培训：Java/Spring Cloud技术栈培训
- [ ] 预算审批：获取管理层批准
- [ ] 环境准备：采购服务器、开通K8s集群

**产出物**：
- 迁移项目计划书
- 接口文档（Swagger/OpenAPI）
- 数据迁移方案
- 风险评估报告

---

#### 阶段1：基础设施搭建（1-2个月）

**目标**：搭建企业级基础设施，与MVP环境并行运行

**关键任务**：

**1.1 K8s集群搭建**
```bash
# 使用阿里云ACK托管集群
aliyun cs CreateManagedKubernetesCluster \
  --name health-mgmt-prod \
  --kubernetes-version 1.28 \
  --num-of-nodes 3 \
  --worker-instance-types ecs.c6.xlarge
```

**1.2 数据库迁移**
```sql
-- PostgreSQL → MySQL 数据迁移
-- 使用工具：pgloader
pgloader postgresql://user:pass@old-host/health_mgmt \
          mysql://user:pass@new-host/health_mgmt

-- 数据验证
SELECT COUNT(*) FROM users;  -- 对比数量
SELECT MD5(GROUP_CONCAT(id ORDER BY id)) FROM users;  -- 对比数据完整性
```

**1.3 中间件部署**
- Nacos（服务注册中心）
- RocketMQ（消息队列）
- Redis Cluster（缓存集群）
- EMQX企业版（MQTT Broker）

**产出物**：
- K8s集群运行正常
- 数据库迁移完成并验证
- 中间件全部就绪

---

#### 阶段2：AI服务迁移（1个月）

**目标**：优先迁移AI服务（Python代码直接复用）

**为什么先迁移AI？**
- ✅ Python代码100%复用，无需重写
- ✅ 独立服务，不影响主业务
- ✅ 验证K8s部署流程

**迁移步骤**：

**2.1 容器化AI服务**
```dockerfile
# ai-service/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# 安装依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制代码（从MVP直接复用）
COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**2.2 部署到K8s**
```yaml
# k8s/ai-service.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-service
spec:
  replicas: 2  # 2个Pod实例
  selector:
    matchLabels:
      app: ai-service
  template:
    metadata:
      labels:
        app: ai-service
    spec:
      containers:
      - name: ai-service
        image: registry.cn-hangzhou.aliyuncs.com/health-mgmt/ai-service:1.0.0
        ports:
        - containerPort: 8000
        env:
        - name: DEEPSEEK_API_KEY
          valueFrom:
            secretKeyRef:
              name: ai-secrets
              key: api-key
```

**2.3 双环境并行运行**
```
旧环境（MVP）：  http://mvp.vakyi.com
新环境（企业版）：http://ent.vakyi.com

灰度策略：10% → 30% → 50% → 100%
```

**验证指标**：
- ✅ 接口响应时间 < 500ms
- ✅ 错误率 < 0.1%
- ✅ AI回答质量（人工抽样对比）

**产出物**：
- AI服务成功迁移到K8s
- 性能指标达标
- 向量数据库数据迁移完成

---

#### 阶段3：Java微服务开发（2-3个月）

**目标**：用Java重写核心业务服务

**3.1 服务拆分优先级**

**第一批（核心服务）**：
1. **用户服务** - 认证授权最关键
2. **健康服务** - 核心业务逻辑

**第二批（支撑服务）**：
3. **积分服务** - 相对独立
4. **通知服务** - 相对独立

**第三批（复杂服务）**：
5. **通讯服务** - WebSocket需要特殊处理

**3.2 接口兼容性保证**

```java
// 保持与NestJS相同的接口定义
@RestController
@RequestMapping("/api/health")
public class HealthController {

    @PostMapping("/check-ins")
    public ResponseEntity<ApiResponse> createCheckIn(
        @RequestBody CheckInRequest request
    ) {
        // 确保请求/响应格式与MVP完全一致
        // 前端代码无需修改
    }
}

// 统一响应格式
public class ApiResponse<T> {
    private boolean success;
    private T data;
    private ErrorInfo error;
}
```

**3.3 数据访问层迁移**

```java
// 使用MyBatis Plus，简化开发
@Mapper
public interface CheckInMapper extends BaseMapper<CheckIn> {
    // 自动生成CRUD方法
    // 复杂查询手写SQL
    @Select("SELECT * FROM check_ins WHERE user_id = #{userId} AND check_in_date = #{date}")
    List<CheckIn> findByUserAndDate(String userId, LocalDate date);
}
```

**产出物**：
- 5个Java微服务全部开发完成
- 单元测试覆盖率 > 80%
- 集成测试通过

---

#### 阶段4：灰度发布与切换（1-2个月）

**目标**：平滑切换用户流量，零停机迁移

**4.1 灰度发布策略**

```
第1周：内部测试账号（1%流量）
    ↓ 验证通过
第2周：小部分真实用户（10%流量）
    ↓ 观察指标
第3周：扩大范围（30%流量）
    ↓
第4周：过半用户（50%流量）
    ↓
第6周：绝大部分用户（80%流量）
    ↓
第8周：全量切换（100%流量）
```

**4.2 流量切换实现**

**方案A：Nginx权重分流**
```nginx
upstream backend {
    server old-server:3000 weight=20;  # 旧环境 20%
    server new-server:8080 weight=80;  # 新环境 80%
}
```

**方案B：基于Header灰度**
```nginx
# 特定用户走新环境
if ($http_x_user_group = "beta") {
    proxy_pass http://new-server;
}
# 其他用户走旧环境
proxy_pass http://old-server;
```

**4.3 数据同步策略**

迁移期间，新旧环境数据**双写**：

```java
@Service
public class CheckInService {

    @Transactional
    public void createCheckIn(CheckInRequest request) {
        // 1. 写入新数据库（MySQL）
        checkInMapper.insert(checkIn);

        // 2. 异步同步到旧数据库（PostgreSQL）
        // 防止数据不一致
        messageQueue.send("sync-to-old-db", checkIn);
    }
}
```

**关键监控指标**：

| 指标 | 阈值 | 异常处理 |
|------|------|---------|
| 接口响应时间 | P99 < 1s | 自动回滚到旧环境 |
| 错误率 | < 0.5% | 报警并分析 |
| 数据一致性 | 100% | 停止灰度，修复问题 |
| 用户投诉 | 0严重投诉 | 立即回滚 |

**产出物**：
- 流量100%切换到新环境
- 旧环境保留7天作为备份
- 用户无感知迁移

---

#### 阶段5：旧环境下线（1个月）

**目标**：清理旧环境，降低成本

**5.1 下线检查清单**

- [ ] 所有流量已切换到新环境
- [ ] 新环境运行稳定30天以上
- [ ] 数据迁移100%完成并验证
- [ ] 备份旧环境数据
- [ ] 通知所有相关人员

**5.2 数据备份**

```bash
# 备份PostgreSQL数据
pg_dump -h old-server -U admin health_mgmt > backup_$(date +%Y%m%d).sql

# 归档到对象存储
ossutil cp backup_*.sql oss://health-mgmt-backup/postgres/

# 保留1年，然后删除
```

**5.3 资源释放**

```bash
# 停止旧服务
docker-compose down

# 释放服务器
aliyun ecs StopInstance --instance-id i-xxxxxx

# 取消续费
```

**成本节省**：
- 释放旧ECS：节省¥200/月
- 保留K8s集群：新增¥7500/月
- **净增成本**：约¥7300/月

---

### 12.3 风险控制与应急预案

#### 风险识别

| 风险等级 | 风险点 | 概率 | 影响 | 应对策略 |
|---------|-------|------|------|----------|
| 🔴 高 | 数据迁移丢失 | 中 | 极高 | 多次验证+备份 |
| 🔴 高 | 服务中断超过1小时 | 低 | 高 | 灰度发布+快速回滚 |
| 🟡 中 | 性能下降 | 中 | 中 | 压测+性能调优 |
| 🟡 中 | 接口不兼容 | 中 | 中 | 自动化测试 |
| 🟢 低 | 成本超支 | 低 | 低 | 预算预留20% |

#### 应急回滚方案

**回滚触发条件**（满足任一条即回滚）：
- 错误率 > 1%
- 接口响应时间 > 3秒
- 出现数据丢失
- 严重用户投诉

**回滚操作**（15分钟内完成）：
```bash
# 1. 切换DNS或Nginx配置指向旧环境
nginx -s reload

# 2. 停止新环境服务（防止数据写入）
kubectl scale deployment --replicas=0 --all

# 3. 通知团队
钉钉/企业微信发送回滚通知

# 4. 问题分析
收集日志、数据库状态、监控指标
```

#### 数据一致性保障

**双写期间数据对账**：

```python
# 每小时执行一次对账脚本
def data_reconciliation():
    # 对比新旧数据库
    old_count = pg_client.execute("SELECT COUNT(*) FROM check_ins WHERE created_at > NOW() - INTERVAL '1 hour'")
    new_count = mysql_client.execute("SELECT COUNT(*) FROM check_ins WHERE created_at > NOW() - INTERVAL 1 HOUR")

    if old_count != new_count:
        alert("数据不一致！旧库: {old_count}, 新库: {new_count}")
        # 补偿机制：重新同步差异数据
```

---

### 12.4 迁移成本估算

#### 一次性成本

| 项目 | 金额 | 说明 |
|------|------|------|
| 服务器采购/租赁 | ¥20,000 | 10台ECS首次付费（年付优惠） |
| K8s集群搭建 | ¥5,000 | 技术服务费 |
| 数据迁移工具 | ¥3,000 | 专业迁移工具授权 |
| 人员培训 | ¥10,000 | Java/Spring Cloud培训 |
| 第三方咨询 | ¥15,000 | 架构咨询、等保咨询 |
| **合计** | **¥53,000** | |

#### 月度成本对比

| 项目 | MVP阶段 | 企业级阶段 | 增量 |
|------|---------|------------|------|
| 服务器 | ¥200 | ¥2,000 | +¥1,800 |
| 数据库 | ¥0 | ¥1,500 | +¥1,500 |
| 缓存 | ¥0 | ¥800 | +¥800 |
| 对象存储 | ¥50 | ¥300 | +¥250 |
| K8s托管 | ¥0 | ¥500 | +¥500 |
| AI调用 | ¥500 | ¥2,000 | +¥1,500 |
| 监控日志 | ¥0 | ¥500 | +¥500 |
| 人力成本 | ¥50,000 | ¥100,000 | +¥50,000 |
| **月度合计** | **¥50,750** | **¥107,600** | **+¥56,850** |

**ROI分析**：
- 企业级客户年费：约¥300,000/家
- 需签约2家企业级客户即可覆盖升级成本
- 后续边际成本低，规模效应明显

---

### 12.5 迁移检查清单

#### 迁移前检查

- [ ] 代码审计完成，无明显技术债务
- [ ] 接口文档齐全（OpenAPI规范）
- [ ] 数据备份完成（至少3份）
- [ ] 团队培训完成（Java/Spring Cloud）
- [ ] 预算审批通过
- [ ] 时间表获得管理层批准
- [ ] 应急预案制定完成
- [ ] 监控告警系统就绪

#### 迁移中检查

- [ ] 每日站会同步进度
- [ ] 每周数据对账
- [ ] 自动化测试通过率 > 95%
- [ ] 灰度发布严格按计划执行
- [ ] 关键指标实时监控
- [ ] 用户反馈渠道畅通

#### 迁移后检查

- [ ] 新环境稳定运行30天
- [ ] 旧环境数据已归档
- [ ] 成本在预算范围内
- [ ] 用户满意度无下降
- [ ] 团队知识沉淀完成（迁移文档）
- [ ] 复盘会议召开

---

## 13. 总结

本设计文档详细规划了智慧慢病管理系统的技术架构，包括：

1. **微服务架构**：将系统拆分为7个独立服务，实现高内聚低耦合
2. **AI深度集成**：通过适配器模式支持多AI提供商，RAG架构提升科普质量
3. **数据安全**：多层次加密、RBAC权限、审计日志保障隐私
4. **高性能**：缓存策略、异步处理、数据库优化确保系统响应速度
5. **可扩展性**：容器化部署、K8s编排、水平扩展支持业务增长
6. **全面测试**：单元测试、集成测试、E2E测试保障代码质量

该设计为后续开发提供了清晰的技术路线和最佳实践指导。
