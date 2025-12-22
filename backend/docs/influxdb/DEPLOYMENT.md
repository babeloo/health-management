# InfluxDB 部署与配置指南

## 1. 环境要求

- Docker 20.10+
- Docker Compose 1.29+
- Node.js 18+
- InfluxDB 2.7

## 2. Docker Compose 配置

### 当前配置（docker-compose.yml）

```yaml
influxdb:
  image: influxdb:2.7-alpine
  container_name: influxdb
  environment:
    DOCKER_INFLUXDB_INIT_MODE: setup
    DOCKER_INFLUXDB_INIT_USERNAME: admin
    DOCKER_INFLUXDB_INIT_PASSWORD: ${INFLUX_PASSWORD:-influx123}
    DOCKER_INFLUXDB_INIT_ORG: vakyi
    DOCKER_INFLUXDB_INIT_BUCKET: health_data
    DOCKER_INFLUXDB_INIT_ADMIN_TOKEN: ${INFLUX_TOKEN:-my-super-secret-auth-token}
  volumes:
    - influxdb_data:/var/lib/influxdb2
  ports:
    - '8086:8086'
  networks:
    - health-mgmt
```

### 配置说明

| 环境变量                         | 说明         | 默认值                     | 生产环境建议                      |
| -------------------------------- | ------------ | -------------------------- | --------------------------------- |
| DOCKER_INFLUXDB_INIT_MODE        | 初始化模式   | setup                      | 保持不变                          |
| DOCKER_INFLUXDB_INIT_USERNAME    | 管理员用户名 | admin                      | 修改为复杂用户名                  |
| DOCKER_INFLUXDB_INIT_PASSWORD    | 管理员密码   | influx123                  | 修改为强密码（≥16位，含特殊字符） |
| DOCKER_INFLUXDB_INIT_ORG         | 组织名称     | vakyi                      | 根据实际组织名称修改              |
| DOCKER_INFLUXDB_INIT_BUCKET      | Bucket 名称  | health_data                | 保持不变                          |
| DOCKER_INFLUXDB_INIT_ADMIN_TOKEN | Admin Token  | my-super-secret-auth-token | 修改为随机生成的 Token（≥64位）   |

### 生产环境优化配置

```yaml
influxdb:
  image: influxdb:2.7-alpine
  container_name: influxdb
  environment:
    DOCKER_INFLUXDB_INIT_MODE: setup
    DOCKER_INFLUXDB_INIT_USERNAME: ${INFLUX_ADMIN_USER}
    DOCKER_INFLUXDB_INIT_PASSWORD: ${INFLUX_ADMIN_PASSWORD}
    DOCKER_INFLUXDB_INIT_ORG: ${INFLUX_ORG}
    DOCKER_INFLUXDB_INIT_BUCKET: health_data
    DOCKER_INFLUXDB_INIT_ADMIN_TOKEN: ${INFLUX_ADMIN_TOKEN}
  volumes:
    - influxdb_data:/var/lib/influxdb2
  ports:
    - '8086:8086'
  networks:
    - health-mgmt
  restart: unless-stopped
  deploy:
    resources:
      limits:
        cpus: '2.0'
        memory: 2G
      reservations:
        cpus: '1.0'
        memory: 1G
  healthcheck:
    test: ['CMD', 'influx', 'ping']
    interval: 30s
    timeout: 10s
    retries: 3
```

## 3. 环境变量配置

### backend/.env 配置

```env
# InfluxDB 配置
INFLUX_URL=http://localhost:8086
INFLUX_TOKEN=my-super-secret-auth-token
INFLUX_ORG=vakyi
INFLUX_BUCKET=health_data
```

### 生产环境 .env.production

```env
# InfluxDB 配置（生产环境）
INFLUX_URL=http://influxdb:8086          # 容器内部访问
INFLUX_TOKEN=${INFLUX_ADMIN_TOKEN}       # 使用环境变量注入
INFLUX_ORG=intl-health-mgmt              # 组织名称
INFLUX_BUCKET=health_data                # Bucket 名称

# 安全注意事项：
# 1. INFLUX_TOKEN 必须从密钥管理系统（如 AWS Secrets Manager、Vault）读取
# 2. 禁止将生产环境 Token 硬编码到代码或配置文件中
# 3. Token 权限应设置为最小化（只授予 health_data bucket 的读写权限）
```

## 4. 启动与验证

### 4.1 启动 InfluxDB 服务

```bash
# 启动 InfluxDB 容器
docker-compose up -d influxdb

# 查看启动日志
docker-compose logs -f influxdb

# 验证容器状态
docker ps | grep influxdb
```

### 4.2 验证 InfluxDB 连接

