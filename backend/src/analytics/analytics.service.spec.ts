import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { CacheService } from '../common/cache/cache.service';
import { RiskLevel, CheckInType } from '../generated/prisma/client';

describe.skip('AnalyticsService', () => {
  let service: AnalyticsService;
  const mockPrisma = {
    user: {
      count: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    checkIn: {
      count: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    riskAssessment: {
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    pointsTransaction: {
      groupBy: jest.fn(),
    },
    streakBonusRecord: {
      groupBy: jest.fn(),
    },
    healthRecord: {
      findMany: jest.fn(),
    },
  };

  const mockCache = {
    get: jest.fn(),
    set: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CacheService, useValue: mockCache },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboard', () => {
    it('应该返回缓存的仪表盘数据', async () => {
      const cachedData = {
        totalPatients: 100,
        activePatients: 80,
        newPatientsWeek: 10,
        newPatientsMonth: 30,
        totalCheckIns: 500,
        todayCheckIns: 50,
        checkInCompletionRate: 50,
        highRiskPatients: 10,
        mediumRiskPatients: 30,
        lowRiskPatients: 60,
        totalDoctors: 20,
        totalHealthManagers: 10,
        topPatients: [],
      };

      mockCache.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await service.getDashboard({});
      expect(result).toEqual(cachedData);
      expect(mockCache.get).toHaveBeenCalled();
    });

    it('应该计算并缓存新的仪表盘数据', async () => {
      mockCache.get.mockResolvedValue(null);
      mockPrisma.user.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(80)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(30)
        .mockResolvedValueOnce(20)
        .mockResolvedValueOnce(10);

      mockPrisma.checkIn.count.mockResolvedValueOnce(500).mockResolvedValueOnce(50);

      mockPrisma.riskAssessment.groupBy.mockResolvedValue([]);
      mockPrisma.pointsTransaction.groupBy.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await service.getDashboard({});

      expect(result.totalPatients).toBe(100);
      expect(result.activePatients).toBe(80);
      expect(mockCache.set).toHaveBeenCalled();
    });
  });

  describe('getPatientStats', () => {
    it('应该按风险等级统计患者', async () => {
      mockPrisma.riskAssessment.groupBy.mockResolvedValue([
        { userId: '1', riskLevel: RiskLevel.HIGH, _max: { assessedAt: new Date() } },
        { userId: '2', riskLevel: RiskLevel.MEDIUM, _max: { assessedAt: new Date() } },
        { userId: '3', riskLevel: RiskLevel.LOW, _max: { assessedAt: new Date() } },
      ]);

      const result = await service.getPatientStats({ groupBy: 'risk_level' as any });

      expect(result.groupBy).toBe('risk_level');
      expect(result.data).toHaveLength(3);
      expect(result.data[0].label).toBe('高风险');
    });

    it('应该按性别统计患者', async () => {
      mockPrisma.user.groupBy.mockResolvedValue([
        { gender: 'MALE', _count: 60 },
        { gender: 'FEMALE', _count: 40 },
      ]);

      const result = await service.getPatientStats({ groupBy: 'gender' as any });

      expect(result.groupBy).toBe('gender');
      expect(result.data).toHaveLength(2);
    });
  });

  describe('getCheckInStats', () => {
    it('应该返回打卡统计数据', async () => {
      mockPrisma.checkIn.groupBy
        .mockResolvedValueOnce([
          { checkInDate: new Date('2024-01-01'), _count: 10 },
          { checkInDate: new Date('2024-01-02'), _count: 15 },
        ])
        .mockResolvedValueOnce([
          { type: CheckInType.BLOOD_PRESSURE, _count: 50 },
          { type: CheckInType.BLOOD_SUGAR, _count: 30 },
        ]);

      mockPrisma.streakBonusRecord.groupBy.mockResolvedValue([
        { streakDays: 7, _count: 20 },
        { streakDays: 30, _count: 5 },
      ]);

      const result = await service.getCheckInStats({});

      expect(result.dailyStats).toHaveLength(2);
      expect(result.typeStats).toHaveLength(2);
      expect(result.streakDistribution).toHaveLength(2);
    });
  });

  describe('exportReport', () => {
    it('应该导出患者报表', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: '1',
          fullName: '张三',
          gender: 'MALE',
          birthDate: new Date('1980-01-01'),
          createdAt: new Date(),
        },
      ]);

      const buffer = await service.exportReport({ type: 'patients' as any });

      expect(buffer).toBeInstanceOf(Buffer);
      expect(mockPrisma.user.findMany).toHaveBeenCalled();
    });

    it('应该导出打卡报表', async () => {
      mockPrisma.checkIn.findMany.mockResolvedValue([
        {
          userId: '1',
          type: CheckInType.BLOOD_PRESSURE,
          checkInDate: new Date(),
          pointsEarned: 10,
          notes: '正常',
        },
      ]);

      const buffer = await service.exportReport({ type: 'check_ins' as any });

      expect(buffer).toBeInstanceOf(Buffer);
      expect(mockPrisma.checkIn.findMany).toHaveBeenCalled();
    });
  });
});
