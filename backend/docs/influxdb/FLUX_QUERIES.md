# InfluxDB Flux 查询语句

## 概述

本文档提供医疗健康 IoT 系统中常用的 Flux 查询语句，覆盖血压、血糖等时序数据的查询场景。

## 基础概念

### Flux 查询结构

```flux
from(bucket: "health_data")              // 1. 数据源
  |> range(start: -7d)                   // 2. 时间范围
  |> filter(fn: (r) => r._measurement == "blood_pressure") // 3. 过滤条件
  |> aggregateWindow(every: 1d, fn: mean) // 4. 聚合窗口
  |> yield(name: "result")               // 5. 输出结果
```

### 性能优化原则

1. **始终限制时间范围**：使用 `range()` 函数，避免全表扫描
2. **尽早过滤**：在 `filter()` 中使用 Tag 过滤，利用索引
3. **合理聚合**：使用 `aggregateWindow()` 减少数据点数量
4. **避免客户端聚合**：在 InfluxDB 中完成聚合，减少网络传输

---

## 场景 1：查询用户最近 7 天血压数据（趋势图）

### 业务需求

患者端展示血压趋势图，每天显示一个数据点（取当天的平均值）。

### Flux 查询语句

```flux
// 查询最近 7 天的血压数据，按天聚合
from(bucket: "health_data")
  |> range(start: -7d, stop: now())
  |> filter(fn: (r) =>
      r._measurement == "blood_pressure" and
      r.user_id == "${userId}"
  )
  |> aggregateWindow(every: 1d, fn: mean, createEmpty: false)
  |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
  |> keep(columns: ["_time", "systolic", "diastolic", "pulse"])
  |> sort(columns: ["_time"], desc: false)
```

### 查询说明

**参数**：

- `${userId}`: 用户 ID（动态参数，由后端注入）

**步骤解析**：

1. `range(start: -7d, stop: now())`: 限制查询最近 7 天的数据
2. `filter(...)`: 过滤 `blood_pressure` measurement 和指定用户
3. `aggregateWindow(every: 1d, fn: mean)`: 按天聚合，计算每天的平均值
   - `createEmpty: false`: 如果某天没有数据，不创建空数据点
4. `pivot(...)`: 将多行数据（systolic, diastolic, pulse）转换为多列
5. `keep(...)`: 只保留需要的列（时间、收缩压、舒张压、心率）
6. `sort(...)`: 按时间升序排序

### 返回结果示例

| \_time               | systolic | diastolic | pulse |
| -------------------- | -------- | --------- | ----- |
| 2025-12-17T00:00:00Z | 118.5    | 78.3      | 70.2  |
| 2025-12-18T00:00:00Z | 120.0    | 80.0      | 72.0  |
| 2025-12-19T00:00:00Z | 115.2    | 76.8      | 68.5  |
| 2025-12-20T00:00:00Z | 122.3    | 82.1      | 74.3  |
| 2025-12-21T00:00:00Z | 119.8    | 79.5      | 71.0  |
| 2025-12-22T00:00:00Z | 121.0    | 81.0      | 73.0  |
| 2025-12-23T00:00:00Z | 117.5    | 77.8      | 69.5  |

### 性能优化

- **预期响应时间**: < 50ms（7 天数据，聚合后约 7 个数据点）
- **优化手段**:
  - 使用 Tag 过滤（user_id），利用 TSI 索引
  - 聚合窗口减少数据传输量（原始数据可能 14-21 条，聚合后 7 条）

---

## 场景 2：查询用户最近 30 天血糖平均值（按测量时机分组）

### 业务需求

医生端查看患者月度血糖控制情况，按测量时机（空腹/餐后/随机）分别统计平均值。

### Flux 查询语句

```flux
// 查询最近 30 天的血糖数据，按测量时机分组统计平均值
from(bucket: "health_data")
  |> range(start: -30d, stop: now())
  |> filter(fn: (r) =>
      r._measurement == "blood_sugar" and
      r.user_id == "${userId}" and
      r._field == "value"
  )
  |> group(columns: ["timing"])
  |> mean()
  |> rename(columns: {_value: "avg_value"})
  |> keep(columns: ["timing", "avg_value"])
```

