import { Injectable } from '@nestjs/common';
import {
  DiabetesQuestionnaireDto,
  StrokeQuestionnaireDto,
  ExerciseFrequency,
  FamilyHistory,
  Gender,
  RiskLevel,
} from '../dto/risk-assessment.dto';

/**
 * 风险评分详情接口
 */
export interface RiskScoreDetails {
  age_score?: number;
  bmi_score?: number;
  waist_score?: number;
  exercise_score?: number;
  diet_score?: number;
  hypertension_score?: number;
  glucose_history_score?: number;
  family_history_score?: number;
  gender_score?: number;
  bp_score?: number;
  diabetes_score?: number;
  smoking_score?: number;
  cvd_history_score?: number;
  atrial_fib_score?: number;
  [key: string]: number | undefined;
}

/**
 * 风险评估计算结果接口
 */
export interface RiskCalculationResult {
  score: number;
  level: RiskLevel;
  recommendations: string[];
  details: RiskScoreDetails;
}

/**
 * 风险评估算法服务
 *
 * 实现糖尿病和卒中的风险评分算法
 */
@Injectable()
export class RiskCalculationService {
  /**
   * 计算糖尿病风险（基于 FINDRISC 简化版）
   *
   * 评分规则：
   * - 年龄：<45岁(0分), 45-54(2分), 55-64(3分), ≥65(4分)
   * - BMI：<25(0分), 25-30(1分), >30(3分)
   * - 腰围：<90(0分), 90-100(3分), >100(4分)
   * - 运动频率：daily(0分), weekly/rarely(2分)
   * - 饮食：蔬菜水果充足(0分), 不足(1分)
   * - 高血压：有(2分), 无(0分)
   * - 血糖史：有(5分), 无(0分)
   * - 家族史：无(0分), 二级亲属(3分), 一级亲属(5分)
   *
   * 风险等级：
   * - 低风险：<7分
   * - 中风险：7-14分
   * - 高风险：≥15分
   *
   * @param data 糖尿病问卷数据
   * @returns 风险评估结果
   */
  calculateDiabetesRisk(data: DiabetesQuestionnaireDto): RiskCalculationResult {
    let score = 0;
    const details: RiskScoreDetails = {};

    // 1. 年龄评分
    let ageScore = 0;
    if (data.age < 45) {
      ageScore = 0;
    } else if (data.age >= 45 && data.age < 55) {
      ageScore = 2;
    } else if (data.age >= 55 && data.age < 65) {
      ageScore = 3;
    } else {
      // age >= 65
      ageScore = 4;
    }
    score += ageScore;
    details.age_score = ageScore;

    // 2. BMI 评分
    let bmiScore = 0;
    if (data.bmi < 25) {
      bmiScore = 0;
    } else if (data.bmi >= 25 && data.bmi <= 30) {
      bmiScore = 1;
    } else {
      // bmi > 30
      bmiScore = 3;
    }
    score += bmiScore;
    details.bmi_score = bmiScore;

    // 3. 腰围评分
    let waistScore = 0;
    if (data.waist_circumference < 90) {
      waistScore = 0;
    } else if (data.waist_circumference >= 90 && data.waist_circumference <= 100) {
      waistScore = 3;
    } else {
      // waist > 100
      waistScore = 4;
    }
    score += waistScore;
    details.waist_score = waistScore;

    // 4. 运动频率评分
    let exerciseScore = 0;
    if (data.exercise_frequency === ExerciseFrequency.DAILY) {
      exerciseScore = 0;
    } else {
      // weekly 或 rarely
      exerciseScore = 2;
    }
    score += exerciseScore;
    details.exercise_score = exerciseScore;

    // 5. 饮食评分（高糖饮食为不足）
    let dietScore = 0;
    if (data.high_sugar_diet) {
      dietScore = 1;
    }
    score += dietScore;
    details.diet_score = dietScore;

    // 6. 高血压评分
    let hypertensionScore = 0;
    if (data.hypertension) {
      hypertensionScore = 2;
    }
    score += hypertensionScore;
    details.hypertension_score = hypertensionScore;

    // 7. 血糖史评分
    let glucoseHistoryScore = 0;
    if (data.blood_glucose_history) {
      glucoseHistoryScore = 5;
    }
    score += glucoseHistoryScore;
    details.glucose_history_score = glucoseHistoryScore;

    // 8. 家族史评分
    let familyHistoryScore = 0;
    if (data.family_history === FamilyHistory.FIRST) {
      familyHistoryScore = 5;
    } else if (data.family_history === FamilyHistory.SECOND) {
      familyHistoryScore = 3;
    }
    score += familyHistoryScore;
    details.family_history_score = familyHistoryScore;

    // 确定风险等级
    let level: RiskLevel;
    if (score < 7) {
      level = RiskLevel.LOW;
    } else if (score >= 7 && score < 15) {
      level = RiskLevel.MEDIUM;
    } else {
      level = RiskLevel.HIGH;
    }

    // 生成建议
    const recommendations = this.generateDiabetesRecommendations(level, data);

    return {
      score,
      level,
      recommendations,
      details,
    };
  }

