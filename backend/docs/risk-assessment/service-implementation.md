# 风险评估业务逻辑实现文档

## 📋 概述

本文档详细说明了 `HealthService` 中风险评估业务逻辑方法的实现。

## 🎯 实现目标

在 HealthService 中实现风险评估的核心业务逻辑，包括：

- 创建风险评估
- 查询评估列表
- 对比历史评估
- 从 InfluxDB 获取设备数据
- 检查风险等级变化

## 📦 依赖关系

### 注入的服务

```typescript
constructor(
  private readonly prisma: PrismaService,
  private readonly fileStorageService: FileStorageService,
  private readonly influxService: InfluxService,
  private readonly riskCalculationService: RiskCalculationService, // 新增
) {}
```

### 关联模块

- **Prisma**：数据库操作（RiskAssessment 模型）
- **InfluxDB**：时序数据查询（血压、血糖）
- **RiskCalculationService**：风险评分算法

## 🔧 已实现方法

### 1. createRiskAssessment

**功能**：创建风险评估记录

**方法签名**：

```typescript
async createRiskAssessment(dto: CreateRiskAssessmentDto): Promise<RiskAssessment>
```

**执行流程**：

1. **用户验证**

   ```typescript
   const user = await this.prisma.user.findUnique({
     where: { id: String(dto.user_id) },
   });
   if (!user) {
     throw new NotFoundException(`用户 ID ${dto.user_id} 不存在`);
   }
   ```

2. **可选：获取设备数据**

   ```typescript
   let deviceData = null;
   if (dto.include_device_data) {
     deviceData = await this.getDeviceDataFromInfluxDB(userId, dto.assessment_type);
   }
   ```

3. **调用算法计算风险**

   ```typescript
   if (dto.assessment_type === RiskAssessmentType.DIABETES) {
     calculationResult = this.riskCalculationService.calculateDiabetesRisk(
       dto.diabetes_questionnaire,
     );
   } else if (dto.assessment_type === RiskAssessmentType.STROKE) {
     calculationResult = this.riskCalculationService.calculateStrokeRisk(dto.stroke_questionnaire);
   }
   ```

4. **保存到数据库**

   ```typescript
   const riskAssessment = await this.prisma.riskAssessment.create({
     data: {
       userId,
       type: dto.assessment_type,
       questionnaireData: questionnaireData as object,
       deviceData: deviceData as object | null,
       riskLevel: level,
       riskScore: score,
       resultDetails: details as object,
       aiRecommendations: recommendations.join('\n'),
     },
   });
   ```

5. **检查风险等级变化**
   ```typescript
   await this.checkRiskLevelChange(userId, dto.assessment_type, level);
   ```

**异常处理**：

- `NotFoundException`：用户不存在
- `BadRequestException`：缺少问卷数据、不支持的评估类型
- `InternalServerErrorException`：数据库错误

---

### 2. getRiskAssessments

**功能**：查询风险评估列表

**方法签名**：

```typescript
async getRiskAssessments(
  userId: string,
  query: QueryRiskAssessmentsDto,
): Promise<{ items: RiskAssessment[]; total: number; page: number; limit: number }>
```

**查询条件**：

- `assessment_type`：评估类型筛选（diabetes/stroke）
- `risk_level`：风险等级筛选（low/medium/high）
- `start_date`、`end_date`：日期范围筛选
- `page`、`limit`：分页参数（默认 page=1, limit=20）

**查询逻辑**：

```typescript
const where: any = { userId };

if (assessment_type) {
  where.type = assessment_type;
}

if (risk_level) {
  where.riskLevel = risk_level;
}

if (start_date || end_date) {
  where.assessedAt = {};
  if (start_date) {
    where.assessedAt.gte = new Date(start_date);
  }
  if (end_date) {
    where.assessedAt.lte = new Date(end_date);
  }
}

// 查询总数
const total = await this.prisma.riskAssessment.count({ where });

// 查询数据（按评估时间倒序）
const items = await this.prisma.riskAssessment.findMany({
  where,
  orderBy: { assessedAt: 'desc' },
  skip: (page - 1) * limit,
  take: limit,
});
```

**返回格式**：

```typescript
{
  items: RiskAssessment[],
  total: number,
  page: number,
  limit: number
}
```

---

### 3. compareRiskAssessments

**功能**：对比最近 N 次风险评估

**方法签名**：

