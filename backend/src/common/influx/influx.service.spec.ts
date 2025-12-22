import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { InfluxService } from './influx.service';

describe('InfluxService', () => {
  let service: InfluxService;
  let configService: ConfigService;

  // Mock InfluxDB Client
  const mockWriteApi = {
    writePoint: jest.fn(),
    flush: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
  };

  const mockQueryApi = {
    collectRows: jest.fn(),
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const mockInfluxDB = {
    getWriteApi: jest.fn().mockReturnValue(mockWriteApi),
    getQueryApi: jest.fn().mockReturnValue(mockQueryApi),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InfluxService,
        {
          provide: ConfigService,
          useValue: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                'influx.url': 'http://localhost:8086',
                'influx.token': 'test-token',
                'influx.org': 'test-org',
                'influx.bucket': 'test-bucket',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<InfluxService>(InfluxService);
    configService = module.get<ConfigService>(ConfigService);

    // 替换 InfluxDB 客户端实例（使用 any 绕过私有属性限制）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).writeApi = mockWriteApi;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).queryApi = mockQueryApi;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('构造函数', () => {
    it('应该成功初始化 InfluxService', () => {
      expect(service).toBeDefined();
    });

    it('应该正确读取配置', () => {
      expect(configService.get).toHaveBeenCalledWith('influx.url');
      expect(configService.get).toHaveBeenCalledWith('influx.token');
      expect(configService.get).toHaveBeenCalledWith('influx.org');
      expect(configService.get).toHaveBeenCalledWith('influx.bucket');
    });
  });

  describe('writeBloodPressure', () => {
    it('应该成功写入血压数据（包含脉搏）', async () => {
      const userId = 'user-123';
      const checkInId = 'checkin-456';
      const data = { systolic: 120, diastolic: 80, pulse: 72 };

      await service.writeBloodPressure(userId, checkInId, data);

      expect(mockWriteApi.writePoint).toHaveBeenCalledTimes(1);
      expect(mockWriteApi.flush).toHaveBeenCalledTimes(1);
    });

    it('应该成功写入血压数据（不含脉搏）', async () => {
      const userId = 'user-123';
      const checkInId = 'checkin-456';
      const data = { systolic: 130, diastolic: 85 };

      await service.writeBloodPressure(userId, checkInId, data);

      expect(mockWriteApi.writePoint).toHaveBeenCalledTimes(1);
      expect(mockWriteApi.flush).toHaveBeenCalledTimes(1);
    });

    it('应该在写入失败时不抛出异常（降级设计）', async () => {
      mockWriteApi.flush.mockRejectedValueOnce(new Error('InfluxDB connection error'));

      const userId = 'user-123';
      const checkInId = 'checkin-456';
      const data = { systolic: 120, diastolic: 80, pulse: 72 };

      // 不应抛出异常
      await expect(service.writeBloodPressure(userId, checkInId, data)).resolves.not.toThrow();
    });
  });

  describe('writeBloodSugar', () => {
    it('应该成功写入血糖数据', async () => {
      const userId = 'user-123';
      const checkInId = 'checkin-789';
      const data = { value: 5.6, timing: 'fasting' };

      await service.writeBloodSugar(userId, checkInId, data);

      expect(mockWriteApi.writePoint).toHaveBeenCalledTimes(1);
      expect(mockWriteApi.flush).toHaveBeenCalledTimes(1);
    });

    it('应该在写入失败时不抛出异常（降级设计）', async () => {
      mockWriteApi.flush.mockRejectedValueOnce(new Error('InfluxDB connection error'));

      const userId = 'user-123';
      const checkInId = 'checkin-789';
      const data = { value: 5.6, timing: 'fasting' };

      // 不应抛出异常
      await expect(service.writeBloodSugar(userId, checkInId, data)).resolves.not.toThrow();
    });
  });

  describe('queryBloodPressure', () => {
    it('应该成功查询血压时序数据', async () => {
      const userId = 'user-123';
      const startTime = new Date('2025-12-15T00:00:00Z');
      const endTime = new Date('2025-12-22T23:59:59Z');

      const mockRows = [
        {
          _time: '2025-12-20T10:30:00Z',
          systolic: 120,
          diastolic: 80,
          pulse: 72,
        },
        {
          _time: '2025-12-21T10:30:00Z',
          systolic: 125,
          diastolic: 82,
          pulse: 75,
        },
      ];

      mockQueryApi.collectRows.mockResolvedValueOnce(mockRows);

      const result = await service.queryBloodPressure(userId, startTime, endTime);

      expect(mockQueryApi.collectRows).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        timestamp: new Date('2025-12-20T10:30:00Z'),
        systolic: 120,
        diastolic: 80,
        pulse: 72,
      });
    });

    it('应该在查询失败时返回空数组', async () => {
      mockQueryApi.collectRows.mockRejectedValueOnce(new Error('Query error'));

      const userId = 'user-123';
      const startTime = new Date('2025-12-15T00:00:00Z');
      const endTime = new Date('2025-12-22T23:59:59Z');

      const result = await service.queryBloodPressure(userId, startTime, endTime);

      expect(result).toEqual([]);
    });
  });

  describe('queryBloodSugar', () => {
    it('应该成功查询血糖时序数据', async () => {
      const userId = 'user-123';
      const startTime = new Date('2025-12-15T00:00:00Z');
      const endTime = new Date('2025-12-22T23:59:59Z');

      const mockRows = [
        {
          _time: '2025-12-20T08:00:00Z',
          _value: 5.6,
          timing: 'fasting',
        },
        {
          _time: '2025-12-21T08:00:00Z',
          _value: 5.8,
          timing: 'fasting',
        },
      ];

      mockQueryApi.collectRows.mockResolvedValueOnce(mockRows);

      const result = await service.queryBloodSugar(userId, startTime, endTime);

      expect(mockQueryApi.collectRows).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        timestamp: new Date('2025-12-20T08:00:00Z'),
        value: 5.6,
        timing: 'fasting',
      });
    });

    it('应该在查询失败时返回空数组', async () => {
      mockQueryApi.collectRows.mockRejectedValueOnce(new Error('Query error'));

      const userId = 'user-123';
      const startTime = new Date('2025-12-15T00:00:00Z');
      const endTime = new Date('2025-12-22T23:59:59Z');

      const result = await service.queryBloodSugar(userId, startTime, endTime);

      expect(result).toEqual([]);
    });
  });

  describe('queryAggregated', () => {
    it('应该成功查询聚合数据（平均值）', async () => {
      const measurement = 'blood_pressure';
      const userId = 'user-123';
      const startTime = new Date('2025-12-15T00:00:00Z');
      const endTime = new Date('2025-12-22T23:59:59Z');

      const mockRows = [
        {
          _time: '2025-12-20T00:00:00Z',
          _value: 120,
          _field: 'systolic',
        },
        {
          _time: '2025-12-21T00:00:00Z',
          _value: 125,
          _field: 'systolic',
        },
      ];

      mockQueryApi.collectRows.mockResolvedValueOnce(mockRows);

      const result = await service.queryAggregated(measurement, userId, startTime, endTime, 'mean');

      expect(mockQueryApi.collectRows).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        timestamp: new Date('2025-12-20T00:00:00Z'),
        value: 120,
        field: 'systolic',
      });
    });

    it('应该在查询失败时返回空数组', async () => {
      mockQueryApi.collectRows.mockRejectedValueOnce(new Error('Query error'));

      const measurement = 'blood_pressure';
      const userId = 'user-123';
      const startTime = new Date('2025-12-15T00:00:00Z');
      const endTime = new Date('2025-12-22T23:59:59Z');

      const result = await service.queryAggregated(measurement, userId, startTime, endTime, 'mean');

      expect(result).toEqual([]);
    });
  });

  describe('onModuleDestroy', () => {
    it('应该成功关闭 InfluxDB 连接', async () => {
      await service.onModuleDestroy();

      expect(mockWriteApi.close).toHaveBeenCalledTimes(1);
    });

    it('应该在关闭连接失败时不抛出异常', async () => {
      mockWriteApi.close.mockRejectedValueOnce(new Error('Close error'));

      await expect(service.onModuleDestroy()).resolves.not.toThrow();
    });
  });
});
