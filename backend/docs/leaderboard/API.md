# 积分排行榜 API 文档

## 概述

积分排行榜功能允许用户查看积分排名，支持总榜和周榜两种时间维度。使用 Redis Sorted Set 实现高性能排行榜查询。

## 核心特性

- **实时更新**：每次积分变化立即更新排行榜
- **多时间维度**：支持总榜（all-time）和周榜（weekly）
- **性能优化**：
  - 使用 Redis Sorted Set 存储排行榜数据
  - 批量查询用户信息，避免 N+1 查询
  - 查询响应时间 < 200ms
- **用户友好**：
  - 显示用户自己的排名（即使不在 Top N）
  - 支持自定义排行榜显示数量（1-500名）

## API 端点

### 获取积分排行榜

**接口**：`GET /api/v1/points/leaderboard`

**认证**：需要 JWT Token

**请求参数**：

| 参数        | 类型    | 必填 | 默认值   | 说明                                                  |
| ----------- | ------- | ---- | -------- | ----------------------------------------------------- |
| period      | string  | 否   | all-time | 排行榜时间维度：`all-time`（总榜）或 `weekly`（周榜） |
| limit       | number  | 否   | 100      | 返回前 N 名（范围：1-500）                            |
| includeSelf | boolean | 否   | true     | 是否包含当前用户排名                                  |

**响应示例**（总榜）：

```json
{
  "period": "all-time",
  "periodLabel": "总榜",
  "topEntries": [
    {
      "rank": 1,
      "userId": "user-123",
      "username": "zhangsan",
      "fullName": "张三",
      "avatarUrl": "https://minio.example.com/avatars/123.jpg",
      "points": 1200
    },
    {
      "rank": 2,
      "userId": "user-456",
      "username": "lisi",
      "fullName": "李四",
      "avatarUrl": "https://minio.example.com/avatars/456.jpg",
      "points": 1150
    },
    {
      "rank": 3,
      "userId": "user-789",
      "username": "wangwu",
      "fullName": "王五",
      "avatarUrl": null,
      "points": 1080
    }
  ],
  "currentUser": {
    "rank": 78,
    "userId": "current-user-id",
    "username": "zhaoliu",
    "fullName": "赵六",
    "avatarUrl": null,
    "points": 500
  },
  "totalUsers": 1520
}
```

**响应示例**（周榜）：

```json
{
  "period": "weekly",
  "periodLabel": "2025年第51周",
  "topEntries": [
    {
      "rank": 1,
      "userId": "user-456",
      "username": "lisi",
      "fullName": "李四",
      "avatarUrl": "https://minio.example.com/avatars/456.jpg",
      "points": 350
    }
  ],
  "currentUser": {
    "rank": 25,
    "userId": "current-user-id",
    "username": "zhaoliu",
    "fullName": "赵六",
    "avatarUrl": null,
    "points": 120
  },
  "totalUsers": 856
}
```

**状态码**：

- `200 OK`：查询成功
- `401 Unauthorized`：未认证
- `500 Internal Server Error`：服务器内部错误

## 使用示例

### cURL 示例

**查询总榜 Top 100**：

```bash
curl -X GET "http://localhost:5000/api/v1/points/leaderboard" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**查询周榜 Top 50**：

```bash
curl -X GET "http://localhost:5000/api/v1/points/leaderboard?period=weekly&limit=50" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**查询总榜 Top 10（不包含当前用户排名）**：

```bash
curl -X GET "http://localhost:5000/api/v1/points/leaderboard?limit=10&includeSelf=false" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript/TypeScript 示例

```typescript
// 使用 axios
import axios from 'axios';

async function getLeaderboard(
  token: string,
  period: 'all-time' | 'weekly' = 'all-time',
  limit: number = 100,
) {
  const response = await axios.get('http://localhost:5000/api/v1/points/leaderboard', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    params: {
      period,
      limit,
      includeSelf: true,
    },
  });

  return response.data;
}

// 获取总榜
const allTimeLeaderboard = await getLeaderboard(token);
console.log('总榜前10名:', allTimeLeaderboard.topEntries.slice(0, 10));
console.log('我的排名:', allTimeLeaderboard.currentUser.rank);

// 获取周榜
const weeklyLeaderboard = await getLeaderboard(token, 'weekly');
console.log('本周排名:', weeklyLeaderboard.topEntries.slice(0, 10));
```

### Vue 3 (Uni-app) 示例

```vue
<template>
  <view class="leaderboard-page">
    <view class="tabs">
      <view :class="['tab', { active: period === 'all-time' }]" @click="changePeriod('all-time')">
        总榜
      </view>
      <view :class="['tab', { active: period === 'weekly' }]" @click="changePeriod('weekly')">
        周榜
      </view>
    </view>

    <view v-if="loading" class="loading">加载中...</view>

    <view v-else class="leaderboard-list">
      <view v-for="entry in leaderboard.topEntries" :key="entry.userId" class="leaderboard-item">
        <view class="rank">{{ entry.rank }}</view>
        <image :src="entry.avatarUrl || '/static/default-avatar.png'" class="avatar" />
        <view class="user-info">
          <text class="name">{{ entry.fullName || entry.username }}</text>
          <text class="points">{{ entry.points }} 积分</text>
        </view>
      </view>

      <view v-if="leaderboard.currentUser" class="my-rank">
        <text>我的排名：第 {{ leaderboard.currentUser.rank }} 位</text>
        <text>{{ leaderboard.currentUser.points }} 积分</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  fullName?: string;
  avatarUrl?: string;
  points: number;
}

