/* eslint-disable import/no-extraneous-dependencies */
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { UserRole, RiskLevel } from '../generated/prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateRiskAssessmentDto,
  QueryRiskAssessmentsDto,
  CompareRiskAssessmentsDto,
  RiskAssessmentType,
} from './dto/risk-assessment.dto';

describe('HealthController - 风险评估 API', () => {
  let controller: HealthController;

  const mockHealthService = {
    createRiskAssessment: jest.fn(),
    getRiskAssessments: jest.fn(),
    compareRiskAssessments: jest.fn(),
  };

  const mockPatientUser = {
    id: 'patient-1',
    userId: 'patient-1',
    role: UserRole.PATIENT,
  };

  const mockDoctorUser = {
    id: 'doctor-1',
    userId: 'doctor-1',
    role: UserRole.DOCTOR,
  };

  const mockRiskAssessment = {
    id: 1,
    userId: 'patient-1',
    type: RiskAssessmentType.DIABETES,
    questionnaireData: { age: 45, bmi: 25.5 },
    deviceData: null,
    riskLevel: RiskLevel.MEDIUM,
    riskScore: 65,
    resultDetails: {},
    aiRecommendations: '建议加强运动',
    assessedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: mockHealthService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<HealthController>(HealthController);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /assessments - 创建风险评估', () => {
    const createDto: CreateRiskAssessmentDto = {
      user_id: 'user-1', // UUID 字符串
      assessment_type: RiskAssessmentType.DIABETES,
      diabetes_questionnaire: {
        age: 45,
        bmi: 25.5,
        waist_circumference: 85,
        exercise_frequency: 'weekly' as any,
        high_sugar_diet: false,
        hypertension: false,
        blood_glucose_history: false,
        family_history: 'none' as any,
      },
      include_device_data: true,
    };

    it('患者应该能够创建自己的风险评估', async () => {
      mockHealthService.createRiskAssessment.mockResolvedValue(mockRiskAssessment);

      // 使用匹配的用户 ID
      const patientUser = {
        id: 'user-1', // 匹配 user_id
        userId: 'user-1',
        role: UserRole.PATIENT,
      };

      const result = await controller.createRiskAssessment({ user: patientUser } as any, createDto);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRiskAssessment);
      expect(mockHealthService.createRiskAssessment).toHaveBeenCalledWith(createDto);
    });

    it('患者不能为其他用户创建风险评估', async () => {
      const otherUserDto = { ...createDto, user_id: 'other-user-999' };

      await expect(
        controller.createRiskAssessment({ user: mockPatientUser } as any, otherUserDto),
      ).rejects.toThrow(ForbiddenException);

      expect(mockHealthService.createRiskAssessment).not.toHaveBeenCalled();
    });

    it('医生应该能够为患者创建风险评估', async () => {
      mockHealthService.createRiskAssessment.mockResolvedValue(mockRiskAssessment);

      const result = await controller.createRiskAssessment(
        { user: mockDoctorUser } as any,
        createDto,
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRiskAssessment);
      expect(mockHealthService.createRiskAssessment).toHaveBeenCalledWith(createDto);
    });
  });

  describe('GET /assessments/:userId - 查询风险评估历史', () => {
    const query: QueryRiskAssessmentsDto = {
      assessment_type: RiskAssessmentType.DIABETES,
      page: 1,
      limit: 20,
    };

    const mockListResponse = {
      items: [mockRiskAssessment],
      total: 1,
      page: 1,
      limit: 20,
    };

    it('患者应该能够查询自己的风险评估历史', async () => {
      mockHealthService.getRiskAssessments.mockResolvedValue(mockListResponse);

      const result = await controller.getRiskAssessments('patient-1', query, {
        user: mockPatientUser,
      } as any);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockListResponse);
      expect(mockHealthService.getRiskAssessments).toHaveBeenCalledWith('patient-1', query);
    });

    it('患者不能查询其他用户的风险评估历史', async () => {
      await expect(
        controller.getRiskAssessments('other-user', query, { user: mockPatientUser } as any),
      ).rejects.toThrow(ForbiddenException);

      expect(mockHealthService.getRiskAssessments).not.toHaveBeenCalled();
    });

    it('医生应该能够查询患者的风险评估历史', async () => {
      mockHealthService.getRiskAssessments.mockResolvedValue(mockListResponse);

      const result = await controller.getRiskAssessments('patient-1', query, {
        user: mockDoctorUser,
      } as any);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockListResponse);
      expect(mockHealthService.getRiskAssessments).toHaveBeenCalledWith('patient-1', query);
    });
  });

  describe('GET /assessments/:userId/compare - 评估结果对比', () => {
    const compareDto: CompareRiskAssessmentsDto = {
      assessment_type: RiskAssessmentType.DIABETES,
      count: 5,
    };

    const mockCompareResponse = {
      assessmentType: RiskAssessmentType.DIABETES,
      comparisons: [
        {
          id: '1',
          assessedAt: new Date(),
          riskLevel: RiskLevel.MEDIUM,
          riskScore: 65,
        },
        {
          id: '2',
          assessedAt: new Date(),
          riskLevel: RiskLevel.LOW,
          riskScore: 45,
        },
      ],
      trend: 'decreased' as const,
      avgScore: 55,
      maxScore: 65,
      minScore: 45,
    };

    it('患者应该能够对比自己的风险评估', async () => {
      mockHealthService.compareRiskAssessments.mockResolvedValue(mockCompareResponse);

      const result = await controller.compareRiskAssessments('patient-1', compareDto, {
        user: mockPatientUser,
      } as any);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCompareResponse);
      expect(mockHealthService.compareRiskAssessments).toHaveBeenCalledWith(
        'patient-1',
        compareDto,
      );
    });

    it('患者不能对比其他用户的风险评估', async () => {
      await expect(
        controller.compareRiskAssessments('other-user', compareDto, {
          user: mockPatientUser,
        } as any),
      ).rejects.toThrow(ForbiddenException);

      expect(mockHealthService.compareRiskAssessments).not.toHaveBeenCalled();
    });

    it('医生应该能够对比患者的风险评估', async () => {
      mockHealthService.compareRiskAssessments.mockResolvedValue(mockCompareResponse);

      const result = await controller.compareRiskAssessments('patient-1', compareDto, {
        user: mockDoctorUser,
      } as any);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCompareResponse);
      expect(mockHealthService.compareRiskAssessments).toHaveBeenCalledWith(
        'patient-1',
        compareDto,
      );
    });
  });
});
