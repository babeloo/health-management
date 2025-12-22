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
import {
  EarnPointsDto,
  RedeemPointsDto,
  PointsTransactionQueryDto,
  PointsBalanceResponseDto,
  PointsTransactionResponseDto,
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
  constructor(private readonly pointsService: PointsService) {}

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
}