interface LeaderboardResponse {
  period: string;
  periodLabel: string;
  topEntries: LeaderboardEntry[];
  currentUser: LeaderboardEntry | null;
  totalUsers: number;
}

const period = ref<'all-time' | 'weekly'>('all-time');
const loading = ref(false);
const leaderboard = ref<LeaderboardResponse>({
  period: 'all-time',
  periodLabel: '总榜',
  topEntries: [],
  currentUser: null,
  totalUsers: 0,
});

async function fetchLeaderboard() {
  loading.value = true;
  try {
    const token = uni.getStorageSync('token');
    const res = await uni.request({
      url: 'http://localhost:5000/api/v1/points/leaderboard',
      method: 'GET',
      header: {
        Authorization: `Bearer ${token}`,
      },
      data: {
        period: period.value,
        limit: 100,
        includeSelf: true,
      },
    });

    if (res.statusCode === 200) {
      leaderboard.value = res.data as LeaderboardResponse;
    }
  } catch (error) {
    console.error('获取排行榜失败:', error);
  } finally {
    loading.value = false;
  }
}

function changePeriod(newPeriod: 'all-time' | 'weekly') {
  period.value = newPeriod;
  fetchLeaderboard();
}

onMounted(() => {
  fetchLeaderboard();
});
</script>
```

## 数据结构

### Redis Key 设计

```
leaderboard:all-time       - 总榜（所有时间积分总和）
leaderboard:weekly:2025-W51 - 周榜（本周积分，按周编号）
```

### 周编号格式

使用 ISO 8601 周编号格式：`YYYY-Www`

- `YYYY`：年份（4位数字）
- `W`：固定字符
- `ww`：周编号（01-53，左侧补零）

示例：

- `2025-W01`：2025年第1周
- `2025-W51`：2025年第51周

## 性能指标

- **查询响应时间**：< 200ms（包含批量用户信息查询）
- **并发支持**：1000+ 并发查询
- **排行榜更新**：实时更新（每次积分变化立即更新）
- **内存占用**：Redis Sorted Set，每个用户约 50 字节

## 注意事项

1. **权限控制**：所有用户都可以查看排行榜，但只能看到公开信息（用户名、头像、积分）
2. **数据一致性**：积分变化和排行榜更新在同一事务中完成，保证数据一致性
3. **错误处理**：Redis 操作失败不影响积分主流程，仅记录日志
4. **周榜更新**：周榜在每周一自动切换到新的周编号

## 相关接口

- `POST /api/v1/points/earn` - 获得积分
- `POST /api/v1/points/redeem` - 消费积分
- `GET /api/v1/points/balance/:userId` - 查询积分余额
- `GET /api/v1/points/transactions/:userId` - 查询积分交易历史

## 技术实现

### 核心技术栈

- **Redis Sorted Set**：高性能排行榜存储
- **批量查询优化**：使用 Prisma `findMany` with `IN` clause 批量获取用户信息
- **周编号计算**：使用 ISO 8601 周编号算法

### 关键代码文件

- `backend/src/common/cache/cache.service.ts` - Redis 缓存服务
- `backend/src/points/points.service.ts` - 积分服务（包含排行榜更新）
- `backend/src/points/points.controller.ts` - 排行榜 API 端点
- `backend/src/points/dto/leaderboard.dto.ts` - 排行榜 DTO 定义

## 测试

### 单元测试

```bash
# 运行 CacheService 单元测试
pnpm test cache.service.spec.ts

# 运行 PointsService 单元测试
pnpm test points.service.spec.ts
```

### 手动测试步骤

1. 启动 Redis 服务：`docker-compose up -d redis`
2. 启动后端服务：`pnpm dev`
3. 获取 JWT Token（通过登录接口）
4. 调用排行榜接口：
   ```bash
   curl -X GET "http://localhost:5000/api/v1/points/leaderboard" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```
5. 验证返回数据格式正确
6. 调用积分获得接口，验证排行榜实时更新

## 常见问题

**Q: 排行榜多久更新一次？**

A: 排行榜实时更新。每次用户获得或消费积分时，Redis Sorted Set 会立即更新排名。

**Q: 周榜什么时候清零？**

A: 周榜不会清零，而是使用新的 Redis key（如 `leaderboard:weekly:2025-W52`）。旧的周榜数据会保留，可以设置 TTL 自动过期（建议保留 8 周）。

**Q: 排行榜最多支持多少用户？**

A: 理论上无限制。Redis Sorted Set 可以高效处理百万级别的用户排名。实际限制取决于 Redis 内存大小。

**Q: 如果 Redis 宕机会怎样？**

A: 积分主流程不受影响（仅记录错误日志）。Redis 恢复后，排行榜数据需要通过积分交易记录重建。

**Q: 如何重建排行榜数据？**

A: 可以编写脚本从 PostgreSQL 的 `points_transaction` 表中聚合积分数据，重新写入 Redis Sorted Set。

## 版本历史

- **v0.1.0** (2025-12-23)
  - 初始版本
  - 支持总榜和周榜
  - 实现 Redis Sorted Set 存储
  - 批量查询用户信息优化
  - 完整单元测试覆盖