### 查询说明

**参数**：

- `${userId}`: 用户 ID（动态参数）

**步骤解析**：

1. `range(start: -30d)`: 查询最近 30 天的数据
2. `filter(...)`:
   - 过滤 `blood_sugar` measurement
   - 过滤指定用户
   - 只查询 `value` 字段（血糖值）
3. `group(columns: ["timing"])`: 按测量时机分组（fasting/postprandial/random）
4. `mean()`: 计算每组的平均值
5. `rename(...)`: 将 `_value` 重命名为 `avg_value`，语义更清晰
6. `keep(...)`: 只保留测量时机和平均值

### 返回结果示例

| timing       | avg_value |
| ------------ | --------- |
| fasting      | 5.8       |
| postprandial | 7.2       |
| random       | 6.5       |

### 扩展查询：包含最大值、最小值和记录数

```flux
// 查询最近 30 天血糖统计（平均值、最大值、最小值、记录数）
from(bucket: "health_data")
  |> range(start: -30d, stop: now())
  |> filter(fn: (r) =>
      r._measurement == "blood_sugar" and
      r.user_id == "${userId}" and
      r._field == "value"
  )
  |> group(columns: ["timing"])
  |> aggregateWindow(every: 30d, fn: mean, createEmpty: false)
  |> duplicate(column: "_value", as: "mean_value")
  |> duplicate(column: "_value", as: "max_value")
  |> duplicate(column: "_value", as: "min_value")
  |> duplicate(column: "_value", as: "count")
  |> map(fn: (r) => ({
      r with
      mean_value: r._value,
      max_value: r._value,
      min_value: r._value,
      count: 1.0
  }))
  |> group(columns: ["timing"])
  |> reduce(
      fn: (r, accumulator) => ({
          timing: r.timing,
          mean_value: (accumulator.mean_value * accumulator.count + r.mean_value) / (accumulator.count + 1.0),
          max_value: if r.max_value > accumulator.max_value then r.max_value else accumulator.max_value,
          min_value: if r.min_value < accumulator.min_value then r.min_value else accumulator.min_value,
          count: accumulator.count + 1.0
      }),
      identity: {timing: "", mean_value: 0.0, max_value: 0.0, min_value: 999.0, count: 0.0}
  )
```

**注意**：上述扩展查询较复杂，建议使用以下简化版本：

```flux
// 简化版：分别查询平均值、最大值、最小值、计数
import "experimental/aggregate"

from(bucket: "health_data")
  |> range(start: -30d, stop: now())
  |> filter(fn: (r) =>
      r._measurement == "blood_sugar" and
      r.user_id == "${userId}" and
      r._field == "value"
  )
  |> group(columns: ["timing"])
  |> aggregate.stats()
```

### 返回结果示例（扩展版）

| timing       | mean_value | max_value | min_value | count |
| ------------ | ---------- | --------- | --------- | ----- |
| fasting      | 5.8        | 7.2       | 4.5       | 28    |
| postprandial | 7.2        | 9.8       | 5.6       | 25    |
| random       | 6.5        | 8.5       | 5.0       | 15    |

### 性能优化

- **预期响应时间**: < 80ms（30 天数据，约 60-90 条记录）
- **优化手段**:
  - 使用 Tag 过滤（user_id, timing）
  - 服务器端聚合，减少网络传输

---

## 场景 3：查询指定时间范围的聚合数据（健康报告）

### 业务需求

生成健康报告时，查询自定义时间范围内的健康指标统计（最大值、最小值、平均值）。

### 3.1 血压统计查询

```flux
// 查询指定时间范围内的血压统计数据
from(bucket: "health_data")
  |> range(start: ${startTime}, stop: ${stopTime})
  |> filter(fn: (r) =>
      r._measurement == "blood_pressure" and
      r.user_id == "${userId}"
  )
  |> group(columns: ["_field"])
  |> reduce(
      fn: (r, accumulator) => ({
          _field: r._field,
          mean: accumulator.mean + r._value,
          max: if r._value > accumulator.max then r._value else accumulator.max,
          min: if r._value < accumulator.min then r._value else accumulator.min,
          count: accumulator.count + 1.0
      }),
      identity: {_field: "", mean: 0.0, max: 0.0, min: 999.0, count: 0.0}
  )
  |> map(fn: (r) => ({
      r with
      mean: r.mean / r.count
  }))
  |> keep(columns: ["_field", "mean", "max", "min", "count"])
```

