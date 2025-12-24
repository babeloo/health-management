import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { AnalyticsService } from './analytics.service';
import {
  DashboardQueryDto,
  DashboardResponseDto,
  PatientStatsQueryDto,
  PatientStatsResponseDto,
  CheckInStatsQueryDto,
  CheckInStatsResponseDto,
  ExportReportDto,
} from './dto';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('api/v1/analytics')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @Permissions(Permission.VIEW_ANALYTICS)
  @ApiOperation({ summary: '获取仪表盘数据' })
  async getDashboard(@Query() query: DashboardQueryDto): Promise<DashboardResponseDto> {
    return this.analyticsService.getDashboard(query);
  }

  @Get('patient-stats')
  @Permissions(Permission.VIEW_ANALYTICS)
  @ApiOperation({ summary: '获取患者统计' })
  async getPatientStats(@Query() query: PatientStatsQueryDto): Promise<PatientStatsResponseDto> {
    return this.analyticsService.getPatientStats(query);
  }

  @Get('check-in-stats')
  @Permissions(Permission.VIEW_ANALYTICS)
  @ApiOperation({ summary: '获取打卡统计' })
  async getCheckInStats(@Query() query: CheckInStatsQueryDto): Promise<CheckInStatsResponseDto> {
    return this.analyticsService.getCheckInStats(query);
  }

  @Post('export')
  @Permissions(Permission.VIEW_ANALYTICS)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '导出报表' })
  async exportReport(@Body() dto: ExportReportDto, @Res() res: Response): Promise<void> {
    const buffer = await this.analyticsService.exportReport(dto);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=report-${dto.type}-${Date.now()}.xlsx`,
    );
    res.send(buffer);
  }
}
