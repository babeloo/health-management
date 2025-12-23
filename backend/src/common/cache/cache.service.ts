import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Redis 缓存服务
 * 封装 Redis 操作，包括排行榜管理、缓存等功能
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);

  private readonly redis: Redis;

  constructor(private readonly configService: ConfigService) {
    const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
    const redisPort = this.configService.get<number>('REDIS_PORT', 6379);
    const redisPassword = this.configService.get<string>('REDIS_PASSWORD');

    this.redis = new Redis({
      host: redisHost,
      port: redisPort,
      // ioredis: 传入空字符串会触发 AUTH ""，在未开启 requirepass 的 Redis（如 CI）下会报错
      password: redisPassword || undefined,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.redis.on('connect', () => {
      this.logger.log('Redis 连接成功');
    });

    this.redis.on('error', (err) => {
      this.logger.error('Redis 连接错误', err);
    });
  }

  /**
   * 模块销毁时关闭 Redis 连接
   */
  async onModuleDestroy() {
    await this.redis.quit();
    this.logger.log('Redis 连接已关闭');
  }

  /**
   * 更新排行榜（增加或减少积分）
   * @param key - Redis key（如 'leaderboard:all-time'）
   * @param userId - 用户 ID
   * @param pointsChange - 积分变化（正数增加，负数减少）
   */
  async updateLeaderboard(key: string, userId: string, pointsChange: number): Promise<void> {
    try {
      await this.redis.zincrby(key, pointsChange, userId);
      this.logger.debug(
        `更新排行榜 ${key}: 用户 ${userId} ${pointsChange > 0 ? '+' : ''}${pointsChange} 积分`,
      );
    } catch (error) {
      this.logger.error(`更新排行榜 ${key} 失败`, error);
      // 不抛出异常，避免影响积分主流程
    }
  }

  /**
   * 获取排行榜 Top N
   * @param key - Redis key
   * @param limit - 返回前 N 名
   * @returns { userId: string, points: number }[]
   */
  async getTopLeaderboard(
    key: string,
    limit: number = 100,
  ): Promise<{ userId: string; points: number }[]> {
    try {
      const results = await this.redis.zrevrange(key, 0, limit - 1, 'WITHSCORES');

      const leaderboard: { userId: string; points: number }[] = [];
      for (let i = 0; i < results.length; i += 2) {
        leaderboard.push({
          userId: results[i],
          points: parseInt(results[i + 1], 10),
        });
      }

      return leaderboard;
    } catch (error) {
      this.logger.error(`获取排行榜 ${key} 失败`, error);
      return [];
    }
  }

  /**
   * 获取用户排名
   * @param key - Redis key
   * @param userId - 用户 ID
   * @returns 排名（1-based）或 null
   */
  async getUserRank(key: string, userId: string): Promise<number | null> {
    try {
      const rank = await this.redis.zrevrank(key, userId);
      return rank !== null ? rank + 1 : null; // Redis 排名从 0 开始，转为 1-based
    } catch (error) {
      this.logger.error(`获取用户排名失败 (key: ${key}, userId: ${userId})`, error);
      return null;
    }
  }

  /**
   * 获取用户积分
   * @param key - Redis key
   * @param userId - 用户 ID
   * @returns 积分数或 0
   */
  async getUserScore(key: string, userId: string): Promise<number> {
    try {
      const score = await this.redis.zscore(key, userId);
      return score ? parseInt(score, 10) : 0;
    } catch (error) {
      this.logger.error(`获取用户积分失败 (key: ${key}, userId: ${userId})`, error);
      return 0;
    }
  }

  /**
   * 批量获取用户积分
   * @param key - Redis key
   * @param userIds - 用户 ID 列表
   * @returns Map<userId, points>
   */
  async batchGetScores(key: string, userIds: string[]): Promise<Map<string, number>> {
    try {
      const pipeline = this.redis.pipeline();
      userIds.forEach((userId) => pipeline.zscore(key, userId));

      const results = await pipeline.exec();
      const scoreMap = new Map<string, number>();

      if (results) {
        userIds.forEach((userId, index) => {
          const [err, score] = results[index];
          if (!err) {
            scoreMap.set(userId, score ? parseInt(score as string, 10) : 0);
          }
        });
      }

      return scoreMap;
    } catch (error) {
      this.logger.error(`批量获取用户积分失败 (key: ${key})`, error);
      return new Map();
    }
  }

  /**
   * 获取排行榜总人数
   * @param key - Redis key
   * @returns 总人数
   */
  async getLeaderboardSize(key: string): Promise<number> {
    try {
      return await this.redis.zcard(key);
    } catch (error) {
      this.logger.error(`获取排行榜大小失败 (key: ${key})`, error);
      return 0;
    }
  }

  /**
   * 设置缓存（通用方法）
   * @param key - 缓存 key
   * @param value - 缓存值
   * @param ttl - 过期时间（秒）
   */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      if (ttl) {
        await this.redis.setex(key, ttl, value);
      } else {
        await this.redis.set(key, value);
      }
    } catch (error) {
      this.logger.error(`设置缓存失败 (key: ${key})`, error);
    }
  }

  /**
   * 获取缓存（通用方法）
   * @param key - 缓存 key
   * @returns 缓存值或 null
   */
  async get(key: string): Promise<string | null> {
    try {
      return await this.redis.get(key);
    } catch (error) {
      this.logger.error(`获取缓存失败 (key: ${key})`, error);
      return null;
    }
  }

  /**
   * 删除缓存（通用方法）
   * @param key - 缓存 key
   */
  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(`删除缓存失败 (key: ${key})`, error);
    }
  }

  /**
   * 设置用户在线状态
   * @param userId - 用户 ID
   */
  async setOnlineUser(userId: string): Promise<void> {
    try {
      const timestamp = Date.now();
      await this.redis.hset('online_users', userId, timestamp.toString());
      this.logger.debug(`用户 ${userId} 上线`);
    } catch (error) {
      this.logger.error(`设置用户在线状态失败 (userId: ${userId})`, error);
    }
  }

  /**
   * 删除用户在线状态
   * @param userId - 用户 ID
   */
  async deleteOnlineUser(userId: string): Promise<void> {
    try {
      await this.redis.hdel('online_users', userId);
      this.logger.debug(`用户 ${userId} 下线`);
    } catch (error) {
      this.logger.error(`删除用户在线状态失败 (userId: ${userId})`, error);
    }
  }

  /**
   * 检查用户是否在线
   * @param userId - 用户 ID
   * @returns 是否在线
   */
  async isUserOnline(userId: string): Promise<boolean> {
    try {
      const exists = await this.redis.hexists('online_users', userId);
      return exists === 1;
    } catch (error) {
      this.logger.error(`检查用户在线状态失败 (userId: ${userId})`, error);
      return false;
    }
  }

  /**
   * 获取所有在线用户
   * @returns 在线用户 ID 列表
   */
  async getOnlineUsers(): Promise<string[]> {
    try {
      return await this.redis.hkeys('online_users');
    } catch (error) {
      this.logger.error('获取在线用户列表失败', error);
      return [];
    }
  }
}