### 查询说明

**参数**：

- `${userId}`: 用户 ID（动态参数）
- `${startTime}`: 开始时间（RFC3339 格式，如 `2025-01-01T00:00:00Z`）
- `${stopTime}`: 结束时间（RFC3339 格式，如 `2025-12-31T23:59:59Z`）

**步骤解析**：

1. `range(start: ${startTime}, stop: ${stopTime})`: 自定义时间范围
2. `filter(...)`: 过滤血压数据和指定用户
3. `group(columns: ["_field"])`: 按字段分组（systolic, diastolic, pulse）
4. `reduce(...)`: 自定义聚合函数，计算平均值、最大值、最小值、记录数
5. `map(...)`: 计算最终的平均值（总和 / 记录数）
6. `keep(...)`: 保留统计结果

### 返回结果示例

| \_field   | mean  | max   | min   | count |
| --------- | ----- | ----- | ----- | ----- |
| systolic  | 119.5 | 135.0 | 105.0 | 42    |
| diastolic | 79.2  | 92.0  | 68.0  | 42    |
| pulse     | 71.8  | 85.0  | 60.0  | 42    |

### 3.2 血糖统计查询

```flux
// 查询指定时间范围内的血糖统计数据（按测量时机分组）
from(bucket: "health_data")
  |> range(start: ${startTime}, stop: ${stopTime})
  |> filter(fn: (r) =>
      r._measurement == "blood_sugar" and
      r.user_id == "${userId}" and
      r._field == "value"
  )
  |> group(columns: ["timing"])
  |> reduce(
      fn: (r, accumulator) => ({
          timing: r.timing,
          mean: accumulator.mean + r._value,
          max: if r._value > accumulator.max then r._value else accumulator.max,
          min: if r._value < accumulator.min then r._value else accumulator.min,
          count: accumulator.count + 1.0
      }),
      identity: {timing: "", mean: 0.0, max: 0.0, min: 999.0, count: 0.0}
  )
  |> map(fn: (r) => ({
      r with
      mean: r.mean / r.count
  }))
  |> keep(columns: ["timing", "mean", "max", "min", "count"])
```

### 返回结果示例

| timing       | mean | max  | min | count |
| ------------ | ---- | ---- | --- | ----- |
| fasting      | 5.8  | 7.5  | 4.2 | 28    |
| postprandial | 7.2  | 10.1 | 5.5 | 25    |
| random       | 6.5  | 9.0  | 5.0 | 15    |

### 性能优化

- **预期响应时间**: < 100ms（自定义时间范围，最多 1 年数据）
- **优化手段**:
  - 限制查询时间范围（建议最多 1 年）
  - 使用 Tag 过滤（user_id, timing）
  - 服务器端聚合，减少数据传输

---

## 场景 4：查询最近一次打卡数据（最新值）

### 业务需求

获取用户最近一次的血压或血糖打卡数据，用于首页展示。

### Flux 查询语句（血压）

```flux
// 查询用户最近一次血压打卡数据
from(bucket: "health_data")
  |> range(start: -30d)
  |> filter(fn: (r) =>
      r._measurement == "blood_pressure" and
      r.user_id == "${userId}"
  )
  |> last()
  |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
  |> keep(columns: ["_time", "check_in_id", "systolic", "diastolic", "pulse"])
```

### 返回结果示例

| \_time               | check_in_id | systolic | diastolic | pulse |
| -------------------- | ----------- | -------- | --------- | ----- |
| 2025-12-23T08:30:00Z | 456         | 120.0    | 80.0      | 72    |

---

## 场景 5：查询异常数据（血压/血糖超标）

### 业务需求

筛选出用户所有异常的健康指标数据，用于医生诊断和健康预警。

### Flux 查询语句（血压异常）

