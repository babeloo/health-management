# EMQX 配置说明

本目录包含智慧慢病管理系统的 EMQX MQTT Broker 配置文件。

## 📁 文件结构

```
emqx/
├── emqx.conf          # EMQX 主配置文件
├── auth-pgsql.conf    # PostgreSQL 认证配置
├── acl.conf           # 访问控制列表 (ACL) 配置
└── README.md          # 本文件
```

## 🔐 认证机制

### 工作流程

1. **设备注册** (通过 NestJS 后端 API)

   ```
   POST /api/v1/devices
   {
     "deviceId": "AA:BB:CC:DD:EE:FF",
     "deviceType": "BLOOD_PRESSURE_MONITOR"
   }
   ```

   后端会生成:
   - `mqttUsername`: `device_AA_BB_CC_DD_EE_FF`
   - `mqttPassword`: 随机生成的16位密码 (仅返回一次)
   - `mqttPasswordHash`: bcrypt 加密后的密码哈希
   - `mqttClientId`: `mqtt_client_AA_BB_CC_DD_EE_FF`

2. **设备认证** (MQTT 连接)

   ```python
   # Python 示例
   import paho.mqtt.client as mqtt

   client = mqtt.Client(client_id="mqtt_client_AA_BB_CC_DD_EE_FF")
   client.username_pw_set("device_AA_BB_CC_DD_EE_FF", "password")
   client.connect("localhost", 1883, 60)
   ```

   EMQX 会:
   - 查询 `devices` 表,匹配 `mqtt_username`
   - 使用 bcrypt 验证密码
   - 检查设备状态是否为 `ACTIVE`

### 数据库查询

```sql
SELECT mqtt_password_hash as password_hash
FROM devices
WHERE mqtt_username = '${username}'
  AND status = 'ACTIVE'
LIMIT 1
```

## 🔒 ACL (访问控制)

### 规则设计

每个设备有两种访问权限:

1. **发布权限**: `devices/{deviceId}/data`
   - 设备上报健康数据(血压、血糖等)到此主题

2. **订阅权限**: `devices/{deviceId}/command`
   - 设备订阅此主题,接收服务器命令

### 数据库 ACL 查询

```sql
SELECT 'allow' as permission, action, topic
FROM (
  SELECT 'publish' as action,
         'devices/' || device_id || '/data' as topic
  FROM devices
  WHERE mqtt_username = '${username}'

  UNION ALL

  SELECT 'subscribe' as action,
         'devices/' || device_id || '/command' as topic
  FROM devices
  WHERE mqtt_username = '${username}'
) acl_rules
```

### 静态 ACL 规则

```hocon
# 允许所有客户端订阅自己的命令主题
{
  permission = allow
  action = subscribe
  topics = ["devices/+/command"]
}

# 拒绝访问其他设备的数据
{
  permission = deny
  action = all
  topics = ["devices/#"]
}

# 管理员拥有全部权限
{
  permission = allow
  principal = {username = "admin"}
  action = all
  topics = ["#"]
}
```

## 🚀 部署步骤

### 1. 启动服务

```bash
# 启动所有服务(包括 PostgreSQL 和 EMQX)
docker-compose up -d

# 查看 EMQX 日志
docker-compose logs -f emqx
```

### 2. 访问 EMQX Dashboard

- **URL**: <http://localhost:18083>
- **用户名**: `admin`
- **密码**: `emqx123` (可在 docker-compose.yml 中修改)

### 3. 验证配置

在 Dashboard 中:

1. 进入 **Authentication** → 检查 PostgreSQL 认证器是否启用
2. 进入 **Authorization** → 检查 ACL 规则是否加载
3. 进入 **Clients** → 查看已连接的设备

### 4. 创建 Prisma 迁移

```bash
cd backend
pnpm prisma migrate dev --name add_device_table
pnpm prisma generate
```

## 📊 使用示例

### 设备注册和绑定

```bash
# 1. 注册设备
curl -X POST http://localhost:3000/api/v1/devices \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "AA:BB:CC:DD:EE:FF",
    "deviceType": "BLOOD_PRESSURE_MONITOR",
    "deviceName": "我的血压计",
    "manufacturer": "Omron",
    "model": "HEM-7121"
  }'

# 响应:
{
  "code": 200,
  "message": "设备注册成功",
  "data": {
    "id": "uuid-...",
    "deviceId": "AA:BB:CC:DD:EE:FF",
    "deviceType": "BLOOD_PRESSURE_MONITOR",
    "mqttUsername": "device_AA_BB_CC_DD_EE_FF",
    "mqttPassword": "Xy9zP2mN5kL8qR4v", // ⚠️ 仅返回一次,请妥善保存
    "mqttClientId": "mqtt_client_AA_BB_CC_DD_EE_FF",
    "createdAt": "2025-12-27T..."
  }
}

# 2. 绑定设备到用户
curl -X POST http://localhost:3000/api/v1/devices/AA:BB:CC:DD:EE:FF/bind \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid-123"
  }'
```

### 设备连接和发布数据

