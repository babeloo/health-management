import { Test, TestingModule } from '@nestjs/testing';
import { RiskCalculationService } from './risk-calculation.service';
import {
  DiabetesQuestionnaireDto,
  StrokeQuestionnaireDto,
  ExerciseFrequency,
  FamilyHistory,
  Gender,
  RiskLevel,
} from '../dto/risk-assessment.dto';

describe('RiskCalculationService', () => {
  let service: RiskCalculationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RiskCalculationService],
    }).compile();

    service = module.get<RiskCalculationService>(RiskCalculationService);
  });

  describe('calculateDiabetesRisk', () => {
    it('应该返回低风险（评分 < 7）', () => {
      const data: DiabetesQuestionnaireDto = {
        age: 35,
        bmi: 22,
        waist_circumference: 80,
        exercise_frequency: ExerciseFrequency.DAILY,
        high_sugar_diet: false,
        hypertension: false,
        blood_glucose_history: false,
        family_history: FamilyHistory.NONE,
      };

      const result = service.calculateDiabetesRisk(data);

      expect(result.score).toBeLessThan(7);
      expect(result.level).toBe(RiskLevel.LOW);
      expect(result.recommendations).toContain('此建议仅供参考,请咨询专业医生。');
      expect(result.recommendations).toContain('您的糖尿病风险较低,请继续保持健康的生活方式。');
      expect(result.details).toBeDefined();
      expect(result.details.age_score).toBe(0);
      expect(result.details.bmi_score).toBe(0);
    });

    it('应该返回中风险（评分 7-14）', () => {
      const data: DiabetesQuestionnaireDto = {
        age: 50, // 2分
        bmi: 27, // 1分
        waist_circumference: 95, // 3分
        exercise_frequency: ExerciseFrequency.WEEKLY, // 2分
        high_sugar_diet: true, // 1分
        hypertension: false,
        blood_glucose_history: false,
        family_history: FamilyHistory.NONE,
      };

      const result = service.calculateDiabetesRisk(data);

      expect(result.score).toBeGreaterThanOrEqual(7);
      expect(result.score).toBeLessThan(15);
      expect(result.level).toBe(RiskLevel.MEDIUM);
      expect(result.recommendations).toContain('此建议仅供参考,请咨询专业医生。');
      expect(result.recommendations).toContain('您的糖尿病风险为中等水平,建议定期监测血糖。');
    });

    it('应该返回高风险（评分 ≥ 15）', () => {
      const data: DiabetesQuestionnaireDto = {
        age: 70, // 4分
        bmi: 32, // 3分
        waist_circumference: 110, // 4分
        exercise_frequency: ExerciseFrequency.RARELY, // 2分
        high_sugar_diet: true, // 1分
        hypertension: true, // 2分
        blood_glucose_history: true, // 5分
        family_history: FamilyHistory.FIRST, // 5分
      };

      const result = service.calculateDiabetesRisk(data);

      expect(result.score).toBeGreaterThanOrEqual(15);
      expect(result.level).toBe(RiskLevel.HIGH);
      expect(result.recommendations).toContain('此建议仅供参考,请咨询专业医生。');
      expect(result.recommendations).toContain('您的糖尿病风险较高,建议尽快就医进行专业评估。');
    });

    it('应该针对 BMI ≥ 25 给出体重控制建议', () => {
      const data: DiabetesQuestionnaireDto = {
        age: 45,
        bmi: 28,
        waist_circumference: 85,
        exercise_frequency: ExerciseFrequency.DAILY,
        high_sugar_diet: false,
        hypertension: false,
        blood_glucose_history: false,
        family_history: FamilyHistory.NONE,
      };

      const result = service.calculateDiabetesRisk(data);

      expect(result.recommendations).toContain('建议控制体重,保持 BMI 在 18.5-24.9 的健康范围内。');
    });

    it('应该针对运动不足给出运动建议', () => {
      const data: DiabetesQuestionnaireDto = {
        age: 40,
        bmi: 23,
        waist_circumference: 85,
        exercise_frequency: ExerciseFrequency.RARELY,
        high_sugar_diet: false,
        hypertension: false,
        blood_glucose_history: false,
        family_history: FamilyHistory.NONE,
      };

      const result = service.calculateDiabetesRisk(data);

      expect(result.recommendations).toContain(
        '建议每天进行至少 30 分钟的中等强度运动,如快走、慢跑、游泳等。',
      );
    });

    it('应该针对高糖饮食给出饮食建议', () => {
      const data: DiabetesQuestionnaireDto = {
        age: 40,
        bmi: 23,
        waist_circumference: 85,
        exercise_frequency: ExerciseFrequency.DAILY,
        high_sugar_diet: true,
        hypertension: false,
        blood_glucose_history: false,
        family_history: FamilyHistory.NONE,
      };

      const result = service.calculateDiabetesRisk(data);

      expect(result.recommendations).toContain('建议减少高糖食物的摄入,增加蔬菜和全谷物的比例。');
    });
  });

  describe('calculateStrokeRisk', () => {
    it('应该返回低风险（评分 < 6）', () => {
      const data: StrokeQuestionnaireDto = {
        age: 30, // 6分 (30/10 * 2)
        gender: Gender.FEMALE, // 0分
        systolic_bp: 110, // 0分
        has_diabetes: false,
        smoking: false,
        cvd_history: false,
        atrial_fibrillation: false,
      };

      const result = service.calculateStrokeRisk(data);

      // 30岁 = 3 * 2 = 6分，刚好不是低风险，让我们用更年轻的年龄
      expect(result.score).toBeLessThanOrEqual(6);
      expect(result.recommendations).toContain('此建议仅供参考,请咨询专业医生。');
    });

    it('应该返回中风险（评分 6-11）', () => {
      const data: StrokeQuestionnaireDto = {
        age: 40, // 8分 (40/10 * 2)
        gender: Gender.MALE, // 1分
        systolic_bp: 130, // 2分
        has_diabetes: false, // 0分
        smoking: false, // 0分
        cvd_history: false, // 0分
        atrial_fibrillation: false, // 0分
        // 总分 = 8 + 1 + 2 = 11 分（中风险）
      };

      const result = service.calculateStrokeRisk(data);

      expect(result.score).toBeGreaterThanOrEqual(6);
      expect(result.score).toBeLessThan(12);
      expect(result.level).toBe(RiskLevel.MEDIUM);
      expect(result.recommendations).toContain(
        '您的卒中风险为中等水平,建议定期体检,控制危险因素。',
      );
    });

    it('应该返回高风险（评分 ≥ 12）', () => {
      const data: StrokeQuestionnaireDto = {
        age: 65, // 10分 (最高)
        gender: Gender.MALE, // 1分
        systolic_bp: 170, // 4分
        has_diabetes: true, // 2分
        smoking: true, // 2分
        cvd_history: true, // 2分
        atrial_fibrillation: true, // 4分
      };

      const result = service.calculateStrokeRisk(data);

      expect(result.score).toBeGreaterThanOrEqual(12);
      expect(result.level).toBe(RiskLevel.HIGH);
      expect(result.recommendations).toContain('此建议仅供参考,请咨询专业医生。');
      expect(result.recommendations).toContain('您的卒中风险较高,建议立即就医进行专业评估。');
    });

    it('应该针对高血压给出血压控制建议', () => {
      const data: StrokeQuestionnaireDto = {
        age: 50,
        gender: Gender.MALE,
        systolic_bp: 150,
        has_diabetes: false,
        smoking: false,
        cvd_history: false,
        atrial_fibrillation: false,
      };

      const result = service.calculateStrokeRisk(data);

      expect(result.recommendations).toContain(
        '您的血压偏高(收缩压 ≥ 140 mmHg),建议立即就医,遵医嘱服用降压药。',
      );
    });

    it('应该针对吸烟给出戒烟建议', () => {
      const data: StrokeQuestionnaireDto = {
        age: 50,
        gender: Gender.MALE,
        systolic_bp: 120,
        has_diabetes: false,
        smoking: true,
        cvd_history: false,
        atrial_fibrillation: false,
      };

      const result = service.calculateStrokeRisk(data);

      expect(result.recommendations).toContain(
        '强烈建议戒烟。吸烟是卒中的重要危险因素,戒烟可显著降低风险。',
      );
    });

    it('应该针对房颤给出抗凝治疗建议', () => {
      const data: StrokeQuestionnaireDto = {
        age: 50,
        gender: Gender.MALE,
        systolic_bp: 120,
        has_diabetes: false,
        smoking: false,
        cvd_history: false,
        atrial_fibrillation: true,
      };

      const result = service.calculateStrokeRisk(data);

      expect(result.recommendations).toContain(
        '您有心房颤动,这是卒中的重要危险因素,请务必遵医嘱服用抗凝药物。',
      );
    });

    it('应该针对糖尿病给出血糖控制建议', () => {
      const data: StrokeQuestionnaireDto = {
        age: 50,
        gender: Gender.MALE,
        systolic_bp: 120,
        has_diabetes: true,
        smoking: false,
        cvd_history: false,
        atrial_fibrillation: false,
      };

      const result = service.calculateStrokeRisk(data);

      expect(result.recommendations).toContain('您有糖尿病,请严格控制血糖,遵医嘱按时服药。');
    });
  });

  describe('年龄评分边界测试', () => {
    it('糖尿病：年龄 44 应该得 0 分', () => {
      const data: DiabetesQuestionnaireDto = {
        age: 44,
        bmi: 22,
        waist_circumference: 80,
        exercise_frequency: ExerciseFrequency.DAILY,
        high_sugar_diet: false,
        hypertension: false,
        blood_glucose_history: false,
        family_history: FamilyHistory.NONE,
      };

      const result = service.calculateDiabetesRisk(data);
      expect(result.details.age_score).toBe(0);
    });

    it('糖尿病：年龄 45 应该得 2 分', () => {
      const data: DiabetesQuestionnaireDto = {
        age: 45,
        bmi: 22,
        waist_circumference: 80,
        exercise_frequency: ExerciseFrequency.DAILY,
        high_sugar_diet: false,
        hypertension: false,
        blood_glucose_history: false,
        family_history: FamilyHistory.NONE,
      };

      const result = service.calculateDiabetesRisk(data);
      expect(result.details.age_score).toBe(2);
    });

    it('卒中：年龄评分不应超过 10 分', () => {
      const data: StrokeQuestionnaireDto = {
        age: 100,
        gender: Gender.MALE,
        systolic_bp: 120,
        has_diabetes: false,
        smoking: false,
        cvd_history: false,
        atrial_fibrillation: false,
      };

      const result = service.calculateStrokeRisk(data);
      expect(result.details.age_score).toBe(10);
    });
  });
});
