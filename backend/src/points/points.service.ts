import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { TransactionType } from '../generated/prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { CacheService } from '../common/cache/cache.service';
import {
  EarnPointsDto,
  RedeemPointsDto,
  PointsTransactionQueryDto,
  PointsBalanceResponseDto,
  PointsTransactionResponseDto,
} from './dto';

/**
 * 积分服务
 * 管理用户积分的获得、消费、查询和交易历史记录
 */
@Injectable()
export class PointsService {
  private readonly logger = new Logger(PointsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * 获得积分
   * @param earnDto 获得积分 DTO
   * @returns 创建的积分交易记录
   */
  async earnPoints(earnDto: EarnPointsDto): Promise<PointsTransactionResponseDto> {
    // 验证用户存在
    const user = await this.prisma.user.findUnique({
      where: { id: earnDto.userId },
    });

    if (!user) {
      throw new NotFoundException(`用户 ${earnDto.userId} 不存在`);
    }

    try {
      // 创建积分交易记录（使用事务确保一致性）
      const transaction = await this.prisma.pointsTransaction.create({
        data: {
          userId: earnDto.userId,
          type: TransactionType.EARN,
          points: earnDto.points, // 正数表示获得
          source: earnDto.source || null,
          sourceId: earnDto.sourceId || null,
          description: earnDto.description || null,
        },
      });

      this.logger.log(
        `用户 ${earnDto.userId} 获得 ${earnDto.points} 积分 (来源: ${earnDto.source || '未指定'})`,
      );

      // 更新排行榜（总榜 + 周榜）
      await this.updateLeaderboards(earnDto.userId, earnDto.points);

      return this.mapTransactionToResponse(transaction);
    } catch (error) {
      this.logger.error(`获得积分失败: ${error.message}`, error.stack);
      throw new InternalServerErrorException('获得积分失败，请稍后重试');
    }
  }

  /**
   * 消费积分
   * @param redeemDto 消费积分 DTO
   * @returns 创建的积分交易记录
   */
  async redeemPoints(redeemDto: RedeemPointsDto): Promise<PointsTransactionResponseDto> {
    // 验证用户存在
    const user = await this.prisma.user.findUnique({
      where: { id: redeemDto.userId },
    });

    if (!user) {
      throw new NotFoundException(`用户 ${redeemDto.userId} 不存在`);
    }

    // 检查积分余额是否充足
    const balance = await this.getPointsBalance(redeemDto.userId);
    if (balance.balance < redeemDto.points) {
      throw new BadRequestException(
        `积分不足。当前余额: ${balance.balance}，所需积分: ${redeemDto.points}`,
      );
    }

    try {
      // 创建消费记录（使用事务确保一致性）
      const transaction = await this.prisma.pointsTransaction.create({
        data: {
          userId: redeemDto.userId,
          type: TransactionType.REDEEM,
          points: -redeemDto.points, // 负数表示消费
          source: redeemDto.source || null,
          sourceId: redeemDto.sourceId || null,
          description: redeemDto.description || null,
        },
      });

      this.logger.log(
        `用户 ${redeemDto.userId} 消费 ${redeemDto.points} 积分 (用途: ${redeemDto.source || '未指定'})`,
      );

      // 更新排行榜（扣除积分，仅更新总榜）
      await this.updateLeaderboards(redeemDto.userId, -redeemDto.points);

      return this.mapTransactionToResponse(transaction);
    } catch (error) {
      this.logger.error(`消费积分失败: ${error.message}`, error.stack);
      throw new InternalServerErrorException('消费积分失败，请稍后重试');
    }
  }

  /**
   * 查询用户积分余额
   * @param userId 用户 ID
   * @returns 积分余额信息
   */
  async getPointsBalance(userId: string): Promise<PointsBalanceResponseDto> {
    // 验证用户存在
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`用户 ${userId} 不存在`);
    }

    // 聚合查询积分余额
    // eslint-disable-next-line no-underscore-dangle
    const result = await this.prisma.pointsTransaction.aggregate({
      where: { userId },
      _sum: {
        points: true,
      },
    });

    // 计算总获得和总消费
    const transactions = await this.prisma.pointsTransaction.findMany({
      where: { userId },
      select: { points: true, type: true },
    });