  /**
   * 计算卒中风险（基于 Framingham 简化版）
   *
   * 评分规则：
   * - 年龄：每10岁增加2分（最高10分）
   * - 性别：男性(1分), 女性(0分)
   * - 收缩压：<120(0分), 120-139(2分), 140-159(3分), ≥160(4分)
   * - 糖尿病：有(2分), 无(0分)
   * - 吸烟：是(2分), 否(0分)
   * - 心血管疾病史：有(2分), 无(0分)
   * - 房颤：有(4分), 无(0分) - 高风险因素
   *
   * 风险等级：
   * - 低风险：<6分
   * - 中风险：6-11分
   * - 高风险：≥12分
   *
   * @param data 卒中问卷数据
   * @returns 风险评估结果
   */
  calculateStrokeRisk(data: StrokeQuestionnaireDto): RiskCalculationResult {
    let score = 0;
    const details: RiskScoreDetails = {};

    // 1. 年龄评分（每10岁增加2分，最高10分）
    let ageScore = Math.floor(data.age / 10) * 2;
    if (ageScore > 10) {
      ageScore = 10;
    }
    score += ageScore;
    details.age_score = ageScore;

    // 2. 性别评分
    let genderScore = 0;
    if (data.gender === Gender.MALE) {
      genderScore = 1;
    }
    score += genderScore;
    details.gender_score = genderScore;

    // 3. 收缩压评分
    let bpScore = 0;
    if (data.systolic_bp < 120) {
      bpScore = 0;
    } else if (data.systolic_bp >= 120 && data.systolic_bp < 140) {
      bpScore = 2;
    } else if (data.systolic_bp >= 140 && data.systolic_bp < 160) {
      bpScore = 3;
    } else {
      // systolic_bp >= 160
      bpScore = 4;
    }
    score += bpScore;
    details.bp_score = bpScore;

    // 4. 糖尿病评分
    let diabetesScore = 0;
    if (data.has_diabetes) {
      diabetesScore = 2;
    }
    score += diabetesScore;
    details.diabetes_score = diabetesScore;

    // 5. 吸烟评分
    let smokingScore = 0;
    if (data.smoking) {
      smokingScore = 2;
    }
    score += smokingScore;
    details.smoking_score = smokingScore;

    // 6. 心血管疾病史评分
    let cvdHistoryScore = 0;
    if (data.cvd_history) {
      cvdHistoryScore = 2;
    }
    score += cvdHistoryScore;
    details.cvd_history_score = cvdHistoryScore;

    // 7. 房颤评分（高风险因素）
    let atrialFibScore = 0;
    if (data.atrial_fibrillation) {
      atrialFibScore = 4;
    }
    score += atrialFibScore;
    details.atrial_fib_score = atrialFibScore;

    // 确定风险等级
    let level: RiskLevel;
    if (score < 6) {
      level = RiskLevel.LOW;
    } else if (score >= 6 && score < 12) {
      level = RiskLevel.MEDIUM;
    } else {
      level = RiskLevel.HIGH;
    }

    // 生成建议
    const recommendations = this.generateStrokeRecommendations(level, data);

    return {
      score,
      level,
      recommendations,
      details,
    };
  }