```typescript
async compareRiskAssessments(
  userId: string,
  dto: CompareRiskAssessmentsDto,
): Promise<{
  assessmentType: RiskAssessmentType;
  comparisons: Array<{
    id: string;
    assessedAt: Date;
    riskLevel: RiskLevel;
    riskScore: number | null;
  }>;
  trend: 'increased' | 'decreased' | 'stable';
  avgScore: number;
  maxScore: number;
  minScore: number;
}>
```

**执行流程**：

1. **查询最近 N 次评估**

   ```typescript
   const assessments = await this.prisma.riskAssessment.findMany({
     where: { userId, type: assessment_type },
     orderBy: { assessedAt: 'desc' },
     take: count, // 默认 5 次
     select: { id: true, assessedAt: true, riskLevel: true, riskScore: true },
   });
   ```

2. **验证评估数量**

   ```typescript
   if (assessments.length < 2) {
     throw new BadRequestException(
       `对比评估需要至少 2 次评估记录，当前仅有 ${assessments.length} 次`,
     );
   }
   ```

3. **计算趋势**

   ```typescript
   const scores = assessments.map((a) => a.riskScore || 0).reverse(); // 按时间正序
   let trend: 'increased' | 'decreased' | 'stable' = 'stable';

   if (scores.length >= 2) {
     const firstScore = scores[0];
     const lastScore = scores[scores.length - 1];
     const diff = lastScore - firstScore;

     if (diff > 2) {
       trend = 'increased'; // 风险增加
     } else if (diff < -2) {
       trend = 'decreased'; // 风险降低
     } else {
       trend = 'stable'; // 风险稳定
     }
   }
   ```

4. **计算统计信息**
   ```typescript
   const avgScore = this.average(scores);
   const maxScore = Math.max(...scores);
   const minScore = Math.min(...scores);
   ```

---

### 4. getDeviceDataFromInfluxDB (私有)

**功能**：从 InfluxDB 获取设备数据

**方法签名**：

```typescript
private async getDeviceDataFromInfluxDB(
  userId: string,
  type: RiskAssessmentType,
): Promise<any>
```

**逻辑说明**：

- **时间范围**：最近 30 天
- **糖尿病评估**：获取血糖数据，计算平均值
- **卒中评估**：获取血压数据，计算平均收缩压和舒张压

**容错设计**：

```typescript
try {
  // InfluxDB 查询逻辑
  // ...
} catch (error) {
  // InfluxDB 查询失败不应影响主流程，返回 null
  this.logger.warn(
    `从 InfluxDB 获取设备数据失败: userId=${userId}, type=${type}, error=${errorMessage}`,
  );
  return null;
}
```

**返回格式**（糖尿病）：

```typescript
{
  avgBloodSugar: number,
  dataCount: number,
  timeRange: {
    start: string, // ISO 8601
    end: string
  }
}
```

**返回格式**（卒中）：

```typescript
{
  avgSystolic: number,
  avgDiastolic: number,
  dataCount: number,
  timeRange: {
    start: string, // ISO 8601
    end: string
  }
}
```

---

### 5. checkRiskLevelChange (私有)

**功能**：检查风险等级变化

**方法签名**：

```typescript
private async checkRiskLevelChange(
  userId: string,
  type: RiskAssessmentType,
  newLevel: RiskLevel,
): Promise<void>
```

**执行流程**：

1. **查询上一次评估**

   ```typescript
   const lastAssessment = await this.prisma.riskAssessment.findFirst({
     where: { userId, type },
     orderBy: { assessedAt: 'desc' },
     skip: 1, // 跳过刚创建的这条记录
     take: 1,
     select: { riskLevel: true },
   });
   ```

2. **判断等级变化**

   ```typescript
   if (oldLevel !== newLevel) {
     this.logger.log(`用户 ${userId} 的 ${type} 风险等级从 ${oldLevel} 变为 ${newLevel}`);

     // 如果风险等级变为 high，记录警告日志
     if (newLevel === RiskLevel.HIGH) {
       this.logger.warn(`⚠️ 用户 ${userId} 的 ${type} 风险等级升高至 HIGH，建议及时关注`);

       // TODO: 未来集成通知模块
       // await this.notificationService.sendRiskAlert(userId, type, newLevel);
     }
   }
   ```

**容错设计**：

- 检查风险等级变化失败不应影响主流程
- 所有异常都会被捕获并记录日志

---

## 🛡️ 错误处理策略

### 异常类型

