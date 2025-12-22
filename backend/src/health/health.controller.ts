import {
  Controller,
  Post,
  Get,
  Put,
  Param,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  PayloadTooLargeException,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiQuery,
} from '@nestjs/swagger';
import { HealthService } from './health.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateHealthRecordDto,
  UpdateHealthRecordDto,
  HealthDocumentDto,
  CreateCheckInDto,
  CheckInQueryDto,
  CheckInTrendQueryDto,
  CheckInCalendarQueryDto,
} from './dto';

/**
 * 健康档案控制器
 * 提供健康档案的创建、查询、更新和医疗文档上传功能
 */
@ApiTags('健康档案')
@ApiBearerAuth()
@Controller('health')
@UseGuards(JwtAuthGuard)
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * 创建健康档案
   * POST /api/v1/health/records
   */
  @Post('records')
  @ApiOperation({ summary: '创建健康档案' })
  @ApiResponse({
    status: 201,
    description: '健康档案创建成功',
  })
  @ApiResponse({
    status: 400,
    description: '请求参数验证失败',
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  async createHealthRecord(@Request() req: any, @Body() createDto: CreateHealthRecordDto) {
    const { userId } = req.user;
    const record = await this.healthService.createHealthRecord(userId, createDto);

    return {
      success: true,
      data: record,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 获取健康档案
   * GET /api/v1/health/records/:userId
   */
  @Get('records/:userId')
  @ApiOperation({ summary: '获取健康档案' })
  @ApiResponse({
    status: 200,
    description: '获取健康档案成功',
  })
  @ApiResponse({
    status: 403,
    description: '无权访问该健康档案',
  })
  @ApiResponse({
    status: 404,
    description: '健康档案不存在',
  })
  async getHealthRecord(@Param('userId') userId: string, @Request() req: any) {
    const currentUserId = req.user.userId;
    const currentUserRole = req.user.role;

    const record = await this.healthService.getHealthRecord(userId, currentUserId, currentUserRole);

    return {
      success: true,
      data: record,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 更新健康档案
   * PUT /api/v1/health/records/:userId
   */
  @Put('records/:userId')
  @ApiOperation({ summary: '更新健康档案' })
  @ApiResponse({
    status: 200,
    description: '更新健康档案成功',
  })
  @ApiResponse({
    status: 400,
    description: '请求参数验证失败',
  })
  @ApiResponse({
    status: 403,
    description: '无权更新该健康档案',
  })
  @ApiResponse({
    status: 404,
    description: '健康档案不存在',
  })
  async updateHealthRecord(
    @Param('userId') userId: string,
    @Body() updateDto: UpdateHealthRecordDto,
    @Request() req: any,
  ) {
    const currentUserId = req.user.userId;
    const currentUserRole = req.user.role;

    const record = await this.healthService.updateHealthRecord(
      userId,
      updateDto,
      currentUserId,
      currentUserRole,
    );

    return {
      success: true,
      data: record,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 上传医疗文档
   * POST /api/v1/health/records/:userId/documents
   */
  @Post('records/:userId/documents')
  @ApiOperation({ summary: '上传医疗文档' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: '医疗文档上传成功',
    type: HealthDocumentDto,
  })
  @ApiResponse({
    status: 400,
    description: '文件格式不支持或文件大小超出限制',
  })
  @ApiResponse({
    status: 403,
    description: '无权上传文档到该健康档案',
  })
  @ApiResponse({
    status: 413,
    description: '文件大小超过 10MB',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  async uploadDocument(
    @Param('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    // 验证文件是否上传
    if (!file) {
      throw new BadRequestException('请上传文件');
    }

    // 验证文件类型
    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('仅支持 PDF、JPG、PNG 格式');
    }

    // 验证文件大小（额外检查，防止超大文件）
    if (file.size > 10 * 1024 * 1024) {
      throw new PayloadTooLargeException('文件大小不能超过 10MB');
    }

    const currentUserId = req.user.userId;
    const currentUserRole = req.user.role;

    const record = await this.healthService.addDocument(
      userId,
      {
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      },
      currentUserId,
      currentUserRole,
    );

    // 获取最新添加的文档
    const documents = Array.isArray(record.documents) ? record.documents : [];
    const latestDocument = documents[documents.length - 1];

    return {
      success: true,
      data: latestDocument,
      timestamp: new Date().toISOString(),
    };
  }

  // ==================== 打卡功能 ====================

  /**
   * 创建打卡记录
   * POST /api/v1/health/check-ins
   */
  @Post('check-ins')
  @ApiOperation({ summary: '创建打卡记录' })
  @ApiResponse({
    status: 201,
    description: '打卡成功',
  })
  @ApiResponse({
    status: 400,
    description: '请求参数验证失败或数据格式错误',
  })
  @ApiResponse({
    status: 409,
    description: '今日已完成该类型打卡',
  })
  async createCheckIn(@Request() req: any, @Body() createDto: CreateCheckInDto) {
    const { userId } = req.user;
    const checkIn = await this.healthService.createCheckIn(userId, createDto);

    return {
      success: true,
      data: checkIn,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 查询打卡记录列表
   * GET /api/v1/health/check-ins/:userId
   */
  @Get('check-ins/:userId')
  @ApiOperation({ summary: '查询打卡记录列表' })
  @ApiQuery({ name: 'type', required: false, description: '打卡类型' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期（YYYY-MM-DD）' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期（YYYY-MM-DD）' })
  @ApiQuery({ name: 'page', required: false, description: '页码', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量', type: Number })
  @ApiResponse({
    status: 200,
    description: '查询成功',
  })
  async getCheckIns(@Param('userId') userId: string, @Query() query: CheckInQueryDto) {
    const result = await this.healthService.getCheckIns(userId, query);

    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 趋势分析
   * GET /api/v1/health/check-ins/:userId/trends
   */
  @Get('check-ins/:userId/trends')
  @ApiOperation({ summary: '打卡趋势分析' })
  @ApiQuery({ name: 'type', required: true, description: '打卡类型' })
  @ApiQuery({ name: 'startDate', required: true, description: '开始日期（YYYY-MM-DD）' })
  @ApiQuery({ name: 'endDate', required: true, description: '结束日期（YYYY-MM-DD）' })
  @ApiResponse({
    status: 200,
    description: '分析成功',
  })
  async getCheckInTrends(
    @Param('userId') userId: string,
    @Query() trendQuery: CheckInTrendQueryDto,
  ) {
    const result = await this.healthService.getCheckInTrends(userId, trendQuery);

    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 日历视图
   * GET /api/v1/health/check-ins/:userId/calendar
   */
  @Get('check-ins/:userId/calendar')
  @ApiOperation({ summary: '打卡日历视图' })
  @ApiQuery({ name: 'year', required: true, description: '年份', type: Number })
  @ApiQuery({ name: 'month', required: true, description: '月份（1-12）', type: Number })
  @ApiResponse({
    status: 200,
    description: '查询成功',
  })
  async getCheckInCalendar(
    @Param('userId') userId: string,
    @Query() calendarQuery: CheckInCalendarQueryDto,
  ) {
    const result = await this.healthService.getCheckInCalendar(userId, calendarQuery);

    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }
}