  /**
   * 生成糖尿病风险建议
   *
   * @param level 风险等级
   * @param data 问卷数据
   * @returns 建议列表
   */
  private generateDiabetesRecommendations(
    level: RiskLevel,
    data: DiabetesQuestionnaireDto,
  ): string[] {
    const recommendations: string[] = [];

    // 免责声明（必须包含）
    recommendations.push('此建议仅供参考,请咨询专业医生。');

    // 根据风险等级生成通用建议
    if (level === RiskLevel.HIGH) {
      recommendations.push('您的糖尿病风险较高,建议尽快就医进行专业评估。');
      recommendations.push('建议检测空腹血糖和糖化血红蛋白(HbA1c)。');
    } else if (level === RiskLevel.MEDIUM) {
      recommendations.push('您的糖尿病风险为中等水平,建议定期监测血糖。');
      recommendations.push('建议每年至少进行一次血糖检查。');
    } else {
      recommendations.push('您的糖尿病风险较低,请继续保持健康的生活方式。');
    }

    // 针对性建议

    // BMI 建议
    if (data.bmi >= 25) {
      recommendations.push('建议控制体重,保持 BMI 在 18.5-24.9 的健康范围内。');
    }

    // 运动建议
    if (
      data.exercise_frequency === ExerciseFrequency.RARELY ||
      data.exercise_frequency === ExerciseFrequency.WEEKLY
    ) {
      recommendations.push('建议每天进行至少 30 分钟的中等强度运动,如快走、慢跑、游泳等。');
    }

    // 饮食建议
    if (data.high_sugar_diet) {
      recommendations.push('建议减少高糖食物的摄入,增加蔬菜和全谷物的比例。');
      recommendations.push('建议每天摄入至少 5 种不同颜色的蔬菜水果。');
    }

    // 高血压建议
    if (data.hypertension) {
      recommendations.push('您有高血压史,请遵医嘱按时服药,并定期监测血压。');
    }

    // 血糖史建议
    if (data.blood_glucose_history) {
      recommendations.push('您有血糖异常史,请严格控制饮食,定期复查血糖。');
    }

    // 家族史建议
    if (data.family_history !== FamilyHistory.NONE) {
      recommendations.push('您有糖尿病家族史,请特别注意预防,定期体检。');
    }

    return recommendations;
  }

  /**
   * 生成卒中风险建议
   *
   * @param level 风险等级
   * @param data 问卷数据
   * @returns 建议列表
   */
  private generateStrokeRecommendations(level: RiskLevel, data: StrokeQuestionnaireDto): string[] {
    const recommendations: string[] = [];

    // 免责声明（必须包含）
    recommendations.push('此建议仅供参考,请咨询专业医生。');

    // 根据风险等级生成通用建议
    if (level === RiskLevel.HIGH) {
      recommendations.push('您的卒中风险较高,建议立即就医进行专业评估。');
      recommendations.push('建议进行颈动脉超声、头颅 CT/MRI 等检查。');
    } else if (level === RiskLevel.MEDIUM) {
      recommendations.push('您的卒中风险为中等水平,建议定期体检,控制危险因素。');
      recommendations.push('建议每年至少进行一次心血管健康检查。');
    } else {
      recommendations.push('您的卒中风险较低,请继续保持健康的生活方式。');
    }

    // 针对性建议

    // 收缩压建议
    if (data.systolic_bp >= 140) {
      recommendations.push('您的血压偏高(收缩压 ≥ 140 mmHg),建议立即就医,遵医嘱服用降压药。');
      recommendations.push('建议每天监测血压,保持血压在 120/80 mmHg 以下。');
    } else if (data.systolic_bp >= 120) {
      recommendations.push('您的血压处于正常高值,建议控制盐分摄入,适当运动。');
    }

    // 吸烟建议
    if (data.smoking) {
      recommendations.push('强烈建议戒烟。吸烟是卒中的重要危险因素,戒烟可显著降低风险。');
      recommendations.push('建议寻求专业戒烟服务的帮助。');
    }

    // 糖尿病建议
    if (data.has_diabetes) {
      recommendations.push('您有糖尿病,请严格控制血糖,遵医嘱按时服药。');
      recommendations.push('建议将糖化血红蛋白(HbA1c)控制在 7% 以下。');
    }

    // 心血管疾病史建议
    if (data.cvd_history) {
      recommendations.push('您有心血管疾病史,请定期复查,遵医嘱服用抗血小板药物。');
    }

    // 房颤建议（高风险因素）
    if (data.atrial_fibrillation) {
      recommendations.push('您有心房颤动,这是卒中的重要危险因素,请务必遵医嘱服用抗凝药物。');
      recommendations.push('建议定期监测心电图和凝血功能。');
    }

    // 通用预防建议
    recommendations.push('建议保持健康饮食,减少高盐、高脂食物的摄入。');
    recommendations.push('建议每周至少进行 150 分钟中等强度的有氧运动。');
    recommendations.push('建议保持良好的睡眠习惯,避免熬夜。');

    return recommendations;
  }
}
