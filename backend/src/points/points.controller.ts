import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { UserRole } from '../generated/prisma/client';
import { PointsService } from './points.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CacheService } from '../common/cache/cache.service';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  EarnPointsDto,
  RedeemPointsDto,
  PointsTransactionQueryDto,
  PointsBalanceResponseDto,
  PointsTransactionResponseDto,
  LeaderboardQueryDto,
  LeaderboardResponseDto,
  LeaderboardEntryDto,
} from './dto';

/**
 * 请求用户接口（来自 JWT payload）
 */
interface RequestUser {
  id: string;
  userId: string;
  role: UserRole;
}

/**
 * 扩展的请求接口
 */
interface RequestWithUser extends Request {
  user: RequestUser;
}

/**
 * 积分管理控制器
 * 提供积分获得、消费、查询和交易历史接口
 */
@ApiTags('积分管理')
@Controller('api/v1/points')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PointsController {
  constructor(
    private readonly pointsService: PointsService,
    private readonly cacheService: CacheService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 获得积分
   * POST /api/v1/points/earn
   */
  @Post('earn')
  @ApiOperation({ summary: '获得积分', description: '用户完成任务后获得积分（系统内部调用）' })
  @ApiResponse({
    status: 201,
    description: '积分获得成功',
    type: PointsTransactionResponseDto,
  })
  @ApiResponse({ status: 404, description: '用户不存在' })
  @ApiResponse({ status: 500, description: '服务器内部错误' })
  async earnPoints(
    @Body() earnDto: EarnPointsDto,
    @Request() req: RequestWithUser,
  ): Promise<PointsTransactionResponseDto> {
    // 验证只有管理员或系统可以为其他用户添加积分
    if (earnDto.userId !== req.user.userId && req.user.role !== UserRole.ADMIN) {
      throw new BadRequestException('无权为其他用户添加积分');
    }

    return this.pointsService.earnPoints(earnDto);
  }

  /**
   * 消费积分
   * POST /api/v1/points/redeem
   */
  @Post('redeem')
  @ApiOperation({ summary: '消费积分', description: '用户兑换礼品或服务时消费积分' })
  @ApiResponse({
    status: 201,
    description: '积分消费成功',
    type: PointsTransactionResponseDto,
  })
  @ApiResponse({ status: 400, description: '积分不足' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  @ApiResponse({ status: 500, description: '服务器内部错误' })
  async redeemPoints(
    @Body() redeemDto: RedeemPointsDto,
    @Request() req: RequestWithUser,
  ): Promise<PointsTransactionResponseDto> {
    // 验证只能消费自己的积分
    if (redeemDto.userId !== req.user.userId) {
      throw new BadRequestException('只能消费自己的积分');
    }

    return this.pointsService.redeemPoints(redeemDto);
  }

  /**
   * 查询积分余额
   * GET /api/v1/points/balance/:userId
   */
  @Get('balance/:userId')
  @ApiOperation({ summary: '查询积分余额', description: '查询用户当前积分余额和统计信息' })
  @ApiParam({ name: 'userId', description: '用户 ID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: PointsBalanceResponseDto,
  })
  @ApiResponse({ status: 404, description: '用户不存在' })
  @ApiResponse({ status: 500, description: '服务器内部错误' })
  async getBalance(
    @Param('userId') userId: string,
    @Request() req: RequestWithUser,
  ): Promise<PointsBalanceResponseDto> {
    // 验证只能查询自己的积分，或者是管理员/医生
    if (
      userId !== req.user.userId &&
      req.user.role !== UserRole.ADMIN &&
      req.user.role !== UserRole.DOCTOR &&
      req.user.role !== UserRole.HEALTH_MANAGER
    ) {
      throw new BadRequestException('无权查询其他用户的积分');
    }

    return this.pointsService.getPointsBalance(userId);
  }

  /**
   * 查询积分交易历史
   * GET /api/v1/points/transactions/:userId
   */
  @Get('transactions/:userId')
  @ApiOperation({ summary: '查询积分交易历史', description: '分页查询用户的积分交易记录' })
  @ApiParam({ name: 'userId', description: '用户 ID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/PointsTransactionResponseDto' },
        },
        total: { type: 'number', description: '总记录数' },
        page: { type: 'number', description: '当前页码' },
        limit: { type: 'number', description: '每页条数' },
      },
    },
  })
  @ApiResponse({ status: 404, description: '用户不存在' })
  @ApiResponse({ status: 500, description: '服务器内部错误' })
  async getTransactionHistory(
    @Param('userId') userId: string,
    @Query() queryDto: PointsTransactionQueryDto,
    @Request() req: RequestWithUser,
  ): Promise<{
    data: PointsTransactionResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    // 验证只能查询自己的交易记录，或者是管理员/医生
    if (
      userId !== req.user.userId &&
      req.user.role !== UserRole.ADMIN &&
      req.user.role !== UserRole.DOCTOR &&
      req.user.role !== UserRole.HEALTH_MANAGER
    ) {
      throw new BadRequestException('无权查询其他用户的交易记录');
    }

    return this.pointsService.getTransactionHistory(userId, queryDto);
  }

  /**
   * 获取积分排行榜
   * GET /api/v1/points/leaderboard
   */
  @Get('leaderboard')
  @ApiOperation({ summary: '获取积分排行榜', description: '查询积分排行榜（总榜或周榜）' })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: LeaderboardResponseDto,
  })
  @ApiResponse({ status: 500, description: '服务器内部错误' })
  async getLeaderboard(
    @Query() query: LeaderboardQueryDto,
    @Request() req: RequestWithUser,
  ): Promise<LeaderboardResponseDto> {
    const { period = 'all-time', limit = 100, includeSelf = true } = query;
    const currentUserId = req.user.userId;

    // 构建 Redis key
    const leaderboardKey = this.getLeaderboardKey(period);

    // 获取 Top N 用户 ID 和积分
    const topEntries = await this.cacheService.getTopLeaderboard(leaderboardKey, limit);

    // 批量查询用户信息（优化性能，避免 N+1 查询）
    const userIds = topEntries.map((entry) => entry.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        username: true,
        fullName: true,
        avatarUrl: true,
      },
    });

    const userMap = new Map(users.map((user) => [user.id, user]));

    // 组装排行榜数据
    const leaderboardEntries: LeaderboardEntryDto[] = topEntries.map((entry, index) => ({
      rank: index + 1,
      userId: entry.userId,
      username: userMap.get(entry.userId)?.username || 'Unknown',
      fullName: userMap.get(entry.userId)?.fullName ?? undefined,
      avatarUrl: userMap.get(entry.userId)?.avatarUrl ?? undefined,
      points: entry.points,
    }));

    // 获取当前用户排名（如果请求）
    let currentUserEntry: LeaderboardEntryDto | null = null;
    if (includeSelf) {
      const rank = await this.cacheService.getUserRank(leaderboardKey, currentUserId);
      const points = await this.cacheService.getUserScore(leaderboardKey, currentUserId);

      if (rank !== null && points > 0) {
        const user = await this.prisma.user.findUnique({
          where: { id: currentUserId },
          select: {
            username: true,
            fullName: true,
            avatarUrl: true,
          },
        });

        if (user) {
          currentUserEntry = {
            rank,
            userId: currentUserId,
            username: user.username,
            fullName: user.fullName ?? undefined,
            avatarUrl: user.avatarUrl ?? undefined,
            points,
          };
        }
      }
    }

    // 获取排行榜总人数
    const totalUsers = await this.cacheService.getLeaderboardSize(leaderboardKey);

    return {
      period,
      periodLabel: this.getPeriodLabel(period),
      topEntries: leaderboardEntries,
      currentUser: currentUserEntry,
      totalUsers,
    };
  }

  /**
   * 根据时间维度获取排行榜 Redis key
   * @param period 时间维度
   * @returns Redis key
   */
  private getLeaderboardKey(period: string): string {
    const now = new Date();
    switch (period) {
      case 'weekly':
        return `leaderboard:weekly:${this.getWeekNumber(now)}`;
      default:
        return 'leaderboard:all-time';
    }
  }

  /**
   * 获取时间维度的中文标签
   * @param period 时间维度
   * @returns 中文标签
   */
  private getPeriodLabel(period: string): string {
    const now = new Date();
    switch (period) {
      case 'weekly': {
        const weekNum = this.getWeekNumber(now).split('-W')[1];
        return `${now.getFullYear()}年第${weekNum}周`;
      }
      default:
        return '总榜';
    }
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