```python
import paho.mqtt.client as mqtt
import json
import time

# MQTT 连接回调
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("✅ 连接成功!")
        # 订阅命令主题
        client.subscribe("devices/AA:BB:CC:DD:EE:FF/command")
    else:
        print(f"❌ 连接失败, 错误码: {rc}")

# 消息接收回调
def on_message(client, userdata, msg):
    print(f"📩 收到命令: {msg.topic} - {msg.payload.decode()}")

# 创建客户端
client = mqtt.Client(client_id="mqtt_client_AA_BB_CC_DD_EE_FF")
client.username_pw_set("device_AA_BB_CC_DD_EE_FF", "Xy9zP2mN5kL8qR4v")
client.on_connect = on_connect
client.on_message = on_message

# 连接 EMQX
client.connect("localhost", 1883, 60)
client.loop_start()

# 发布血压数据
while True:
    data = {
        "deviceId": "AA:BB:CC:DD:EE:FF",
        "timestamp": int(time.time() * 1000),
        "type": "blood_pressure",
        "data": {
            "systolic": 120,
            "diastolic": 80,
            "pulse": 75
        }
    }

    result = client.publish(
        "devices/AA:BB:CC:DD:EE:FF/data",
        json.dumps(data),
        qos=1
    )

    if result.rc == 0:
        print(f"✅ 数据发布成功: {data}")
    else:
        print(f"❌ 数据发布失败, 错误码: {result.rc}")

    time.sleep(60)  # 每分钟上报一次
```

## 🧪 测试

### 使用 MQTT 客户端工具测试

推荐工具: [MQTTX](https://mqttx.app/)

**连接参数**:

- **Host**: `localhost`
- **Port**: `1883`
- **Client ID**: `mqtt_client_AA_BB_CC_DD_EE_FF`
- **Username**: `device_AA_BB_CC_DD_EE_FF`
- **Password**: (设备注册时返回的密码)

**测试发布**:

- **Topic**: `devices/AA:BB:CC:DD:EE:FF/data`
- **Payload**:

  ```json
  {
    "deviceId": "AA:BB:CC:DD:EE:FF",
    "timestamp": 1735304000000,
    "type": "blood_pressure",
    "data": {
      "systolic": 120,
      "diastolic": 80
    }
  }
  ```

**测试订阅**:

- **Topic**: `devices/AA:BB:CC:DD:EE:FF/command`

## 🔍 故障排查

### 问题 1: 认证失败

**症状**: 设备连接时返回 "Authentication failed"

**检查步骤**:

1. 确认数据库连接正常:

   ```bash
   docker-compose logs postgres
   ```

2. 检查设备记录是否存在:

   ```sql
   SELECT * FROM devices WHERE mqtt_username = 'device_AA_BB_CC_DD_EE_FF';
   ```

3. 检查设备状态是否为 ACTIVE:

   ```sql
   SELECT status FROM devices WHERE mqtt_username = 'device_AA_BB_CC_DD_EE_FF';
   ```

4. 查看 EMQX 认证日志:

   ```bash
   docker-compose logs emqx | grep -i auth
   ```

### 问题 2: ACL 拒绝访问

**症状**: 设备连接成功,但发布/订阅被拒绝

**检查步骤**:

1. 在 EMQX Dashboard 中查看 **Clients** → 选择设备 → **ACL**

2. 检查 ACL 查询是否返回正确结果:

   ```sql
   SELECT 'allow' as permission, action, topic
   FROM (
     SELECT 'publish' as action,
            'devices/' || device_id || '/data' as topic
     FROM devices
     WHERE mqtt_username = 'device_AA_BB_CC_DD_EE_FF'
   ) acl_rules;
   ```

3. 查看 EMQX ACL 日志:

   ```bash
   docker-compose logs emqx | grep -i acl
   ```

### 问题 3: 配置文件未加载

**症状**: 配置修改后未生效

**解决方案**:

```bash
# 重启 EMQX 容器
docker-compose restart emqx

# 或重新加载配置 (进入容器执行)
docker exec -it emqx emqx ctl reload
```

## 📚 相关资源

- [EMQX 官方文档](https://www.emqx.io/docs)
- [PostgreSQL 认证配置](https://www.emqx.io/docs/zh/latest/access-control/authn/pgsql.html)
- [EMQX ACL 配置](https://www.emqx.io/docs/zh/latest/access-control/authz/postgresql.html)
- [MQTT 协议规范](https://mqtt.org/mqtt-specification/)
- [NestJS 设备管理 API 文档](../backend/README.md)

## 🔒 安全建议

1. **生产环境配置**:
   - 修改默认的 Dashboard 密码
   - 启用 SSL/TLS 加密 (端口 8883)
   - 使用强密码策略

2. **网络安全**:
   - 仅暴露必要的端口
   - 使用防火墙限制访问
   - 配置 IP 白名单

3. **定期维护**:
   - 定期更新 EMQX 版本
   - 监控设备连接异常
   - 定期审计 ACL 规则

---

**维护者**: @data-infra
**最后更新**: 2025-12-27
