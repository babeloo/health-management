import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastCheckInDate: Date | null;
}

@Injectable()
export class StreakCalculationService {
  private readonly logger = new Logger(StreakCalculationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 计算用户连续打卡天数
   * 算法：从今天往前查询，计算连续打卡的天数
   */
  async calculateStreakDays(userId: string): Promise<number> {
    try {
      // 获取用户所有打卡记录，按日期降序排列
      const checkIns = await this.prisma.checkIn.findMany({
        where: { userId },
        orderBy: { checkInDate: 'desc' },
        select: { checkInDate: true },
      });

      if (checkIns.length === 0) {
        return 0;
      }

      // 计算连续天数
      let streakDays = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 将日期转换为 YYYY-MM-DD 格式的集合，去重
      const uniqueDates = new Set(checkIns.map((c) => this.formatDate(c.checkInDate)));

      // 从今天开始往前检查
      const currentDate = new Date(today);

      // 如果今天没打卡，检查昨天
      const todayStr = this.formatDate(today);
      if (!uniqueDates.has(todayStr)) {
        currentDate.setDate(currentDate.getDate() - 1);
      }

      // 计算连续天数
      while (true) {
        const dateStr = this.formatDate(currentDate);
        if (uniqueDates.has(dateStr)) {
          streakDays += 1;
          currentDate.setDate(currentDate.getDate() - 1);
        } else {
          break;
        }
      }

      return streakDays;
    } catch (error) {
      this.logger.error('计算连续打卡天数失败', error);
      throw error;
    }
  }

  /**
   * 获取用户连续打卡详细信息
   */
  async getStreakInfo(userId: string): Promise<StreakInfo> {
    try {
      const checkIns = await this.prisma.checkIn.findMany({
        where: { userId },
        orderBy: { checkInDate: 'desc' },
        select: { checkInDate: true },
      });

      if (checkIns.length === 0) {
        return {
          currentStreak: 0,
          longestStreak: 0,
          lastCheckInDate: null,
        };
      }

      const uniqueDates = new Set(checkIns.map((c) => this.formatDate(c.checkInDate)));
      const sortedDates = Array.from(uniqueDates).sort().reverse();

      // 计算当前连续天数
      let currentStreak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const currentDate = new Date(today);

      const todayStr = this.formatDate(today);
      if (!uniqueDates.has(todayStr)) {
        currentDate.setDate(currentDate.getDate() - 1);
      }

      while (true) {
        const dateStr = this.formatDate(currentDate);
        if (uniqueDates.has(dateStr)) {
          currentStreak += 1;
          currentDate.setDate(currentDate.getDate() - 1);
        } else {
          break;
        }
      }

      // 计算历史最长连续天数
      let longestStreak = 0;
      let tempStreak = 1;

      for (let i = 0; i < sortedDates.length - 1; i++) {
        const current = new Date(sortedDates[i]);
        const next = new Date(sortedDates[i + 1]);
        const daysDiff = Math.floor((current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff === 1) {
          tempStreak += 1;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak, currentStreak);

      return {
        currentStreak,
        longestStreak,
        lastCheckInDate: checkIns[0].checkInDate,
      };
    } catch (error) {
      this.logger.error('获取连续打卡信息失败', error);
      throw error;
    }
  }

  /**
   * 检查今日是否已触发指定档位的奖励
   * 防止同一天重复发放奖励
   */
  async hasTodayBonusTriggered(userId: string, streakDays: number): Promise<boolean> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const record = await this.prisma.streakBonusRecord.findFirst({
        where: {
          userId,
          streakDays,
          awardedAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      });

      return record !== null;
    } catch (error) {
      this.logger.error('检查奖励触发状态失败', error);
      throw error;
    }
  }

  /**
   * 记录连续打卡奖励发放
   */
  async recordStreakBonus(userId: string, streakDays: number, points: number): Promise<void> {
    try {
      await this.prisma.streakBonusRecord.create({
        data: {
          userId,
          streakDays,
          pointsAwarded: points,
        },
      });

      this.logger.log(`用户 ${userId} 连续打卡 ${streakDays} 天，发放奖励 ${points} 分`);
    } catch (error) {
      this.logger.error('记录连续打卡奖励失败', error);
      throw error;
    }
  }

  /**
   * 获取用户的奖励发放历史
   */
  async getBonusHistory(userId: string, limit = 10) {
    try {
      return await this.prisma.streakBonusRecord.findMany({
        where: { userId },
        orderBy: { awardedAt: 'desc' },
        take: limit,
      });
    } catch (error) {
      this.logger.error('获取奖励历史失败', error);
      throw error;
    }
  }

  /**
   * 格式化日期为 YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