| 异常类型                       | 触发场景                                        | HTTP 状态码 |
| ------------------------------ | ----------------------------------------------- | ----------- |
| `NotFoundException`            | 用户不存在                                      | 404         |
| `BadRequestException`          | 缺少问卷数据、对比评估不足2次、不支持的评估类型 | 400         |
| `InternalServerErrorException` | 数据库错误、未知错误                            | 500         |

### 容错设计

1. **InfluxDB 查询失败**
   - 不影响主流程
   - 返回 null
   - 记录 warn 级别日志

2. **风险等级变化检查失败**
   - 不影响主流程
   - 记录 error 级别日志

---

## 📊 数据库操作

### Prisma 查询示例

#### 创建评估

```typescript
await this.prisma.riskAssessment.create({
  data: {
    userId,
    type: 'diabetes',
    questionnaireData: { ... },
    deviceData: { ... },
    riskLevel: 'medium',
    riskScore: 10.5,
    resultDetails: { ... },
    aiRecommendations: '建议1\n建议2\n建议3',
  },
});
```

#### 查询评估列表

```typescript
await this.prisma.riskAssessment.findMany({
  where: {
    userId,
    type: 'diabetes',
    riskLevel: 'high',
    assessedAt: {
      gte: new Date('2025-01-01'),
      lte: new Date('2025-12-31'),
    },
  },
  orderBy: { assessedAt: 'desc' },
  skip: 0,
  take: 20,
});
```

#### 计数

```typescript
await this.prisma.riskAssessment.count({
  where: { userId, type: 'diabetes' },
});
```

---

## 🔧 代码质量

### 检查结果

- ✅ **TypeScript 类型检查**：无类型错误
- ✅ **ESLint**：无规则违反（已处理 camelcase 警告）
- ✅ **Prettier**：代码格式正确
- ✅ **JSDoc 注释**：所有方法都有完整的文档注释

### 代码统计

| 指标         | 数值                                   |
| ------------ | -------------------------------------- |
| 文件路径     | `backend/src/health/health.service.ts` |
| 总行数       | 1093 行                                |
| 新增方法行数 | 约 370 行                              |
| 测试覆盖率   | 待编写（HealthService 部分）           |

---

## 🚀 下一步工作

### 待完成任务

1. **编写单元测试**
   - [ ] createRiskAssessment 方法测试
   - [ ] getRiskAssessments 方法测试
   - [ ] compareRiskAssessments 方法测试
   - [ ] getDeviceDataFromInfluxDB 方法测试
   - [ ] checkRiskLevelChange 方法测试

2. **创建 API 端点**
   - [ ] POST /api/v1/health/assessments（创建风险评估）
   - [ ] GET /api/v1/health/assessments/:userId（获取评估历史）
   - [ ] GET /api/v1/health/assessments/:userId/compare（对比评估）

3. **权限验证**
   - [ ] 患者只能访问自己的评估
   - [ ] 医生可以访问其管理的患者评估
   - [ ] 管理员和健康管理师可以访问所有评估

4. **集成通知模块**（未来）
   - [ ] 实现 checkRiskLevelChange 中的通知功能
   - [ ] 风险等级升至 HIGH 时推送通知

---

## 📚 参考文档

- **Prisma Schema**：`backend/prisma/schema.prisma`
- **DTO 定义**：`backend/src/health/dto/risk-assessment.dto.ts`
- **算法服务**：`backend/src/health/services/risk-calculation.service.ts`
- **设计文档**：`.claude/specs/chronic-disease-management/design.md`
- **需求文档**：`.claude/specs/chronic-disease-management/requirements.md`

---

## ✅ 验收标准

### 功能验收

- [x] createRiskAssessment 方法能够成功创建评估记录
- [x] getRiskAssessments 方法能够按条件查询评估列表
- [x] compareRiskAssessments 方法能够计算趋势和统计信息
- [x] getDeviceDataFromInfluxDB 方法能够从 InfluxDB 获取数据（容错）
- [x] checkRiskLevelChange 方法能够检测风险等级变化（容错）

### 代码质量验收

- [x] TypeScript 类型检查通过
- [x] ESLint 检查通过
- [x] Prettier 格式化正确
- [x] 所有方法有 JSDoc 注释
- [ ] 单元测试覆盖率 > 70%（待编写测试）

---

**文档版本**：1.0
**最后更新**：2025-12-23
**负责人**：@backend-ts