    const totalEarned = transactions
      .filter((t) => t.points > 0)
      .reduce((sum, t) => sum + t.points, 0);

    const totalRedeemed = Math.abs(
      transactions.filter((t) => t.points < 0).reduce((sum, t) => sum + t.points, 0),
    );

    // eslint-disable-next-line no-underscore-dangle
    const balance = result._sum.points || 0;

    return {
      userId,
      balance,
      totalEarned,
      totalRedeemed,
    };
  }

  /**
   * 查询用户积分交易历史
   * @param userId 用户 ID
   * @param queryDto 查询条件
   * @returns 分页的交易记录列表
   */
  async getTransactionHistory(
    userId: string,
    queryDto: PointsTransactionQueryDto,
  ): Promise<{
    data: PointsTransactionResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    // 验证用户存在
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`用户 ${userId} 不存在`);
    }

    const { page = 1, limit = 20, type, startDate, endDate } = queryDto;

    // 构建查询条件
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { userId };

    if (type) {
      where.type = type;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // 查询总数
    const total = await this.prisma.pointsTransaction.count({ where });

    // 查询分页数据
    const transactions = await this.prisma.pointsTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: transactions.map((t) => this.mapTransactionToResponse(t)),
      total,
      page,
      limit,
    };
  }

  /**
   * 奖励积分（用于系统奖励、连续打卡等场景）
   * @param userId 用户 ID
   * @param points 奖励积分数
   * @param source 奖励来源
   * @param description 描述
   * @returns 创建的积分交易记录
   */
  async bonusPoints(
    userId: string,
    points: number,
    source?: string,
    description?: string,
  ): Promise<PointsTransactionResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`用户 ${userId} 不存在`);
    }

    if (points <= 0) {
      throw new BadRequestException('奖励积分必须为正数');
    }

    try {
      const transaction = await this.prisma.pointsTransaction.create({
        data: {
          userId,
          type: TransactionType.BONUS,
          points,
          source: source || null,
          description: description || null,
        },
      });

      this.logger.log(`用户 ${userId} 获得奖励积分 ${points} (来源: ${source || '系统奖励'})`);

      // 更新排行榜（总榜 + 周榜）
      await this.updateLeaderboards(userId, points);

      return this.mapTransactionToResponse(transaction);
    } catch (error) {
      this.logger.error(`奖励积分失败: ${error.message}`, error.stack);
      throw new InternalServerErrorException('奖励积分失败，请稍后重试');
    }
  }

  /**
   * 将 Prisma 交易记录映射为响应 DTO
   * @param transaction Prisma 交易记录
   * @returns 响应 DTO
   */
  private mapTransactionToResponse(transaction: {
    id: string;
    userId: string;
    type: TransactionType;
    points: number;
    source: string | null;
    sourceId: string | null;
    description: string | null;
    createdAt: Date;
  }): PointsTransactionResponseDto {
    return {
      id: transaction.id,
      userId: transaction.userId,
      type: transaction.type,
      points: transaction.points,
      source: transaction.source,
      sourceId: transaction.sourceId,
      description: transaction.description,
      createdAt: transaction.createdAt,
    };
  }

  /**
   * 更新排行榜（总榜 + 周榜）
   * @param userId 用户 ID
   * @param pointsChange 积分变化
   */
  private async updateLeaderboards(userId: string, pointsChange: number): Promise<void> {
    const now = new Date();
    const weekKey = `leaderboard:weekly:${this.getWeekNumber(now)}`;

    // 并行更新总榜和周榜（忽略错误，不影响主流程）
    await Promise.allSettled([
      this.cacheService.updateLeaderboard('leaderboard:all-time', userId, pointsChange),
      this.cacheService.updateLeaderboard(weekKey, userId, pointsChange),
    ]);
  }

  /**
   * 获取周编号（ISO 8601 格式：2025-W51）
   * @param date 日期
   * @returns 周编号字符串
   */
  private getWeekNumber(date: Date): string {
    const oneJan = new Date(date.getFullYear(), 0, 1);
    const numberOfDays = Math.floor((date.getTime() - oneJan.getTime()) / 86400000);
    const week = Math.ceil((numberOfDays + oneJan.getDay() + 1) / 7);
    return `${date.getFullYear()}-W${week.toString().padStart(2, '0')}`;
  }
}
