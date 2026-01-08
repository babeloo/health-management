# InfluxDB 时序数据存储集成

## 📚 文档导航

本目录包含 InfluxDB 时序数据库集成的完整文档和代码。

### 核心文档

1. **[INFLUXDB_SCHEMA.md](./INFLUXDB_SCHEMA.md)** - 数据模型设计
   - 血压和血糖的 Measurement 定义
   - Tags 和 Fields 设计
   - 数据写入策略
   - 数据保留策略

2. **[FLUX_QUERIES.md](./FLUX_QUERIES.md)** - Flux 查询语句
   - 场景 1: 查询最近 7 天血压趋势（按天聚合）
   - 场景 2: 查询最近 30 天血糖平均值（按测量时机分组）
   - 场景 3: 查询指定时间范围的聚合数据（健康报告）
   - 场景 4: 查询最近一次打卡数据
   - 场景 5: 查询异常数据（血压/血糖超标）

3. **[DEPLOYMENT.md](./DEPLOYMENT.md)** - 部署与配置指南
   - Docker Compose 配置
   - 环境变量配置
   - 启动与验证
   - 性能优化
   - 安全配置
   - 监控与告警
   - 故障排查
   - 备份与恢复

### 核心代码

| 文件                | 说明                                      |
| ------------------- | ----------------------------------------- |
| `influx.config.ts`  | InfluxDB 配置（从环境变量加载）           |
| `influx.module.ts`  | InfluxDB 模块（全局模块，供其他模块使用） |
| `influx.service.ts` | InfluxDB 服务（封装写入和查询方法）       |

## 🚀 快速开始

### 1. 启动 InfluxDB 服务

```bash
# 在项目根目录执行
docker-compose up -d influxdb

# 查看启动日志
docker-compose logs -f influxdb
```

### 2. 验证连接

```bash
# 方法 1：使用 Docker CLI
docker exec influxdb influx ping --host http://localhost:8086

# 方法 2：访问 Web UI
# 浏览器打开：http://localhost:8086
# 用户名：admin
# 密码：influx123

# 方法 3：启动后端服务验证
cd backend
pnpm dev
# 查看日志输出：✅ InfluxDB 连接成功
```

### 3. 写入测试数据

```bash
# 写入血压数据
curl -XPOST "http://localhost:8086/api/v2/write?org=vakyi&bucket=health_data&precision=s" \
  --header "Authorization: Token my-super-secret-auth-token" \
  --data-raw "blood_pressure,user_id=test_user_1,check_in_id=test_001 systolic=120,diastolic=80,pulse=72 $(date +%s)"

# 写入血糖数据
curl -XPOST "http://localhost:8086/api/v2/write?org=vakyi&bucket=health_data&precision=s" \
  --header "Authorization: Token my-super-secret-auth-token" \
  --data-raw "blood_sugar,user_id=test_user_1,check_in_id=test_002,timing=fasting value=5.6 $(date +%s)"
```

### 4. 查询测试数据

```bash
# 查询血压数据
docker exec influxdb influx query '
from(bucket: "health_data")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "blood_pressure")
' --org vakyi --token my-super-secret-auth-token

# 查询血糖数据
docker exec influxdb influx query '
from(bucket: "health_data")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "blood_sugar")
' --org vakyi --token my-super-secret-auth-token
```

## 📊 数据模型概览

### Measurement: blood_pressure（血压）

| 字段类型  | 字段名      | 数据类型 | 说明            |
| --------- | ----------- | -------- | --------------- |
| Tag       | user_id     | string   | 用户 ID（索引） |
| Tag       | check_in_id | string   | 打卡记录 ID     |
| Field     | systolic    | float    | 收缩压（mmHg）  |
| Field     | diastolic   | float    | 舒张压（mmHg）  |
| Field     | pulse       | integer  | 心率（次/分钟） |
| Timestamp | \_time      | RFC3339  | 打卡时间（UTC） |

### Measurement: blood_sugar（血糖）

| 字段类型  | 字段名      | 数据类型 | 说明                                    |
| --------- | ----------- | -------- | --------------------------------------- |
| Tag       | user_id     | string   | 用户 ID（索引）                         |
| Tag       | check_in_id | string   | 打卡记录 ID                             |
| Tag       | timing      | string   | 测量时机（fasting/postprandial/random） |
| Field     | value       | float    | 血糖值（mmol/L）                        |
| Timestamp | \_time      | RFC3339  | 打卡时间（UTC）                         |

## 🔧 NestJS 服务使用示例

### 写入数据

```typescript
import { Injectable } from '@nestjs/common';
import { InfluxService } from '../common/influx/influx.service';

@Injectable()
export class HealthCheckInService {
  constructor(private readonly influxService: InfluxService) {}

  async createBloodPressureCheckIn(userId: string, data: any) {
    // 1. 写入 PostgreSQL（打卡记录元数据）
    const checkIn = await this.prisma.checkIn.create({ ... });

    // 2. 写入 InfluxDB（血压时序数据）
    await this.influxService.writeBloodPressure(
      userId,
      checkIn.id,
      { systolic: 120, diastolic: 80, pulse: 72 }
    );

    return checkIn;
  }
}
```