**方法 1：使用 Docker CLI**

```bash
# 进入容器
docker exec -it influxdb bash

# 测试连接
influx ping --host http://localhost:8086

# 列出 Buckets
influx bucket list --org vakyi --token my-super-secret-auth-token

# 列出 Tokens
influx auth list --org vakyi --token my-super-secret-auth-token

# 退出容器
exit
```

**方法 2：使用 InfluxDB Web UI**

1. 打开浏览器访问：http://localhost:8086
2. 使用管理员账户登录（用户名：admin，密码：influx123）
3. 导航至 **Data Explorer** 验证 Bucket `health_data` 存在
4. 导航至 **API Tokens** 验证 Token 配置正确

**方法 3：使用 NestJS 后端验证**

```bash
cd backend

# 启动后端服务
pnpm dev

# 查看日志，确认以下输出：
# [InfluxService] InfluxDB 客户端已初始化: http://localhost:8086, org=vakyi, bucket=health_data
# [InfluxService] ✅ InfluxDB 连接成功: http://localhost:8086
```

## 5. 数据写入测试

### 5.1 手动写入血压数据

```bash
# 使用 curl 写入血压数据
curl -XPOST "http://localhost:8086/api/v2/write?org=vakyi&bucket=health_data&precision=s" \
  --header "Authorization: Token my-super-secret-auth-token" \
  --data-raw "blood_pressure,user_id=test_user_1,check_in_id=test_001 systolic=120,diastolic=80,pulse=72 $(date +%s)"

# 验证写入成功
docker exec influxdb influx query 'from(bucket:"health_data") |> range(start: -1h) |> filter(fn: (r) => r._measurement == "blood_pressure")' --org vakyi --token my-super-secret-auth-token
```

### 5.2 手动写入血糖数据

```bash
# 使用 curl 写入血糖数据
curl -XPOST "http://localhost:8086/api/v2/write?org=vakyi&bucket=health_data&precision=s" \
  --header "Authorization: Token my-super-secret-auth-token" \
  --data-raw "blood_sugar,user_id=test_user_1,check_in_id=test_002,timing=fasting value=5.6 $(date +%s)"

# 验证写入成功
docker exec influxdb influx query 'from(bucket:"health_data") |> range(start: -1h) |> filter(fn: (r) => r._measurement == "blood_sugar")' --org vakyi --token my-super-secret-auth-token
```

## 6. Flux 查询测试

### 6.1 查询最近 7 天血压数据

```bash
docker exec influxdb influx query '
from(bucket: "health_data")
  |> range(start: -7d, stop: now())
  |> filter(fn: (r) =>
      r._measurement == "blood_pressure" and
      r.user_id == "test_user_1"
  )
  |> aggregateWindow(every: 1d, fn: mean, createEmpty: false)
  |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
  |> keep(columns: ["_time", "systolic", "diastolic", "pulse"])
  |> sort(columns: ["_time"], desc: false)
' --org vakyi --token my-super-secret-auth-token
```

### 6.2 查询最近 30 天血糖平均值

```bash
docker exec influxdb influx query '
from(bucket: "health_data")
  |> range(start: -30d, stop: now())
  |> filter(fn: (r) =>
      r._measurement == "blood_sugar" and
      r.user_id == "test_user_1" and
      r._field == "value"
  )
  |> group(columns: ["timing"])
  |> mean()
  |> rename(columns: {_value: "avg_value"})
  |> keep(columns: ["timing", "avg_value"])
' --org vakyi --token my-super-secret-auth-token
```

## 7. 性能优化

### 7.1 索引优化

InfluxDB 会自动为 Tags 创建 TSI（Time Series Index），无需手动配置。

**优化建议**：

1. **高频过滤字段设置为 Tag**：`user_id`, `check_in_id`, `timing`
2. **低基数字段设置为 Tag**：`timing`（只有 3 个值）
3. **数值字段设置为 Field**：`systolic`, `diastolic`, `pulse`, `value`

### 7.2 查询优化

| 优化手段       | 说明                                  | 效果提升 |
| -------------- | ------------------------------------- | -------- |
| 限制时间范围   | 使用 `range(start: -7d)` 而非全表扫描 | 10-50x   |
| Tag 过滤前置   | 先过滤 Tag（user_id），再过滤 Field   | 5-10x    |
| 聚合窗口       | 使用 `aggregateWindow(every: 1d)`     | 2-5x     |
| 避免客户端计算 | 在 InfluxDB 中完成聚合，减少网络传输  | 3-10x    |
| 使用 pivot()   | 将多行转多列，减少客户端处理复杂度    | 2x       |

### 7.3 写入优化

