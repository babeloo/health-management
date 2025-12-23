import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  HealthRecord,
  UserRole,
  CheckIn,
  CheckInType,
  RiskAssessment,
  RiskLevel,
} from '../generated/prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { FileStorageService } from '../common/storage/file-storage.service';
import { InfluxService } from '../common/influx/influx.service';
import { RiskCalculationService } from './services/risk-calculation.service';
import { PointsRulesService } from '../points/services/points-rules.service';
import { StreakCalculationService } from '../points/services/streak-calculation.service';
import { PointsService } from '../points/points.service';
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
import {
  GetHealthTrendDto,
  HealthTrendResponseDto,
  BloodPressureTrendDto,
  BloodSugarTrendDto,
} from './dto/health-trend.dto';
import {
  CreateRiskAssessmentDto,
  QueryRiskAssessmentsDto,
  CompareRiskAssessmentsDto,
  RiskAssessmentType,
} from './dto/risk-assessment.dto';

/**
 * 健康档案服务
 * 管理患者的健康档案创建、查询、更新和医疗文档上传
 */
@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fileStorageService: FileStorageService,
    private readonly influxService: InfluxService,
    private readonly riskCalculationService: RiskCalculationService,
    private readonly pointsRulesService: PointsRulesService,
    private readonly streakCalculationService: StreakCalculationService,
    private readonly pointsService: PointsService,
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
   * 创建打卡记录
   * @param userId 用户 ID
   * @param createDto 创建 DTO
   * @returns 创建的打卡记录及积分信息
   */
  async createCheckIn(
    userId: string,
    createDto: CreateCheckInDto,
  ): Promise<CheckIn & { bonusPoints?: number; totalPoints?: number; streakDays?: number }> {
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
    // Prisma 7 复合唯一键查询语法
    const existingCheckIn = await this.prisma.checkIn.findFirst({
      where: {
        userId,
        type: createDto.type,
        checkInDate,
      },
    });

    if (existingCheckIn) {
      throw new ConflictException('今日已完成该类型打卡，请勿重复打卡');
    }

    // 1. 使用规则引擎计算基础积分
    const pointsEarned = this.pointsRulesService.calculateCheckInPoints(createDto.type);

    // 2. 创建打卡记录
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

    // 3. 同步到 InfluxDB（降级处理）
    try {
      if (createDto.type === CheckInType.BLOOD_PRESSURE) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await this.influxService.writeBloodPressure(userId, checkIn.id, createDto.data as any);
      } else if (createDto.type === CheckInType.BLOOD_SUGAR) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await this.influxService.writeBloodSugar(userId, checkIn.id, createDto.data as any);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `InfluxDB 写入失败，但打卡主流程成功: userId=${userId}, checkInId=${checkIn.id}, error=${errorMessage}`,
        errorStack,
      );
      // 不影响打卡主流程
    }

    // 4. 发放基础积分并计算连续奖励
    let bonusPoints = 0;
    let streakDays = 0;

    try {
      // 发放基础积分
      await this.pointsService.earnPoints({
        userId,
        points: pointsEarned,
        source: 'check_in',
        sourceId: checkIn.id,
        description: `${createDto.type} 打卡`,
      });

      // 5. 计算连续打卡天数
      streakDays = await this.streakCalculationService.calculateStreakDays(userId);

      // 6. 检查并发放连续奖励
      const streakBonusPoints = this.pointsRulesService.calculateStreakBonus(streakDays);
      if (streakBonusPoints > 0) {
        const hasBonusToday = await this.streakCalculationService.hasTodayBonusTriggered(
          userId,
          streakDays,
        );

        if (!hasBonusToday) {
          await this.pointsService.earnPoints({
            userId,
            points: streakBonusPoints,
            source: 'continuous_streak',
            sourceId: checkIn.id,
            description: `连续打卡 ${streakDays} 天奖励`,
          });

          await this.streakCalculationService.recordStreakBonus(
            userId,
            streakDays,
            streakBonusPoints,
          );

          bonusPoints = streakBonusPoints;
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `积分发放失败，但打卡主流程成功: userId=${userId}, checkInId=${checkIn.id}, error=${errorMessage}`,
        errorStack,
      );
      // 不影响打卡主流程
    }

    // 7. 返回结果，添加积分信息
    return {
      ...checkIn,
      bonusPoints,
      totalPoints: pointsEarned + bonusPoints,
      streakDays,
    };
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const systolicValues = checkIns.map((c) => (c.data as any).systolic);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const diastolicValues = checkIns.map((c) => (c.data as any).diastolic);
        const pulseValues = checkIns
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bloodSugarValues = checkIns.map((c) => (c.data as any).value);
        statistics.avgBloodSugar = this.average(bloodSugarValues);
        statistics.maxBloodSugar = Math.max(...bloodSugarValues);
        statistics.minBloodSugar = Math.min(...bloodSugarValues);
        break;
      }

      case CheckInType.EXERCISE: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // ==================== InfluxDB 时序数据查询 ====================

  /**
   * 获取健康趋势（基于 InfluxDB 时序数据）
   * @param userId 用户 ID
   * @param trendQuery 趋势查询条件
   * @returns 健康趋势数据
   */
  async getHealthTrend(
    userId: string,
    trendQuery: GetHealthTrendDto,
  ): Promise<HealthTrendResponseDto> {
    const { type, days } = trendQuery;

    // 计算时间范围
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - days * 24 * 60 * 60 * 1000);

    let data: BloodPressureTrendDto[] | BloodSugarTrendDto[] = [];

    // 根据类型查询 InfluxDB
    if (type === 'BLOOD_PRESSURE') {
      const influxData = await this.influxService.queryBloodPressure(userId, startTime, endTime);
      data = influxData.map((item) => ({
        timestamp: item.timestamp.toISOString(),
        systolic: item.systolic,
        diastolic: item.diastolic,
        pulse: item.pulse,
      }));
    } else if (type === 'BLOOD_SUGAR') {
      const influxData = await this.influxService.queryBloodSugar(userId, startTime, endTime);
      data = influxData.map((item) => ({
        timestamp: item.timestamp.toISOString(),
        value: item.value,
        timing: item.timing,
      }));
    }

    return {
      type,
      days,
      data,
      totalCount: data.length,
    };
  }

  // ==================== 风险评估功能 ====================

  /**
   * 创建风险评估
   * @param dto 创建风险评估 DTO
   * @returns 创建的风险评估记录
   */
  async createRiskAssessment(dto: CreateRiskAssessmentDto): Promise<RiskAssessment> {
    try {
      // 1. 验证用户是否存在
      const user = await this.prisma.user.findUnique({
        where: { id: dto.user_id },
      });

      if (!user) {
        throw new NotFoundException(`用户 ID ${dto.user_id} 不存在`);
      }

      const userId = dto.user_id;

      // 2. 可选：从 InfluxDB 获取设备数据
      let deviceData = null;
      if (dto.include_device_data) {
        deviceData = await this.getDeviceDataFromInfluxDB(userId, dto.assessment_type);
      }

      // 3. 调用 RiskCalculationService 计算风险
      let calculationResult;
      let questionnaireData;

      if (dto.assessment_type === RiskAssessmentType.DIABETES) {
        if (!dto.diabetes_questionnaire) {
          throw new BadRequestException('糖尿病风险评估需要提供问卷数据');
        }
        questionnaireData = dto.diabetes_questionnaire;
        calculationResult = this.riskCalculationService.calculateDiabetesRisk(
          dto.diabetes_questionnaire,
        );
      } else if (dto.assessment_type === RiskAssessmentType.STROKE) {
        if (!dto.stroke_questionnaire) {
          throw new BadRequestException('卒中风险评估需要提供问卷数据');
        }
        questionnaireData = dto.stroke_questionnaire;
        calculationResult = this.riskCalculationService.calculateStrokeRisk(
          dto.stroke_questionnaire,
        );
      } else {
        throw new BadRequestException(
          `暂不支持的评估类型: ${dto.assessment_type}，目前仅支持 diabetes 和 stroke`,
        );
      }

      const { score, level, recommendations, details } = calculationResult;

      // 转换 DTO 枚举到 Prisma 枚举（low -> LOW, medium -> MEDIUM, high -> HIGH）
      const prismaRiskLevel = level.toUpperCase() as RiskLevel;

      // 4. 保存评估结果到数据库
      const riskAssessment = await this.prisma.riskAssessment.create({
        data: {
          userId,
          type: dto.assessment_type,
          questionnaireData: questionnaireData as object,
          deviceData: deviceData ?? undefined, // null 转换为 undefined
          riskLevel: prismaRiskLevel,
          riskScore: score,
          resultDetails: details as object,
          aiRecommendations: recommendations.join('\n'),
        },
      });

      // 5. 检查风险等级变化（预留通知接口）
      await this.checkRiskLevelChange(userId, dto.assessment_type, prismaRiskLevel);

      return riskAssessment;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`创建风险评估失败: ${errorMessage}`, errorStack);
      throw new InternalServerErrorException('创建风险评估失败，请稍后重试');
    }
  }

  /* eslint-disable camelcase */
  /**
   * 查询风险评估列表
   * @param userId 用户 ID
   * @param query 查询条件
   * @returns 风险评估列表和分页信息
   */
  async getRiskAssessments(
    userId: string,
    query: QueryRiskAssessmentsDto,
  ): Promise<{ items: RiskAssessment[]; total: number; page: number; limit: number }> {
    try {
      // eslint-disable-next-line camelcase

      const { assessment_type, risk_level, start_date, end_date, page = 1, limit = 20 } = query;

      // 构建查询条件
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = { userId };

      // eslint-disable-next-line camelcase

      if (assessment_type) {
        // eslint-disable-next-line camelcase

        where.type = assessment_type;
      }

      // eslint-disable-next-line camelcase

      if (risk_level) {
        // eslint-disable-next-line camelcase

        where.riskLevel = risk_level;
      }

      // eslint-disable-next-line camelcase

      if (start_date || end_date) {
        where.assessedAt = {};

        // eslint-disable-next-line camelcase

        if (start_date) {
          // eslint-disable-next-line camelcase

          where.assessedAt.gte = new Date(start_date);
        }

        // eslint-disable-next-line camelcase

        if (end_date) {
          // eslint-disable-next-line camelcase

          where.assessedAt.lte = new Date(end_date);
        }
      }

      // 查询总数
      const total = await this.prisma.riskAssessment.count({ where });

      // 查询数据（按评估时间倒序）
      const items = await this.prisma.riskAssessment.findMany({
        where,
        orderBy: { assessedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      });

      return { items, total, page, limit };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`查询风险评估列表失败: ${errorMessage}`, errorStack);
      throw new InternalServerErrorException('查询风险评估列表失败，请稍后重试');
    }
  }

  /* eslint-disable camelcase */
  /**
   * 对比风险评估
   * @param userId 用户 ID
   * @param dto 对比条件
   * @returns 对比结果
   */
  async compareRiskAssessments(
    userId: string,
    dto: CompareRiskAssessmentsDto,
  ): Promise<{
    assessmentType: RiskAssessmentType;
    comparisons: Array<{
      id: string;
      assessedAt: Date;
      riskLevel: RiskLevel;
      riskScore: number | null;
    }>;
    trend: 'increased' | 'decreased' | 'stable';
    avgScore: number;
    maxScore: number;
    minScore: number;
  }> {
    try {
      // eslint-disable-next-line camelcase

      const { assessment_type, count = 5 } = dto;

      // 查询指定类型的最近 N 次评估
      const assessments = await this.prisma.riskAssessment.findMany({
        where: {
          userId,
          type: assessment_type,
        },
        orderBy: { assessedAt: 'desc' },
        take: count,
        select: {
          id: true,
          assessedAt: true,
          riskLevel: true,
          riskScore: true,
        },
      });

      // 至少需要 2 次评估才能对比
      if (assessments.length < 2) {
        throw new BadRequestException(
          `对比评估需要至少 2 次评估记录，当前仅有 ${assessments.length} 次`,
        );
      }

      // 计算趋势（基于风险评分）
      const scores = assessments.map((a) => a.riskScore || 0).reverse(); // 按时间正序
      let trend: 'increased' | 'decreased' | 'stable' = 'stable';

      if (scores.length >= 2) {
        const firstScore = scores[0];
        const lastScore = scores[scores.length - 1];
        const diff = lastScore - firstScore;

        if (diff > 2) {
          trend = 'increased'; // 风险增加
        } else if (diff < -2) {
          trend = 'decreased'; // 风险降低
        } else {
          trend = 'stable'; // 风险稳定
        }
      }

      // 计算统计信息
      const avgScore = this.average(scores);
      const maxScore = Math.max(...scores);
      const minScore = Math.min(...scores);

      return {
        // eslint-disable-next-line camelcase

        assessmentType: assessment_type,
        comparisons: assessments,
        trend,
        avgScore,
        maxScore,
        minScore,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`对比风险评估失败: ${errorMessage}`, errorStack);
      throw new InternalServerErrorException('对比风险评估失败，请稍后重试');
    }
  }

  /**
   * 从 InfluxDB 获取设备数据（血压或血糖）
   * @param userId 用户 ID
   * @param type 评估类型
   * @returns 设备数据对象或 null
   */
  private async getDeviceDataFromInfluxDB(
    userId: string,
    type: RiskAssessmentType,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    try {
      // 计算最近 30 天的时间范围
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 30 * 24 * 60 * 60 * 1000);

      if (type === RiskAssessmentType.DIABETES) {
        // 糖尿病评估：获取最近 30 天的血糖数据
        const bloodSugarData = await this.influxService.queryBloodSugar(userId, startTime, endTime);

        if (bloodSugarData.length === 0) {
          return null;
        }

        // 计算平均血糖值
        const avgBloodSugar = this.average(bloodSugarData.map((d) => d.value));

        return {
          avgBloodSugar,
          dataCount: bloodSugarData.length,
          timeRange: {
            start: startTime.toISOString(),
            end: endTime.toISOString(),
          },
        };
      }
      if (type === RiskAssessmentType.STROKE) {
        // 卒中评估：获取最近 30 天的血压数据
        const bloodPressureData = await this.influxService.queryBloodPressure(
          userId,
          startTime,
          endTime,
        );

        if (bloodPressureData.length === 0) {
          return null;
        }

        // 计算平均血压值
        const avgSystolic = this.average(bloodPressureData.map((d) => d.systolic));
        const avgDiastolic = this.average(bloodPressureData.map((d) => d.diastolic));

        return {
          avgSystolic,
          avgDiastolic,
          dataCount: bloodPressureData.length,
          timeRange: {
            start: startTime.toISOString(),
            end: endTime.toISOString(),
          },
        };
      }

      return null;
    } catch (error) {
      // InfluxDB 查询失败不应影响主流程，返回 null
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `从 InfluxDB 获取设备数据失败: userId=${userId}, type=${type}, error=${errorMessage}`,
      );
      return null;
    }
  }

  /**
   * 检查风险等级变化
   * @param userId 用户 ID
   * @param type 评估类型
   * @param newLevel 新的风险等级
   */
  private async checkRiskLevelChange(
    userId: string,
    type: RiskAssessmentType,
    newLevel: RiskLevel,
  ): Promise<void> {
    try {
      // 查询上一次同类型评估的风险等级
      const lastAssessment = await this.prisma.riskAssessment.findFirst({
        where: {
          userId,
          type,
        },
        orderBy: { assessedAt: 'desc' },
        skip: 1, // 跳过刚创建的这条记录
        take: 1,
        select: {
          riskLevel: true,
        },
      });

      if (!lastAssessment) {
        // 首次评估，无需对比
        return;
      }

      const oldLevel = lastAssessment.riskLevel;

      // 如果风险等级变化
      if (oldLevel !== newLevel) {
        this.logger.log(`用户 ${userId} 的 ${type} 风险等级从 ${oldLevel} 变为 ${newLevel}`);

        // 如果风险等级变为 high，记录警告日志
        if (newLevel === RiskLevel.HIGH) {
          this.logger.warn(`⚠️ 用户 ${userId} 的 ${type} 风险等级升高至 HIGH，建议及时关注`);

          // TODO: 未来集成通知模块
          // await this.notificationService.sendRiskAlert(userId, type, newLevel);
        }
      }
    } catch (error) {
      // 检查风险等级变化失败不应影响主流程
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `检查风险等级变化失败: userId=${userId}, type=${type}, error=${errorMessage}`,
      );
    }
  }
}