```flux
// 查询最近 30 天的异常血压数据（收缩压 > 140 或舒张压 > 90）
from(bucket: "health_data")
  |> range(start: -30d, stop: now())
  |> filter(fn: (r) =>
      r._measurement == "blood_pressure" and
      r.user_id == "${userId}"
  )
  |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
  |> filter(fn: (r) =>
      r.systolic > 140.0 or r.diastolic > 90.0
  )
  |> keep(columns: ["_time", "check_in_id", "systolic", "diastolic", "pulse"])
  |> sort(columns: ["_time"], desc: true)
```

### Flux 查询语句（血糖异常）

```flux
// 查询最近 30 天的异常血糖数据
from(bucket: "health_data")
  |> range(start: -30d, stop: now())
  |> filter(fn: (r) =>
      r._measurement == "blood_sugar" and
      r.user_id == "${userId}" and
      r._field == "value"
  )
  |> filter(fn: (r) =>
      (r.timing == "fasting" and r._value > 7.0) or
      (r.timing == "postprandial" and r._value > 11.1) or
      (r.timing == "random" and r._value > 11.1)
  )
  |> keep(columns: ["_time", "check_in_id", "timing", "_value"])
  |> sort(columns: ["_time"], desc: true)
  |> rename(columns: {_value: "value"})
```

### 返回结果示例（血压异常）

| \_time               | check_in_id | systolic | diastolic | pulse |
| -------------------- | ----------- | -------- | --------- | ----- |
| 2025-12-23T08:30:00Z | 456         | 145.0    | 92.0      | 78    |
| 2025-12-20T09:00:00Z | 432         | 152.0    | 88.0      | 82    |
| 2025-12-18T07:30:00Z | 410         | 138.0    | 95.0      | 75    |

---

## 性能测试查询

### 测试查询响应时间

```flux
// 性能测试：查询 1 年的血压数据并聚合
import "profiler"

option profiler.enabledProfilers = ["query", "operator"]

from(bucket: "health_data")
  |> range(start: -365d, stop: now())
  |> filter(fn: (r) =>
      r._measurement == "blood_pressure" and
      r.user_id == "${userId}"
  )
  |> aggregateWindow(every: 1d, fn: mean, createEmpty: false)
  |> count()
```

**预期结果**：

- 数据量：365 天 × 2 次/天 = 730 条原始记录
- 聚合后：365 个数据点
- 响应时间：< 100ms

---

## 常见问题

### 1. 查询返回空结果

**可能原因**：

- 时间范围过小（如 `-1h`，但用户当天未打卡）
- Tag 过滤错误（user_id 不存在或拼写错误）
- Measurement 名称错误

**解决方法**：

- 扩大时间范围（如改为 `-30d`）
- 验证 user_id 是否正确
- 检查 measurement 名称（blood_pressure vs blood_sugar）

### 2. 查询响应时间过长

**可能原因**：

- 时间范围过大（如查询 5 年数据）
- 未使用聚合窗口，返回大量原始数据

**解决方法**：

- 限制时间范围（建议 ≤ 1 年）
- 使用 `aggregateWindow()` 聚合数据
- 使用 `limit()` 限制返回数量

### 3. pivot() 函数报错

**可能原因**：

- 数据中存在多个时间戳相同的记录
- rowKey 选择不唯一

**解决方法**：

- 在 pivot() 前使用 `group()` 确保数据分组正确
- 添加更多 rowKey（如 `rowKey:["_time", "check_in_id"]`）

---

## 总结

| 场景                 | 查询响应时间 | 数据量（30天） | 优化手段         |
| -------------------- | ------------ | -------------- | ---------------- |
| 最近 7 天血压趋势    | < 50ms       | 7 个数据点     | 按天聚合         |
| 最近 30 天血糖平均值 | < 80ms       | 3 个分组统计   | 按 timing 分组   |
| 自定义时间范围统计   | < 100ms      | 视时间范围而定 | 服务器端聚合     |
| 最近一次打卡数据     | < 30ms       | 1 条记录       | 使用 last() 函数 |
| 异常数据筛选         | < 60ms       | 约 5-10 条     | 过滤异常值       |

**核心优化原则**：

1. 始终限制时间范围
2. 优先使用 Tag 过滤
3. 服务器端聚合，减少数据传输
4. 避免客户端计算
