import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PointsService } from './points.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { TransactionType } from '../generated/prisma/client';
import { EarnPointsDto, RedeemPointsDto, PointsTransactionQueryDto } from './dto';

describe('PointsService', () => {
  let service: PointsService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let prismaService: PrismaService;

  const mockUser = {
    id: 'user-123',
    username: 'testuser',
    password: 'hashedpassword',
    email: 'test@example.com',
    phone: null,
    role: 'PATIENT' as const,
    fullName: '测试用户',
    gender: null,
    birthDate: null,
    idCardEncrypted: null,
    avatarUrl: null,
    status: 'ACTIVE' as const,
    emailVerified: false,
    phoneVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
  };

  const mockTransaction = {
    id: 'transaction-123',
    userId: 'user-123',
    type: TransactionType.EARN,
    points: 10,
    source: 'check_in',
    sourceId: 'checkin-123',
    description: '血压打卡成功',
    createdAt: new Date(),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    pointsTransaction: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PointsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PointsService>(PointsService);
    prismaService = module.get<PrismaService>(PrismaService);

    // 重置所有 mock
    jest.clearAllMocks();
  });

  it('应该被定义', () => {
    expect(service).toBeDefined();
  });

  describe('earnPoints', () => {
    it('应该成功为用户添加积分', async () => {
      const earnDto: EarnPointsDto = {
        userId: 'user-123',
        points: 10,
        source: 'check_in',
        sourceId: 'checkin-123',
        description: '血压打卡成功',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.pointsTransaction.create.mockResolvedValue(mockTransaction);

      const result = await service.earnPoints(earnDto);

      expect(result).toEqual(mockTransaction);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: earnDto.userId },
      });
      expect(mockPrismaService.pointsTransaction.create).toHaveBeenCalledWith({
        data: {
          userId: earnDto.userId,
          type: TransactionType.EARN,
          points: earnDto.points,
          source: earnDto.source,
          sourceId: earnDto.sourceId,
          description: earnDto.description,
        },
      });
    });

    it('应该在用户不存在时抛出 NotFoundException', async () => {
      const earnDto: EarnPointsDto = {
        userId: 'non-existent-user',
        points: 10,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.earnPoints(earnDto)).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: earnDto.userId },
      });
      expect(mockPrismaService.pointsTransaction.create).not.toHaveBeenCalled();
    });
  });

  describe('redeemPoints', () => {
    it('应该成功消费积分', async () => {
      const redeemDto: RedeemPointsDto = {
        userId: 'user-123',
        points: 50,
        source: 'gift_redemption',
        description: '兑换健康礼包',
      };

      const redeemTransaction = {
        ...mockTransaction,
        id: 'transaction-456',
        type: TransactionType.REDEEM,
        points: -50,
        source: 'gift_redemption',
        description: '兑换健康礼包',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Mock getPointsBalance 的依赖
      mockPrismaService.pointsTransaction.aggregate.mockResolvedValue({
        _sum: { points: 100 },
      });
      mockPrismaService.pointsTransaction.findMany.mockResolvedValue([
        { points: 100, type: TransactionType.EARN },
      ]);

      mockPrismaService.pointsTransaction.create.mockResolvedValue(redeemTransaction);

      const result = await service.redeemPoints(redeemDto);

      expect(result.points).toBe(-50);
      expect(result.type).toBe(TransactionType.REDEEM);
      expect(mockPrismaService.pointsTransaction.create).toHaveBeenCalledWith({
        data: {
          userId: redeemDto.userId,
          type: TransactionType.REDEEM,
          points: -redeemDto.points,
          source: redeemDto.source,
          sourceId: null,
          description: redeemDto.description,
        },
      });
    });

    it('应该在积分不足时抛出 BadRequestException', async () => {
      const redeemDto: RedeemPointsDto = {
        userId: 'user-123',
        points: 150,
        source: 'gift_redemption',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Mock 积分余额为 100
      mockPrismaService.pointsTransaction.aggregate.mockResolvedValue({
        _sum: { points: 100 },
      });
      mockPrismaService.pointsTransaction.findMany.mockResolvedValue([
        { points: 100, type: TransactionType.EARN },
      ]);

      await expect(service.redeemPoints(redeemDto)).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.pointsTransaction.create).not.toHaveBeenCalled();
    });

    it('应该在用户不存在时抛出 NotFoundException', async () => {
      const redeemDto: RedeemPointsDto = {
        userId: 'non-existent-user',
        points: 50,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.redeemPoints(redeemDto)).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.pointsTransaction.create).not.toHaveBeenCalled();
    });
  });

  describe('getPointsBalance', () => {
    it('应该成功查询用户积分余额', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.pointsTransaction.aggregate.mockResolvedValue({
        _sum: { points: 250 },
      });
      mockPrismaService.pointsTransaction.findMany.mockResolvedValue([
        { points: 300, type: TransactionType.EARN },
        { points: -50, type: TransactionType.REDEEM },
      ]);

      const result = await service.getPointsBalance('user-123');

      expect(result).toEqual({
        userId: 'user-123',
        balance: 250,
        totalEarned: 300,
        totalRedeemed: 50,
      });
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
    });

    it('应该在用户不存在时抛出 NotFoundException', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getPointsBalance('non-existent-user')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('应该在用户无积分记录时返回 0', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.pointsTransaction.aggregate.mockResolvedValue({
        _sum: { points: null },
      });
      mockPrismaService.pointsTransaction.findMany.mockResolvedValue([]);

      const result = await service.getPointsBalance('user-123');

      expect(result.balance).toBe(0);
      expect(result.totalEarned).toBe(0);
      expect(result.totalRedeemed).toBe(0);
    });
  });

  describe('getTransactionHistory', () => {
    it('应该成功分页查询交易历史', async () => {
      const queryDto: PointsTransactionQueryDto = {
        page: 1,
        limit: 20,
      };

      const transactions = [
        mockTransaction,
        {
          ...mockTransaction,
          id: 'transaction-456',
          points: -50,
          type: TransactionType.REDEEM,
        },
      ];

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.pointsTransaction.count.mockResolvedValue(2);
      mockPrismaService.pointsTransaction.findMany.mockResolvedValue(transactions);

      const result = await service.getTransactionHistory('user-123', queryDto);

      expect(result).toEqual({
        data: transactions,
        total: 2,
        page: 1,
        limit: 20,
      });
      expect(mockPrismaService.pointsTransaction.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });

    it('应该支持按交易类型过滤', async () => {
      const queryDto: PointsTransactionQueryDto = {
        page: 1,
        limit: 20,
        type: TransactionType.EARN,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.pointsTransaction.count.mockResolvedValue(1);
      mockPrismaService.pointsTransaction.findMany.mockResolvedValue([mockTransaction]);

      await service.getTransactionHistory('user-123', queryDto);

      expect(mockPrismaService.pointsTransaction.count).toHaveBeenCalledWith({
        where: { userId: 'user-123', type: TransactionType.EARN },
      });
    });

    it('应该支持按日期范围过滤', async () => {
      const queryDto: PointsTransactionQueryDto = {
        page: 1,
        limit: 20,
        startDate: '2025-01-01',
        endDate: '2025-12-31',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.pointsTransaction.count.mockResolvedValue(1);
      mockPrismaService.pointsTransaction.findMany.mockResolvedValue([mockTransaction]);

      await service.getTransactionHistory('user-123', queryDto);

      expect(mockPrismaService.pointsTransaction.count).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          createdAt: {
            gte: new Date('2025-01-01'),
            lte: new Date('2025-12-31'),
          },
        },
      });
    });

    it('应该在用户不存在时抛出 NotFoundException', async () => {
      const queryDto: PointsTransactionQueryDto = {
        page: 1,
        limit: 20,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getTransactionHistory('non-existent-user', queryDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('bonusPoints', () => {
    it('应该成功发放奖励积分', async () => {
      const bonusTransaction = {
        ...mockTransaction,
        id: 'transaction-bonus',
        type: TransactionType.BONUS,
        points: 20,
        source: 'continuous_streak',
        description: '连续打卡 7 天奖励',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.pointsTransaction.create.mockResolvedValue(bonusTransaction);

      const result = await service.bonusPoints(
        'user-123',
        20,
        'continuous_streak',
        '连续打卡 7 天奖励',
      );

      expect(result.type).toBe(TransactionType.BONUS);
      expect(result.points).toBe(20);
      expect(mockPrismaService.pointsTransaction.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          type: TransactionType.BONUS,
          points: 20,
          source: 'continuous_streak',
          description: '连续打卡 7 天奖励',
        },
      });
    });

    it('应该在奖励积分为负数或零时抛出 BadRequestException', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.bonusPoints('user-123', 0)).rejects.toThrow(BadRequestException);
      await expect(service.bonusPoints('user-123', -10)).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.pointsTransaction.create).not.toHaveBeenCalled();
    });

    it('应该在用户不存在时抛出 NotFoundException', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.bonusPoints('non-existent-user', 20)).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.pointsTransaction.create).not.toHaveBeenCalled();
    });
  });
});
