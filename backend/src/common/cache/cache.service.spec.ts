import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { CacheService } from './cache.service';

// Mock ioredis
jest.mock('ioredis');

describe('CacheService', () => {
  let service: CacheService;
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(async () => {
    // 创建 Redis mock
    mockRedis = {
      zincrby: jest.fn().mockResolvedValue('OK'),
      zrevrange: jest.fn().mockResolvedValue([]),
      zrevrank: jest.fn().mockResolvedValue(null),
      zscore: jest.fn().mockResolvedValue(null),
      zcard: jest.fn().mockResolvedValue(0),
      pipeline: jest.fn().mockReturnValue({
        zscore: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      }),
      set: jest.fn().mockResolvedValue('OK'),
      setex: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
      quit: jest.fn().mockResolvedValue('OK'),
      on: jest.fn(),
    } as unknown as jest.Mocked<Redis>;

    // Mock ConfigService
    const mockConfigService = {
      get: jest.fn(<T = string>(key: string, defaultValue?: T): T => {
        const config: Record<string, unknown> = {
          REDIS_HOST: 'localhost',
          REDIS_PORT: 6379,
          REDIS_PASSWORD: 'redis123',
        };
        return (config[key] ?? defaultValue) as T;
      }),
    };

    // Mock ioredis constructor
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const RedisModule = require('ioredis');
    RedisModule.mockImplementation(() => mockRedis);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('应该被定义', () => {
    expect(service).toBeDefined();
  });

  describe('updateLeaderboard', () => {
    it('应该成功更新排行榜积分', async () => {
      const key = 'leaderboard:all-time';
      const userId = 'user-123';
      const pointsChange = 100;

      await service.updateLeaderboard(key, userId, pointsChange);

      expect(mockRedis.zincrby).toHaveBeenCalledWith(key, pointsChange, userId);
    });

    it('积分变化为负数时应该正常工作', async () => {
      const key = 'leaderboard:all-time';
      const userId = 'user-123';
      const pointsChange = -50;

      await service.updateLeaderboard(key, userId, pointsChange);

      expect(mockRedis.zincrby).toHaveBeenCalledWith(key, pointsChange, userId);
    });

    it('Redis 错误时不应抛出异常', async () => {
      mockRedis.zincrby.mockRejectedValueOnce(new Error('Redis error'));

      await expect(
        service.updateLeaderboard('leaderboard:all-time', 'user-123', 100),
      ).resolves.not.toThrow();
    });
  });

  describe('getTopLeaderboard', () => {
    it('应该返回排行榜 Top N 用户', async () => {
      const key = 'leaderboard:all-time';
      const limit = 10;
      mockRedis.zrevrange.mockResolvedValueOnce([
        'user-1',
        '1000',
        'user-2',
        '900',
        'user-3',
        '800',
      ]);

      const result = await service.getTopLeaderboard(key, limit);

      expect(result).toEqual([
        { userId: 'user-1', points: 1000 },
        { userId: 'user-2', points: 900 },
        { userId: 'user-3', points: 800 },
      ]);
      expect(mockRedis.zrevrange).toHaveBeenCalledWith(key, 0, limit - 1, 'WITHSCORES');
    });

    it('空排行榜应该返回空数组', async () => {
      mockRedis.zrevrange.mockResolvedValueOnce([]);

      const result = await service.getTopLeaderboard('leaderboard:weekly:2025-W51', 100);

      expect(result).toEqual([]);
    });

    it('Redis 错误时应该返回空数组', async () => {
      mockRedis.zrevrange.mockRejectedValueOnce(new Error('Redis error'));

      const result = await service.getTopLeaderboard('leaderboard:all-time', 100);

      expect(result).toEqual([]);
    });
  });

  describe('getUserRank', () => {
    it('应该返回用户排名（1-based）', async () => {
      mockRedis.zrevrank.mockResolvedValueOnce(9); // Redis 返回 0-based 排名

      const rank = await service.getUserRank('leaderboard:all-time', 'user-123');

      expect(rank).toBe(10); // 转换为 1-based
    });

    it('用户不在排行榜时应该返回 null', async () => {
      mockRedis.zrevrank.mockResolvedValueOnce(null);

      const rank = await service.getUserRank('leaderboard:all-time', 'user-999');

      expect(rank).toBeNull();
    });

    it('Redis 错误时应该返回 null', async () => {
      mockRedis.zrevrank.mockRejectedValueOnce(new Error('Redis error'));

      const rank = await service.getUserRank('leaderboard:all-time', 'user-123');

      expect(rank).toBeNull();
    });
  });

  describe('getUserScore', () => {
    it('应该返回用户积分', async () => {
      mockRedis.zscore.mockResolvedValueOnce('1200');

      const score = await service.getUserScore('leaderboard:all-time', 'user-123');

      expect(score).toBe(1200);
    });

    it('用户无积分时应该返回 0', async () => {
      mockRedis.zscore.mockResolvedValueOnce(null);

      const score = await service.getUserScore('leaderboard:all-time', 'user-999');

      expect(score).toBe(0);
    });

    it('Redis 错误时应该返回 0', async () => {
      mockRedis.zscore.mockRejectedValueOnce(new Error('Redis error'));

      const score = await service.getUserScore('leaderboard:all-time', 'user-123');

      expect(score).toBe(0);
    });
  });

  describe('getLeaderboardSize', () => {
    it('应该返回排行榜总人数', async () => {
      mockRedis.zcard.mockResolvedValueOnce(1520);

      const size = await service.getLeaderboardSize('leaderboard:all-time');

      expect(size).toBe(1520);
    });

    it('Redis 错误时应该返回 0', async () => {
      mockRedis.zcard.mockRejectedValueOnce(new Error('Redis error'));

      const size = await service.getLeaderboardSize('leaderboard:all-time');

      expect(size).toBe(0);
    });
  });

  describe('缓存基础方法', () => {
    it('set 应该设置缓存', async () => {
      await service.set('key1', 'value1');
      expect(mockRedis.set).toHaveBeenCalledWith('key1', 'value1');
    });

    it('set 应该支持 TTL', async () => {
      await service.set('key1', 'value1', 300);
      expect(mockRedis.setex).toHaveBeenCalledWith('key1', 300, 'value1');
    });

    it('get 应该获取缓存', async () => {
      mockRedis.get.mockResolvedValueOnce('value1');
      const value = await service.get('key1');
      expect(value).toBe('value1');
    });

    it('del 应该删除缓存', async () => {
      await service.del('key1');
      expect(mockRedis.del).toHaveBeenCalledWith('key1');
    });
  });
});
