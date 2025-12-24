import { Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { UserRole, RiskLevel } from '../generated/prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { CacheService } from '../common/cache/cache.service';
import {
  DashboardQueryDto,
  DashboardResponseDto,
  PatientStatsQueryDto,
  PatientStatsResponseDto,
  PatientStatsGroupBy,
  CheckInStatsQueryDto,
  CheckInStatsResponseDto,
  ExportReportDto,
  ReportType,
} from './dto';

/**
 * 数据分析服务
 */
@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  private readonly DASHBOARD_CACHE_KEY = 'analytics:dashboard';

  private readonly DASHBOARD_CACHE_TTL = 300;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  async getDashboard(query: DashboardQueryDto): Promise<DashboardResponseDto> {
    const cacheKey = `${this.DASHBOARD_CACHE_KEY}:${JSON.stringify(query)}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

    const [
      totalPatients,
      activePatients,
      newPatientsWeek,
      newPatientsMonth,
      totalCheckIns,
      todayCheckIns,
      riskStats,
      totalDoctors,
      totalHealthManagers,
      topPatients,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: UserRole.PATIENT } }),
      this.prisma.user.count({
        where: {
          role: UserRole.PATIENT,
          lastLoginAt: { gte: weekAgo },
        },
      }),
      this.prisma.user.count({
        where: {
          role: UserRole.PATIENT,
          createdAt: { gte: weekAgo },
        },
      }),
      this.prisma.user.count({
        where: {
          role: UserRole.PATIENT,
          createdAt: { gte: monthAgo },
        },
      }),
      this.prisma.checkIn.count(),
      this.prisma.checkIn.count({
        where: {
          checkInDate: { equals: new Date(now.toISOString().split('T')[0]) },
        },
      }),
      this.getRiskStats(),
      this.prisma.user.count({ where: { role: UserRole.DOCTOR } }),
      this.prisma.user.count({ where: { role: UserRole.HEALTH_MANAGER } }),
      this.getTopPatients(),
    ]);

    const checkInCompletionRate = totalPatients > 0 ? (todayCheckIns / totalPatients) * 100 : 0;

    const result: DashboardResponseDto = {
      totalPatients,
      activePatients,
      newPatientsWeek,
      newPatientsMonth,
      totalCheckIns,
      todayCheckIns,
      checkInCompletionRate: Math.round(checkInCompletionRate * 100) / 100,
      highRiskPatients: riskStats.high,
      mediumRiskPatients: riskStats.medium,
      lowRiskPatients: riskStats.low,
      totalDoctors,
      totalHealthManagers,
      topPatients,
    };

    await this.cacheService.set(cacheKey, JSON.stringify(result), this.DASHBOARD_CACHE_TTL);
    return result;
  }

  async getPatientStats(query: PatientStatsQueryDto): Promise<PatientStatsResponseDto> {
    const groupBy = query.groupBy || PatientStatsGroupBy.DISEASE;

    switch (groupBy) {
      case PatientStatsGroupBy.RISK_LEVEL:
        return this.getPatientsByRiskLevel();
      case PatientStatsGroupBy.AGE_GROUP:
        return this.getPatientsByAgeGroup();
      case PatientStatsGroupBy.GENDER:
        return this.getPatientsByGender();
      default:
        return this.getPatientsByDisease();
    }
  }

  async getCheckInStats(query: CheckInStatsQueryDto): Promise<CheckInStatsResponseDto> {
    const where: any = {};
    if (query.type) where.type = query.type;
    if (query.startDate) where.checkInDate = { gte: new Date(query.startDate) };
    if (query.endDate) {
      where.checkInDate = { ...where.checkInDate, lte: new Date(query.endDate) };
    }

    const [dailyStats, typeStats, streakDistribution] = await Promise.all([
      this.getDailyCheckInStats(where),
      this.getCheckInTypeStats(where),
      this.getStreakDistribution(),
    ]);

    return {
      dailyStats,
      typeStats,
      completionRateTrend: [],
      streakDistribution,
    };
  }

  async exportReport(dto: ExportReportDto): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('报表');

    switch (dto.type) {
      case ReportType.PATIENTS:
        await this.exportPatientsReport(worksheet, dto);
        break;
      case ReportType.CHECK_INS:
        await this.exportCheckInsReport(worksheet, dto);
        break;
      case ReportType.RISK_ASSESSMENTS:
        await this.exportRiskAssessmentsReport(worksheet, dto);
        break;
      case ReportType.LEADERBOARD:
        await this.exportLeaderboardReport(worksheet);
        break;
    }

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  private async getRiskStats() {
    const latestAssessments = await this.prisma.riskAssessment.groupBy({
      by: ['userId', 'riskLevel'],
      _max: { assessedAt: true },
    });

    const stats = { high: 0, medium: 0, low: 0 };
    const userRisks = new Map<string, { level: RiskLevel; date: Date }>();

    for (const item of latestAssessments) {
      if (item._max.assessedAt) {
        const existing = userRisks.get(item.userId);
        if (!existing || item._max.assessedAt > existing.date) {
          userRisks.set(item.userId, { level: item.riskLevel, date: item._max.assessedAt });
        }
      }
    }

    for (const { level } of userRisks.values()) {
      if (level === RiskLevel.HIGH) stats.high += 1;
      else if (level === RiskLevel.MEDIUM) stats.medium += 1;
      else stats.low += 1;
    }

    return stats;
  }

  private async getTopPatients() {
    const transactions = await this.prisma.pointsTransaction.groupBy({
      by: ['userId'],
      _sum: { points: true },
      orderBy: { _sum: { points: 'desc' } },
      take: 10,
    });

    const userIds = transactions.map((t) => t.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, fullName: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u.fullName]));

    return transactions.map((t, index) => ({
      userId: t.userId,
      fullName: userMap.get(t.userId) || '未知',
      totalPoints: t._sum.points || 0,
      rank: index + 1,
    }));
  }

  private async getPatientsByRiskLevel(): Promise<PatientStatsResponseDto> {
    const stats = await this.getRiskStats();
    const total = stats.high + stats.medium + stats.low;

    return {
      groupBy: 'risk_level',
      data: [
        {
          label: '高风险',
          count: stats.high,
          percentage: total > 0 ? (stats.high / total) * 100 : 0,
        },
        {
          label: '中风险',
          count: stats.medium,
          percentage: total > 0 ? (stats.medium / total) * 100 : 0,
        },
        {
          label: '低风险',
          count: stats.low,
          percentage: total > 0 ? (stats.low / total) * 100 : 0,
        },
      ],
    };
  }

  private async getPatientsByAgeGroup(): Promise<PatientStatsResponseDto> {
    const patients = await this.prisma.user.findMany({
      where: { role: UserRole.PATIENT, birthDate: { not: null } },
      select: { birthDate: true },
    });

    const groups = { '<30': 0, '30-50': 0, '50-70': 0, '>70': 0 };
    const now = new Date();

    for (const p of patients) {
      if (p.birthDate) {
        const age = now.getFullYear() - p.birthDate.getFullYear();
        if (age < 30) groups['<30'] += 1;
        else if (age < 50) groups['30-50'] += 1;
        else if (age < 70) groups['50-70'] += 1;
        else groups['>70'] += 1;
      }
    }

    const total = patients.length;
    return {
      groupBy: 'age_group',
      data: Object.entries(groups).map(([label, count]) => ({
        label,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      })),
    };
  }

  private async getPatientsByGender(): Promise<PatientStatsResponseDto> {
    const stats = await this.prisma.user.groupBy({
      by: ['gender'],
      where: { role: UserRole.PATIENT },
      _count: true,
    });

    const total = stats.reduce((sum, s) => sum + s._count, 0);
    return {
      groupBy: 'gender',
      data: stats.map((s) => ({
        label: s.gender || '未知',
        count: s._count,
        percentage: total > 0 ? (s._count / total) * 100 : 0,
      })),
    };
  }

  private async getPatientsByDisease(): Promise<PatientStatsResponseDto> {
    const records = await this.prisma.healthRecord.findMany({
      select: { chronicDiseases: true },
    });

    const diseaseCount = new Map<string, number>();
    for (const record of records) {
      const diseases = (record.chronicDiseases as any)?.diseases || [];
      for (const disease of diseases) {
        diseaseCount.set(disease, (diseaseCount.get(disease) || 0) + 1);
      }
    }

    const total = Array.from(diseaseCount.values()).reduce((sum, c) => sum + c, 0);
    return {
      groupBy: 'disease',
      data: Array.from(diseaseCount.entries()).map(([label, count]) => ({
        label,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      })),
    };
  }

  private async getDailyCheckInStats(where: any) {
    const stats = await this.prisma.checkIn.groupBy({
      by: ['checkInDate'],
      where,
      _count: true,
      orderBy: { checkInDate: 'asc' },
    });

    return stats.map((s) => ({
      date: s.checkInDate.toISOString().split('T')[0],
      count: s._count,
    }));
  }

  private async getCheckInTypeStats(where: any) {
    const stats = await this.prisma.checkIn.groupBy({
      by: ['type'],
      where,
      _count: true,
    });

    const total = stats.reduce((sum, s) => sum + s._count, 0);
    return stats.map((s) => ({
      type: s.type,
      count: s._count,
      percentage: total > 0 ? (s._count / total) * 100 : 0,
    }));
  }

  private async getStreakDistribution() {
    const bonuses = await this.prisma.streakBonusRecord.groupBy({
      by: ['streakDays'],
      _count: true,
    });

    return bonuses.map((b) => ({
      days: `${b.streakDays}天`,
      userCount: b._count,
    }));
  }

  private async exportPatientsReport(worksheet: ExcelJS.Worksheet, dto: ExportReportDto) {
    worksheet.columns = [
      { header: '用户ID', key: 'id', width: 36 },
      { header: '姓名', key: 'fullName', width: 15 },
      { header: '性别', key: 'gender', width: 10 },
      { header: '年龄', key: 'age', width: 10 },
      { header: '注册时间', key: 'createdAt', width: 20 },
    ];

    const where: any = { role: UserRole.PATIENT };
    if (dto.startDate) where.createdAt = { gte: new Date(dto.startDate) };
    if (dto.endDate) where.createdAt = { ...where.createdAt, lte: new Date(dto.endDate) };

    const patients = await this.prisma.user.findMany({ where, take: 10000 });

    patients.forEach((p) => {
      const age = p.birthDate ? new Date().getFullYear() - p.birthDate.getFullYear() : null;
      worksheet.addRow({
        id: p.id,
        fullName: p.fullName || '未知',
        gender: p.gender || '未知',
        age: age || '未知',
        createdAt: p.createdAt.toISOString(),
      });
    });
  }

  private async exportCheckInsReport(worksheet: ExcelJS.Worksheet, dto: ExportReportDto) {
    worksheet.columns = [
      { header: '用户ID', key: 'userId', width: 36 },
      { header: '打卡类型', key: 'type', width: 15 },
      { header: '打卡日期', key: 'checkInDate', width: 15 },
      { header: '积分', key: 'pointsEarned', width: 10 },
      { header: '备注', key: 'notes', width: 30 },
    ];

    const where: any = {};
    if (dto.startDate) where.checkInDate = { gte: new Date(dto.startDate) };
    if (dto.endDate) where.checkInDate = { ...where.checkInDate, lte: new Date(dto.endDate) };

    const checkIns = await this.prisma.checkIn.findMany({ where, take: 10000 });

    checkIns.forEach((c) => {
      worksheet.addRow({
        userId: c.userId,
        type: c.type,
        checkInDate: c.checkInDate.toISOString().split('T')[0],
        pointsEarned: c.pointsEarned,
        notes: c.notes || '',
      });
    });
  }

  private async exportRiskAssessmentsReport(worksheet: ExcelJS.Worksheet, dto: ExportReportDto) {
    worksheet.columns = [
      { header: '用户ID', key: 'userId', width: 36 },
      { header: '评估类型', key: 'type', width: 15 },
      { header: '风险等级', key: 'riskLevel', width: 10 },
      { header: '风险分数', key: 'riskScore', width: 10 },
      { header: '评估时间', key: 'assessedAt', width: 20 },
    ];

    const where: any = {};
    if (dto.startDate) where.assessedAt = { gte: new Date(dto.startDate) };
    if (dto.endDate) where.assessedAt = { ...where.assessedAt, lte: new Date(dto.endDate) };

    const assessments = await this.prisma.riskAssessment.findMany({ where, take: 10000 });

    assessments.forEach((a) => {
      worksheet.addRow({
        userId: a.userId,
        type: a.type,
        riskLevel: a.riskLevel,
        riskScore: a.riskScore || 0,
        assessedAt: a.assessedAt.toISOString(),
      });
    });
  }

  private async exportLeaderboardReport(worksheet: ExcelJS.Worksheet) {
    worksheet.columns = [
      { header: '排名', key: 'rank', width: 10 },
      { header: '用户ID', key: 'userId', width: 36 },
      { header: '姓名', key: 'fullName', width: 15 },
      { header: '总积分', key: 'totalPoints', width: 15 },
    ];

    const topPatients = await this.getTopPatients();

    topPatients.forEach((p) => {
      worksheet.addRow(p);
    });
  }
}
