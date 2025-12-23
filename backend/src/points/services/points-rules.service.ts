import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface CheckInRule {
  points: number;
  description: string;
}

export interface StreakBonusRule {
  points: number;
  description: string;
}

export interface PointsRulesConfig {
  version: string;
  lastUpdated: string;
  checkInRules: Record<string, CheckInRule>;
  streakBonusRules: Record<string, StreakBonusRule>;
  specialRules: Record<string, CheckInRule>;
}

@Injectable()
export class PointsRulesService {
  private readonly logger = new Logger(PointsRulesService.name);

  private rulesConfig: PointsRulesConfig;

  private readonly configPath = path.join(process.cwd(), 'config', 'points-rules.json');

  constructor() {
    this.loadRulesConfig();
  }

  /**
   * 加载积分规则配置
   */
  loadRulesConfig(): PointsRulesConfig {
    try {
      const configContent = fs.readFileSync(this.configPath, 'utf-8');
      this.rulesConfig = JSON.parse(configContent);
      this.logger.log(`积分规则配置加载成功 (版本: ${this.rulesConfig.version})`);
      return this.rulesConfig;
    } catch (error) {
      this.logger.error('加载积分规则配置失败', error);
      throw new Error('Failed to load points rules configuration');
    }
  }

  /**
   * 获取当前规则配置
   */
  getRulesConfig(): PointsRulesConfig {
    return this.rulesConfig;
  }

  /**
   * 根据打卡类型计算积分
   */
  calculateCheckInPoints(type: string): number {
    const rule = this.rulesConfig.checkInRules[type];
    if (!rule) {
      this.logger.warn(`未找到打卡类型 "${type}" 的积分规则，返回 0 分`);
      return 0;
    }
    return rule.points;
  }

  /**
   * 计算连续打卡奖励积分
   */
  calculateStreakBonus(streakDays: number): number {
    // 检查是否达到奖励档位（从高到低检查）
    const bonusKeys = Object.keys(this.rulesConfig.streakBonusRules)
      .map(Number)
      .sort((a, b) => b - a); // 降序排序

    for (const days of bonusKeys) {
      if (streakDays >= days && streakDays % days === 0) {
        return this.rulesConfig.streakBonusRules[days].points;
      }
    }

    return 0;
  }

  /**
   * 获取特殊奖励积分
   */
  getSpecialRulePoints(ruleKey: string): number {
    const rule = this.rulesConfig.specialRules[ruleKey];
    if (!rule) {
      this.logger.warn(`未找到特殊规则 "${ruleKey}"，返回 0 分`);
      return 0;
    }
    return rule.points;
  }

  /**
   * 验证规则配置有效性
   */
  validateRules(): boolean {
    try {
      // 检查必要字段
      if (!this.rulesConfig.version || !this.rulesConfig.checkInRules) {
        throw new Error('配置缺少必要字段');
      }

      // 检查打卡规则
      const checkInTypes = [
        'blood_pressure',
        'blood_sugar',
        'medication',
        'exercise',
        'diet',
        'therapy',
      ];
      for (const type of checkInTypes) {
        if (!this.rulesConfig.checkInRules[type]) {
          throw new Error(`缺少打卡类型 "${type}" 的规则`);
        }
        if (this.rulesConfig.checkInRules[type].points <= 0) {
          throw new Error(`打卡类型 "${type}" 的积分必须大于 0`);
        }
      }

      // 检查连续奖励规则
      if (!this.rulesConfig.streakBonusRules) {
        throw new Error('缺少连续打卡奖励规则');
      }

      this.logger.log('积分规则配置验证通过');
      return true;
    } catch (error) {
      this.logger.error('积分规则配置验证失败', error);
      return false;
    }
  }

  /**
   * 获取所有打卡类型及其积分
   */
  getAllCheckInRules(): Record<string, CheckInRule> {
    return this.rulesConfig.checkInRules;
  }

  /**
   * 获取所有连续奖励档位
   */
  getAllStreakBonusRules(): Record<string, StreakBonusRule> {
    return this.rulesConfig.streakBonusRules;
  }
}
