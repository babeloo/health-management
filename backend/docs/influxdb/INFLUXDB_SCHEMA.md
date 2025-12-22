# InfluxDB 数据模型设计

## 概述

本文档定义健康指标时序数据的存储结构，使用 InfluxDB 2.7 作为时序数据库。

## 数据组织结构

```
Organization: vakyi
Bucket: health_data
Retention: infinite (永久保存)
```

## Measurement 定义

### 1. blood_pressure（血压数据）

**用途**：存储用户血压打卡数据，包括收缩压、舒张压和心率。

**Schema 结构**：

| 字段类型  | 字段名      | 数据类型 | 说明                           | 示例                 |
| --------- | ----------- | -------- | ------------------------------ | -------------------- |
| Tag       | user_id     | string   | 用户 ID（索引字段）            | "123"                |
| Tag       | check_in_id | string   | 打卡记录 ID（关联 PostgreSQL） | "456"                |
| Field     | systolic    | float    | 收缩压（mmHg）                 | 120.0                |
| Field     | diastolic   | float    | 舒张压（mmHg）                 | 80.0                 |
| Field     | pulse       | integer  | 心率（次/分钟）                | 72                   |
| Timestamp | \_time      | RFC3339  | 打卡时间（UTC）                | 2025-12-23T08:00:00Z |

**写入示例**：

```flux
blood_pressure,user_id=123,check_in_id=456 systolic=120.0,diastolic=80.0,pulse=72 1703318400000000000
```

**数据点说明**：

- **Tags**（标签，用于索引和分组）：
  - `user_id`: 用户唯一标识，用于按用户查询数据
  - `check_in_id`: 打卡记录 ID，用于关联 PostgreSQL 中的打卡详情

- **Fields**（字段，存储实际测量值）：
  - `systolic`: 收缩压（高压），正常范围 90-140 mmHg
  - `diastolic`: 舒张压（低压），正常范围 60-90 mmHg
  - `pulse`: 心率，正常范围 60-100 次/分钟

### 2. blood_sugar（血糖数据）

**用途**：存储用户血糖打卡数据，支持多种测量时机（空腹/餐后/随机）。

**Schema 结构**：

| 字段类型  | 字段名      | 数据类型 | 说明                                    | 示例                 |
| --------- | ----------- | -------- | --------------------------------------- | -------------------- |
| Tag       | user_id     | string   | 用户 ID（索引字段）                     | "123"                |
| Tag       | check_in_id | string   | 打卡记录 ID（关联 PostgreSQL）          | "789"                |
| Tag       | timing      | string   | 测量时机（fasting/postprandial/random） | "fasting"            |
| Field     | value       | float    | 血糖值（mmol/L）                        | 5.6                  |
| Timestamp | \_time      | RFC3339  | 打卡时间（UTC）                         | 2025-12-23T08:00:00Z |

**写入示例**：

```flux
blood_sugar,user_id=123,check_in_id=789,timing=fasting value=5.6 1703318400000000000
```

**数据点说明**：

- **Tags**（标签）：
  - `user_id`: 用户唯一标识
  - `check_in_id`: 打卡记录 ID
  - `timing`: 测量时机，可选值：
    - `fasting`: 空腹血糖（8小时未进食）
    - `postprandial`: 餐后血糖（餐后2小时）
    - `random`: 随机血糖（任意时间）

- **Fields**（字段）：
  - `value`: 血糖值，单位 mmol/L
    - 空腹正常范围：3.9-6.1 mmol/L
    - 餐后正常范围：< 7.8 mmol/L
    - 随机正常范围：< 11.1 mmol/L

## 数据写入策略

### 1. 写入时机

- 用户完成健康打卡时，**同时写入**：
  1. PostgreSQL：打卡记录元数据（check_ins 表）
  2. InfluxDB：具体健康指标数据（本文档定义的 measurement）

### 2. 数据一致性