**批量写入**（推荐）：

```typescript
// 单个写入（不推荐）
await influxService.writeBloodPressure(userId, checkInId, 120, 80, 72);
await influxService.writeBloodPressure(userId, checkInId2, 125, 82, 75);

// 批量写入（推荐）
const points = [
  new Point('blood_pressure').tag('user_id', userId).tag('check_in_id', checkInId).floatField('systolic', 120)...,
  new Point('blood_pressure').tag('user_id', userId).tag('check_in_id', checkInId2).floatField('systolic', 125)...,
];
writeApi.writePoints(points);
await writeApi.flush();
```

**写入频率控制**：

- 健康打卡为低频操作（每天 1-3 次），无需特殊优化
- 如果未来引入连续监测设备（如血糖仪每分钟上报），需启用批量写入

### 7.4 数据保留策略

**当前配置**：`infinite`（永久保存）

**推荐生产配置**：

```bash
# 创建保留策略：原始数据保留 2 年
influx bucket update \
  --name health_data \
  --retention 17520h \
  --org vakyi \
  --token my-super-secret-auth-token

# 创建降采样 Task：每天聚合数据保留 10 年
influx task create \
  --name health_data_downsample \
  --org vakyi \
  --token my-super-secret-auth-token \
  --every 1d \
  --flux '
option task = {name: "health_data_downsample", every: 1d}

from(bucket: "health_data")
  |> range(start: -1d)
  |> filter(fn: (r) => r._measurement == "blood_pressure" or r._measurement == "blood_sugar")
  |> aggregateWindow(every: 1d, fn: mean, createEmpty: false)
  |> to(bucket: "health_data_downsampled", org: "vakyi")
'
```

## 8. 安全配置

### 8.1 Token 权限最小化

**创建只读 Token**（用于查询 API）：

```bash
# 创建只读 Token
docker exec influxdb influx auth create \
  --org vakyi \
  --read-bucket 5dc35e059361b084 \
  --description "Read-only token for health_data bucket" \
  --token my-super-secret-auth-token
```

**创建读写 Token**（用于后端服务）：

```bash
# 创建读写 Token
docker exec influxdb influx auth create \
  --org vakyi \
  --read-bucket 5dc35e059361b084 \
  --write-bucket 5dc35e059361b084 \
  --description "Read-write token for backend service" \
  --token my-super-secret-auth-token
```

### 8.2 网络隔离

**生产环境 Docker Compose 配置**：

```yaml
influxdb:
  image: influxdb:2.7-alpine
  container_name: influxdb
  environment:
    DOCKER_INFLUXDB_INIT_MODE: setup
    # ... 其他配置
  volumes:
    - influxdb_data:/var/lib/influxdb2
  ports:
    # 仅在内网暴露端口，禁止公网访问
    - '127.0.0.1:8086:8086'
  networks:
    - health-mgmt
```

### 8.3 HTTPS 配置（生产环境必须）

**使用 Nginx 反向代理**：

```nginx
server {
    listen 443 ssl;
    server_name influx.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/influx.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/influx.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://influxdb:8086;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 9. 监控与告警

### 9.1 InfluxDB 自带监控

访问 InfluxDB Web UI：http://localhost:8086

导航至 **Monitoring & Alerting** 查看：

- 写入速率（Points/s）
- 查询响应时间（P95, P99）
- 磁盘使用率
- 内存使用率

### 9.2 Prometheus 集成（推荐）

**InfluxDB Metrics Endpoint**：

```bash
# InfluxDB 2.x 内置 Prometheus metrics
curl http://localhost:8086/metrics
```

**Prometheus 配置**（prometheus.yml）：

```yaml
scrape_configs:
  - job_name: 'influxdb'
    static_configs:
      - targets: ['influxdb:8086']
```

### 9.3 告警规则

**Grafana 告警配置**：

1. **写入失败率 > 1%**：触发告警
2. **查询响应时间 P95 > 200ms**：触发告警
3. **磁盘使用率 > 80%**：触发警告
4. **磁盘使用率 > 90%**：触发紧急告警

## 10. 故障排查

### 10.1 容器无法启动

**问题**：`docker-compose up -d influxdb` 失败

**排查步骤**：

```bash
# 1. 查看容器日志
docker-compose logs influxdb

# 2. 检查端口占用
netstat -ano | findstr 8086

# 3. 检查磁盘空间
docker system df

# 4. 重新创建容器
docker-compose down
docker-compose up -d influxdb
```

### 10.2 连接超时

**问题**：后端服务报错 `InfluxDB 连接失败: connect ECONNREFUSED`

**排查步骤**：

```bash
# 1. 验证容器是否运行
docker ps | grep influxdb

