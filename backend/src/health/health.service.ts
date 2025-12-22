import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { HealthRecord, UserRole, CheckIn, CheckInType } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { FileStorageService } from '../common/storage/file-storage.service';
import { CreateHealthRecordDto } from './dto/create-health-record.dto';
import { UpdateHealthRecordDto } from './dto/update-health-record.dto';
import { CreateCheckInDto } from './dto/create-check-in.dto';
import { CheckInQueryDto } from './dto/check-in-query.dto';
import {
  CheckInTrendQueryDto,
  CheckInTrendResponseDto,
  TrendStatisticsDto,
} from './dto/check-in-trend.dto';
import {
  CheckInCalendarQueryDto,
  CheckInCalendarResponseDto,
  CalendarDayDto,
  MonthlyStatsDto,
} from './dto/check-in-calendar.dto';

/**
 * 健康档案服务
 * 管理患者的健康档案创建、查询、更新和医疗文档上传
 */
@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fileStorageService: FileStorageService,
  ) {}

  /**
   * 创建健康档案
   * @param userId 用户 ID
   * @param createDto 创建 DTO
   * @returns 创建的健康档案
   */
  async createHealthRecord(
    userId: string,
    createDto: CreateHealthRecordDto,
  ): Promise<HealthRecord> {
    return this.prisma.healthRecord.create({
      data: {
        userId,
        height: createDto.height,
        weight: createDto.weight,
        bloodType: createDto.bloodType,
        chronicDiseases: createDto.chronicDiseases,
        allergies: createDto.allergies,
        familyHistory: createDto.familyHistory,
      },
    });
  }

  /**
   * 获取健康档案
   * 权限验证：
   * - 患者只能查看自己的档案
   * - 医生可以查看其管理的患者档案
   * - 管理员和健康管理师可以查看所有档案
   *
   * @param userId 目标用户 ID
   * @param currentUserId 当前登录用户 ID
   * @param currentUserRole 当前登录用户角色
   * @returns 健康档案
   */
  async getHealthRecord(
    userId: string,
    currentUserId: string,
    currentUserRole: UserRole,
  ): Promise<HealthRecord> {
    // 权限验证
    await this.validateAccess(userId, currentUserId, currentUserRole);

    // 查询健康档案
    const record = await this.prisma.healthRecord.findUnique({
      where: { userId },
    });

    if (!record) {
      throw new NotFoundException('健康档案不存在');
    }

    return record;
  }

  /**
   * 更新健康档案
   * 权限验证：仅允许患者本人更新
   *
   * @param userId 目标用户 ID
   * @param updateDto 更新 DTO
   * @param currentUserId 当前登录用户 ID
   * @param currentUserRole 当前登录用户角色
   * @returns 更新后的健康档案
   */
  async updateHealthRecord(
    userId: string,
    updateDto: UpdateHealthRecordDto,
    currentUserId: string,
    currentUserRole: UserRole,
  ): Promise<HealthRecord> {
    // 权限验证：仅允许患者本人更新
    if (currentUserRole === UserRole.PATIENT && currentUserId !== userId) {
      throw new ForbiddenException('无权更新他人的健康档案');
    }

    // 检查档案是否存在
    const existingRecord = await this.prisma.healthRecord.findUnique({
      where: { userId },
    });

    if (!existingRecord) {
      throw new NotFoundException('健康档案不存在');
    }

    // 更新档案
    return this.prisma.healthRecord.update({
      where: { userId },
      data: updateDto,
    });
  }

  /**
   * 添加医疗文档
   * 权限验证：仅允许患者本人上传
   *
   * @param userId 目标用户 ID
   * @param file 上传的文件
   * @param currentUserId 当前登录用户 ID
   * @param currentUserRole 当前登录用户角色
   * @returns 更新后的健康档案
   */
  async addDocument(
    userId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    currentUserId: string,
    currentUserRole: UserRole,
  ): Promise<HealthRecord> {
    // 权限验证：仅允许患者本人上传
    if (currentUserRole === UserRole.PATIENT && currentUserId !== userId) {
      throw new ForbiddenException('无权上传文档到他人的健康档案');
    }

    // 检查档案是否存在
    const existingRecord = await this.prisma.healthRecord.findUnique({
      where: { userId },
    });

    if (!existingRecord) {
      throw new NotFoundException('健康档案不存在');
    }

    // 上传文件到 MinIO
    const fileUrl = await this.fileStorageService.uploadHealthDocument(
      file.buffer,
      userId,
      file.originalname,
    );

    // 构建新文档对象
    const newDocument = {
      url: fileUrl,
      type: file.mimetype,
      name: file.originalname,
      size: file.size,
      uploadDate: new Date().toISOString(),
    };

    // 获取现有文档列表
    const existingDocuments = Array.isArray(existingRecord.documents)
      ? existingRecord.documents
      : [];

    // 更新档案，添加新文档
    return this.prisma.healthRecord.update({
      where: { userId },
      data: {
        documents: [...existingDocuments, newDocument],
      },
    });
  }

  /**
   * 验证访问权限
   * @param userId 目标用户 ID
   * @param currentUserId 当前登录用户 ID
   * @param currentUserRole 当前登录用户角色
   */
  private async validateAccess(
    userId: string,
    currentUserId: string,
    currentUserRole: UserRole,
  ): Promise<void> {
    // 管理员和健康管理师有全局访问权限
    if (currentUserRole === UserRole.ADMIN || currentUserRole === UserRole.HEALTH_MANAGER) {
      return;
    }

    // 患者只能访问自己的档案
    if (currentUserRole === UserRole.PATIENT) {
      if (currentUserId !== userId) {
        throw new ForbiddenException('无权访问他人的健康档案');
      }
      return;
    }

    // 医生可以访问其管理的患者档案
    if (currentUserRole === UserRole.DOCTOR) {
      const relation = await this.prisma.doctorPatientRelation.findFirst({
        where: {
          doctorId: currentUserId,
          patientId: userId,
          status: 'ACTIVE',
        },
      });

      if (!relation) {
        throw new ForbiddenException('无权访问该患者的健康档案');
      }
      return;
    }

    // 其他角色拒绝访问
    throw new ForbiddenException('无权访问健康档案');
  }

  // ==================== 打卡功能 ====================

  /**
   * 积分规则配置
   */
  private readonly POINTS_RULES: Record<CheckInType, number> = {
    BLOOD_PRESSURE: 10,
    BLOOD_SUGAR: 10,
    MEDICATION: 5,
    EXERCISE: 8,
    DIET: 5,
    THERAPY: 10,
  };

  /**
   * 创建打卡记录
   * @param userId 用户 ID
   * @param createDto 创建 DTO
   * @returns 创建的打卡记录
   */
  async createCheckIn(userId: string, createDto: CreateCheckInDto): Promise<CheckIn> {
    // 解析打卡日期（默认今天）
    const checkInDate = createDto.checkInDate ? new Date(createDto.checkInDate) : new Date();

    // 验证不能打卡未来日期
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    checkInDate.setHours(0, 0, 0, 0);

    if (checkInDate > today) {
      throw new BadRequestException('不能打卡未来日期');
    }

    // 验证数据格式
    this.validateCheckInData(createDto.type, createDto.data);

    // 检查唯一约束（每天每种类型只能打卡一次）
    const existingCheckIn = await this.prisma.checkIn.findUnique({
      where: {
        userId_type_checkInDate: {
          userId,
          type: createDto.type,
          checkInDate,
        },
      },
    });

    if (existingCheckIn) {
      throw new ConflictException('今日已完成该类型打卡，请勿重复打卡');
    }

    // 计算积分
    const pointsEarned = this.POINTS_RULES[createDto.type];

    // 创建打卡记录
    const checkIn = await this.prisma.checkIn.create({
      data: {
        userId,
        type: createDto.type,
        data: createDto.data,
        notes: createDto.notes,
        pointsEarned,
        checkInDate,
      },
    });

    // TODO: 第二阶段集成积分系统时，创建 PointsTransaction 记录
    // TODO: 实现连续打卡奖励逻辑

    return checkIn;
  }

  /**
   * 查询打卡记录列表
   * @param userId 用户 ID
   * @param query 查询条件
   * @returns 打卡记录列表和分页信息
   */
  async getCheckIns(
    userId: string,
    query: CheckInQueryDto,
  ): Promise<{ items: CheckIn[]; total: number; page: number; limit: number }> {
    const { type, startDate, endDate, page = 1, limit = 20 } = query;

    // 构建查询条件
    const where: any = { userId };

    if (type) {
      where.type = type;
    }

    if (startDate || endDate) {
      where.checkInDate = {};
      if (startDate) {
        where.checkInDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.checkInDate.lte = new Date(endDate);
      }
    }

    // 查询总数
    const total = await this.prisma.checkIn.count({ where });

    // 查询数据（按日期倒序）
    const items = await this.prisma.checkIn.findMany({
      where,
      orderBy: { checkInDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  /**
   * 趋势分析
   * @param userId 用户 ID
   * @param trendQuery 趋势查询条件
   * @returns 趋势分析结果
   */
  async getCheckInTrends(
    userId: string,
    trendQuery: CheckInTrendQueryDto,
  ): Promise<CheckInTrendResponseDto> {
    const { type, startDate, endDate } = trendQuery;

    // 查询指定时间范围内的打卡记录
    const checkIns = await this.prisma.checkIn.findMany({
      where: {
        userId,
        type,
        checkInDate: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      orderBy: { checkInDate: 'asc' },
    });

    // 构建趋势数据
    const data = checkIns.map((checkIn) => ({
      date: checkIn.checkInDate.toISOString().split('T')[0],
      ...(checkIn.data as object),
    }));

    // 计算统计数据
    const statistics = this.calculateStatistics(type, checkIns);

    return {
      type,
      startDate,
      endDate,
      data,
      statistics,
    };
  }

  /**
   * 日历视图
   * @param userId 用户 ID
   * @param calendarQuery 日历查询条件
   * @returns 日历视图数据
   */
  async getCheckInCalendar(
    userId: string,
    calendarQuery: CheckInCalendarQueryDto,
  ): Promise<CheckInCalendarResponseDto> {
    const { year, month } = calendarQuery;

    // 计算月份的开始和结束日期
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // 查询该月所有打卡记录
    const checkIns = await this.prisma.checkIn.findMany({
      where: {
        userId,
        checkInDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { checkInDate: 'asc' },
    });

    // 按日期分组
    const checkInsByDate = new Map<string, CheckIn[]>();
    checkIns.forEach((checkIn) => {
      const dateKey = checkIn.checkInDate.toISOString().split('T')[0];
      if (!checkInsByDate.has(dateKey)) {
        checkInsByDate.set(dateKey, []);
      }
      checkInsByDate.get(dateKey)!.push(checkIn);
    });

    // 构建日历数据
    const calendar: CalendarDayDto[] = [];
    checkInsByDate.forEach((dayCheckIns, date) => {
      calendar.push({
        date,
        checkedTypes: dayCheckIns.map((c) => c.type),
        totalPoints: dayCheckIns.reduce((sum, c) => sum + c.pointsEarned, 0),
      });
    });

    // 计算月度统计
    const monthlyStats = this.calculateMonthlyStats(checkIns, checkInsByDate);

    return {
      year,
      month,
      calendar,
      monthlyStats,
    };
  }

  /**
   * 验证打卡数据格式
   * @param type 打卡类型
   * @param data 打卡数据
   */
  private validateCheckInData(type: CheckInType, data: any): void {
    switch (type) {
      case CheckInType.BLOOD_PRESSURE:
        if (!data.systolic || !data.diastolic) {
          throw new BadRequestException('血压打卡必须包含 systolic 和 diastolic 字段');
        }
        if (data.systolic < 90 || data.systolic > 200) {
          throw new BadRequestException('收缩压必须在 90-200 mmHg 范围内');
        }
        if (data.diastolic < 60 || data.diastolic > 120) {
          throw new BadRequestException('舒张压必须在 60-120 mmHg 范围内');
        }
        if (data.pulse && (data.pulse < 40 || data.pulse > 150)) {
          throw new BadRequestException('脉搏必须在 40-150 次/分 范围内');
        }
        break;

      case CheckInType.BLOOD_SUGAR:
        if (!data.value || !data.timing) {
          throw new BadRequestException('血糖打卡必须包含 value 和 timing 字段');
        }
        if (data.value < 3 || data.value > 30) {
          throw new BadRequestException('血糖值必须在 3-30 mmol/L 范围内');
        }
        if (!['before_meal', 'after_meal', 'fasting'].includes(data.timing)) {
          throw new BadRequestException('timing 必须是 before_meal、after_meal 或 fasting');
        }
        break;

      case CheckInType.MEDICATION:
        if (!data.medication || !data.dosage || data.taken === undefined) {
          throw new BadRequestException('用药打卡必须包含 medication、dosage 和 taken 字段');
        }
        break;

      case CheckInType.EXERCISE:
        if (!data.exerciseType || !data.duration || !data.intensity) {
          throw new BadRequestException(
            '运动打卡必须包含 exerciseType、duration 和 intensity 字段',
          );
        }
        if (!['low', 'moderate', 'high'].includes(data.intensity)) {
          throw new BadRequestException('intensity 必须是 low、moderate 或 high');
        }
        break;

      case CheckInType.DIET:
        if (!data.meal || !data.items) {
          throw new BadRequestException('饮食打卡必须包含 meal 和 items 字段');
        }
        if (!['breakfast', 'lunch', 'dinner', 'snack'].includes(data.meal)) {
          throw new BadRequestException('meal 必须是 breakfast、lunch、dinner 或 snack');
        }
        break;

      case CheckInType.THERAPY:
        if (!data.therapyType || !data.duration) {
          throw new BadRequestException('理疗打卡必须包含 therapyType 和 duration 字段');
        }
        break;

      default:
        throw new BadRequestException('不支持的打卡类型');
    }
  }

  /**
   * 计算统计数据
   * @param type 打卡类型
   * @param checkIns 打卡记录列表
   * @returns 统计数据
   */
  private calculateStatistics(type: CheckInType, checkIns: CheckIn[]): TrendStatisticsDto {
    const statistics: TrendStatisticsDto = {
      totalCount: checkIns.length,
    };

    if (checkIns.length === 0) {
      return statistics;
    }

    switch (type) {
      case CheckInType.BLOOD_PRESSURE: {
        const systolicValues = checkIns.map((c) => (c.data as any).systolic);
        const diastolicValues = checkIns.map((c) => (c.data as any).diastolic);
        const pulseValues = checkIns
          .map((c) => (c.data as any).pulse)
          .filter((p) => p !== undefined);

        statistics.avgSystolic = this.average(systolicValues);
        statistics.avgDiastolic = this.average(diastolicValues);
        statistics.maxSystolic = Math.max(...systolicValues);
        statistics.minSystolic = Math.min(...systolicValues);

        if (pulseValues.length > 0) {
          statistics.avgPulse = this.average(pulseValues);
        }
        break;
      }

      case CheckInType.BLOOD_SUGAR: {
        const bloodSugarValues = checkIns.map((c) => (c.data as any).value);
        statistics.avgBloodSugar = this.average(bloodSugarValues);
        statistics.maxBloodSugar = Math.max(...bloodSugarValues);
        statistics.minBloodSugar = Math.min(...bloodSugarValues);
        break;
      }

      case CheckInType.EXERCISE: {
        const durationValues = checkIns.map((c) => (c.data as any).duration);
        statistics.totalExerciseDuration = durationValues.reduce((sum, d) => sum + d, 0);
        statistics.avgExerciseDuration = this.average(durationValues);
        break;
      }

      default:
        // 其他类型暂不需要特殊统计
        break;
    }

    return statistics;
  }

  /**
   * 计算月度统计
   * @param checkIns 打卡记录列表
   * @param checkInsByDate 按日期分组的打卡记录
   * @returns 月度统计数据
   */
  private calculateMonthlyStats(
    checkIns: CheckIn[],
    checkInsByDate: Map<string, CheckIn[]>,
  ): MonthlyStatsDto {
    const totalCheckIns = checkIns.length;
    const totalPoints = checkIns.reduce((sum, c) => sum + c.pointsEarned, 0);

    // 计算完成率（假设一个月 30 天，每天 6 种打卡类型）
    const daysInMonth = checkInsByDate.size;
    const expectedCheckIns = daysInMonth * 6; // 6 种打卡类型
    const completionRate =
      expectedCheckIns > 0 ? Math.round((totalCheckIns / expectedCheckIns) * 100) : 0;

    // 计算连续打卡天数（简化版，从最后一天往前算）
    const sortedDates = Array.from(checkInsByDate.keys()).sort().reverse();
    let continuousStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    sortedDates.forEach((dateStr, i) => {
      const checkDate = new Date(dateStr);
      checkDate.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor((today.getTime() - checkDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === i) {
        continuousStreak += 1;
      }
    });

    return {
      totalCheckIns,
      totalPoints,
      completionRate,
      continuousStreak,
    };
  }

  /**
   * 计算平均值
   * @param values 数值数组
   * @returns 平均值（保留两位小数）
   */
  private average(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((a, b) => a + b, 0);
    return Math.round((sum / values.length) * 100) / 100;
  }
}