- `check_in_id` 作为 Tag 存储在 InfluxDB 中，用于关联 PostgreSQL 的打卡记录
- 如果 PostgreSQL 写入失败，InfluxDB 数据应回滚或标记为无效
- 支持通过 `check_in_id` 反查 PostgreSQL 获取打卡详情（打卡时间、照片、备注等）

### 3. 时间戳处理

- **写入时间戳**：使用用户打卡的实际时间（客户端时间或服务器时间）
- **时区转换**：客户端时间转换为 UTC 后存储
- **精度要求**：纳秒级（InfluxDB 默认精度）

## 数据查询场景

### 场景 1：查询用户最近 7 天血压数据（趋势图）

**业务需求**：患者端展示血压趋势图，每天显示一个数据点（取当天平均值）。

**Flux 查询**：参见 `flux-queries.md`

### 场景 2：查询用户最近 30 天血糖平均值（统计分析）

**业务需求**：医生端查看患者月度血糖控制情况，按测量时机分组统计。

**Flux 查询**：参见 `flux-queries.md`

### 场景 3：查询指定时间范围的聚合数据（健康报告）

**业务需求**：生成健康报告时，查询自定义时间范围内的健康指标统计（最大值/最小值/平均值）。

**Flux 查询**：参见 `flux-queries.md`

## 性能优化建议

### 1. Tag 选择原则

- **高基数字段不建议作为 Tag**：如具体的血压值、血糖值（应作为 Field）
- **低基数且常用于过滤的字段作为 Tag**：user_id、timing
- **唯一标识符慎用 Tag**：check_in_id 虽然高基数，但用于关联查询，权衡后选择 Tag

### 2. 查询优化

- **时间范围过滤**：始终使用 `range()` 函数限制时间范围
- **聚合窗口**：使用 `aggregateWindow()` 按天/小时聚合，避免返回大量原始数据
- **索引利用**：通过 Tag 过滤（如 user_id）可以利用 InfluxDB 的 TSI 索引
- **分页查询**：使用 `limit()` 和 `offset()` 限制返回数据量

### 3. 写入优化

- **批量写入**：使用 InfluxDB 客户端的批量写入 API，减少网络开销
- **写入频率**：健康打卡为低频操作（每天1-3次），无需特殊优化
- **数据压缩**：InfluxDB 自动压缩历史数据，无需手动干预

## 数据迁移方案

### 从 PostgreSQL 迁移到 InfluxDB

**迁移范围**：`health_records` 表中的血压和血糖数据

**迁移脚本逻辑**：

```sql
-- 1. 从 PostgreSQL 读取历史数据
SELECT
  id as check_in_id,
  user_id,
  type,
  value,
  created_at as timestamp
FROM health_records
WHERE type IN ('blood_pressure', 'blood_sugar')
ORDER BY created_at ASC;

-- 2. 转换为 InfluxDB 写入格式
-- 3. 批量写入 InfluxDB
-- 4. 验证数据一致性（行数、数值范围）
```

**迁移注意事项**：

- 迁移过程中，PostgreSQL 数据保留作为备份
- 迁移完成后，新打卡数据直接写入 InfluxDB
- 旧 API 可继续从 PostgreSQL 读取数据（兼容期）
- 逐步切换到 InfluxDB API

## 数据保留策略

- **当前配置**：`infinite`（永久保存）
- **未来优化**：
  - 原始数据保留 2 年
  - 降采样数据（按天聚合）保留 10 年
  - 使用 InfluxDB Task 定期执行降采样

## 监控告警

### 监控指标

- **写入成功率**：监控 InfluxDB 写入失败次数
- **查询响应时间**：P95 响应时间 < 100ms
- **存储空间**：磁盘使用率 < 80%

### 告警规则

- 写入失败率 > 1% 时触发告警
- 查询响应时间 P95 > 200ms 时触发告警
- 磁盘使用率 > 90% 时触发紧急告警

## 相关文档

- **Flux 查询语句**：`flux-queries.md`
- **InfluxDB 服务封装**：`influx.service.ts`
- **环境变量配置**：`.env.example`
- **部署指南**：`DEPLOYMENT.md`