# 2. 验证网络连通性
docker exec -it backend ping influxdb

# 3. 验证端口映射
docker port influxdb

# 4. 检查 .env 配置
cat backend/.env | grep INFLUX
```

### 10.3 查询返回空结果

**问题**：Flux 查询返回空数组 `[]`

**排查步骤**：

```bash
# 1. 验证数据是否写入成功
docker exec influxdb influx query '
from(bucket: "health_data")
  |> range(start: -30d)
  |> filter(fn: (r) => r._measurement == "blood_pressure")
  |> count()
' --org vakyi --token my-super-secret-auth-token

# 2. 检查 user_id 是否正确
docker exec influxdb influx query '
from(bucket: "health_data")
  |> range(start: -30d)
  |> filter(fn: (r) => r._measurement == "blood_pressure")
  |> keep(columns: ["user_id"])
  |> distinct(column: "user_id")
' --org vakyi --token my-super-secret-auth-token

# 3. 扩大时间范围重试
# 将 range(start: -7d) 改为 range(start: -30d)
```

### 10.4 性能问题

**问题**：查询响应时间 > 500ms

**排查步骤**：

```bash
# 1. 检查数据量
docker exec influxdb influx query '
from(bucket: "health_data")
  |> range(start: -365d)
  |> filter(fn: (r) => r._measurement == "blood_pressure")
  |> count()
' --org vakyi --token my-super-secret-auth-token

# 2. 优化查询（添加 aggregateWindow）
# 将原始数据查询改为聚合查询

# 3. 检查容器资源限制
docker stats influxdb

# 4. 增加容器资源
# 在 docker-compose.yml 中增加 CPU 和内存限制
```

## 11. 备份与恢复

### 11.1 数据备份

```bash
# 备份 InfluxDB 数据（包含所有 Buckets）
docker exec influxdb influx backup /tmp/backup \
  --token my-super-secret-auth-token

# 从容器复制备份文件到宿主机
docker cp influxdb:/tmp/backup ./influxdb-backup-$(date +%Y%m%d)

# 清理容器内备份文件
docker exec influxdb rm -rf /tmp/backup
```

### 11.2 数据恢复

```bash
# 将备份文件复制到容器
docker cp ./influxdb-backup-20250101 influxdb:/tmp/restore

# 恢复数据
docker exec influxdb influx restore /tmp/restore \
  --token my-super-secret-auth-token

# 清理容器内备份文件
docker exec influxdb rm -rf /tmp/restore
```

## 12. 常见问题 FAQ

### Q1: InfluxDB 1.x 和 2.x 有什么区别？

**A**: 本项目使用 InfluxDB 2.x，主要区别：

- InfluxDB 1.x 使用 InfluxQL 查询语言，2.x 使用 Flux
- 2.x 引入 Organization 和 Bucket 概念，替代 1.x 的 Database
- 2.x 内置 Web UI，更易于管理
- 2.x 性能和压缩率更优

### Q2: 如何生成安全的 Token？

**A**: 使用以下方法生成：

```bash
# Linux/Mac
openssl rand -hex 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))

# 或使用在线工具
# https://www.random.org/strings/
```

### Q3: InfluxDB 和 PostgreSQL 如何协作？

**A**: 分工明确：

- **PostgreSQL**：存储关系型数据（用户信息、打卡记录元数据、健康档案）
- **InfluxDB**：存储时序数据（血压、血糖的具体数值）
- **关联方式**：通过 `check_in_id` 关联查询

### Q4: 如何迁移 PostgreSQL 中的历史数据到 InfluxDB？

**A**: 参考迁移脚本（后续提供）：

1. 从 PostgreSQL 查询历史健康数据
2. 转换为 InfluxDB Line Protocol 格式
3. 批量写入 InfluxDB
4. 验证数据一致性

### Q5: InfluxDB 支持事务吗？

**A**: InfluxDB 不支持传统的 ACID 事务，但提供：

- **原子写入**：单个 Point 写入要么成功，要么失败
- **最终一致性**：分布式场景下保证最终一致性
- **降级策略**：后端代码中已实现失败时记录日志但不抛异常

## 13. 参考资源

- **InfluxDB 官方文档**：https://docs.influxdata.com/influxdb/v2.7/
- **Flux 语法参考**：https://docs.influxdata.com/flux/v0.x/
- **Node.js 客户端文档**：https://github.com/influxdata/influxdb-client-js
- **性能优化指南**：https://docs.influxdata.com/influxdb/v2.7/write-data/best-practices/

---

**文档版本**：v1.0
**最后更新**：2025-12-23
**维护者**：data-infra team