### 查询数据

```typescript
@Injectable()
export class HealthReportService {
  constructor(private readonly influxService: InfluxService) {}

  async getBloodPressureTrend(userId: string) {
    // 查询最近 7 天血压趋势（按天聚合）
    const trend = await this.influxService.queryBloodPressureTrend(userId, 7);

    return {
      userId,
      trend, // [{ time, systolic, diastolic, pulse }, ...]
    };
  }

  async getBloodSugarStats(userId: string) {
    // 查询最近 30 天血糖统计（按测量时机分组）
    const stats = await this.influxService.queryBloodSugarStats(userId, 30);

    return {
      userId,
      stats, // [{ timing: 'fasting', avgValue: 5.8 }, ...]
    };
  }
}
```

## 📈 性能指标

| 查询场景             | 数据量     | 响应时间 | 优化手段         |
| -------------------- | ---------- | -------- | ---------------- |
| 最近 7 天血压趋势    | 7 个数据点 | < 50ms   | 按天聚合         |
| 最近 30 天血糖平均值 | 3 个分组   | < 80ms   | 按 timing 分组   |
| 自定义时间范围统计   | 视范围而定 | < 100ms  | 服务器端聚合     |
| 最近一次打卡数据     | 1 条记录   | < 30ms   | 使用 last() 函数 |
| 异常数据筛选         | 5-10 条    | < 60ms   | 过滤异常值       |

## ⚙️ 配置说明

### 环境变量（backend/.env）

```env
# InfluxDB 配置
INFLUX_URL=http://localhost:8086               # InfluxDB 地址
INFLUX_TOKEN=my-super-secret-auth-token        # Admin Token
INFLUX_ORG=vakyi                               # 组织名称
INFLUX_BUCKET=health_data                      # Bucket 名称
```

### Docker Compose 配置

```yaml
influxdb:
  image: influxdb:2.7-alpine
  container_name: influxdb
  environment:
    DOCKER_INFLUXDB_INIT_MODE: setup
    DOCKER_INFLUXDB_INIT_USERNAME: admin
    DOCKER_INFLUXDB_INIT_PASSWORD: influx123
    DOCKER_INFLUXDB_INIT_ORG: vakyi
    DOCKER_INFLUXDB_INIT_BUCKET: health_data
    DOCKER_INFLUXDB_INIT_ADMIN_TOKEN: my-super-secret-auth-token
  volumes:
    - influxdb_data:/var/lib/influxdb2
  ports:
    - '8086:8086'
```

## 🛡️ 安全注意事项

1. **生产环境必须修改默认密码和 Token**
   - 使用强密码（≥16位，含特殊字符）
   - 使用随机生成的 Token（≥64位）

2. **Token 权限最小化**
   - 只授予 `health_data` bucket 的读写权限
   - 禁止使用 Admin Token 在应用代码中

3. **网络隔离**
   - 生产环境禁止将 8086 端口暴露到公网
   - 使用 Nginx 反向代理并启用 HTTPS

4. **数据加密**
   - 使用 HTTPS 传输数据
   - 启用 InfluxDB 数据加密（企业版功能）

## 🔍 故障排查

### 问题 1: 容器无法启动

```bash
# 查看日志
docker-compose logs influxdb

# 检查端口占用
netstat -ano | findstr 8086

# 重新创建容器
docker-compose down
docker-compose up -d influxdb
```

### 问题 2: 连接超时

```bash
# 验证容器运行状态
docker ps | grep influxdb

# 测试网络连通性
docker exec -it backend ping influxdb

# 检查环境变量配置
cat backend/.env | grep INFLUX
```

### 问题 3: 查询返回空结果

```bash
# 验证数据是否写入成功
docker exec influxdb influx query '
from(bucket: "health_data")
  |> range(start: -30d)
  |> filter(fn: (r) => r._measurement == "blood_pressure")
  |> count()
' --org vakyi --token my-super-secret-auth-token

# 检查 user_id 是否正确
# 扩大时间范围重试
```

## 📚 相关资源

- **InfluxDB 官方文档**：<https://docs.influxdata.com/influxdb/v2.7/>
- **Flux 语法参考**：<https://docs.influxdata.com/flux/v0.x/>
- **Node.js 客户端文档**：<https://github.com/influxdata/influxdb-client-js>
- **性能优化指南**：<https://docs.influxdata.com/influxdb/v2.7/write-data/best-practices/>

## 📝 待办事项

- [ ] 实现数据迁移脚本（从 PostgreSQL 迁移历史数据）
- [ ] 配置降采样 Task（原始数据保留 2 年，降采样数据保留 10 年）
- [ ] 集成 Prometheus 监控
- [ ] 配置 Grafana 告警
- [ ] 编写 E2E 测试

---

**文档版本**：v1.0
**最后更新**：2025-12-23
**维护者**：data-infra team
