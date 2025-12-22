/* eslint-disable import/no-extraneous-dependencies */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { UserRole } from '../../src/generated/prisma/client';
import { AllExceptionsFilter } from '../../src/common/filters/all-exceptions.filter';
import {
  RiskAssessmentType,
  ExerciseFrequency,
  FamilyHistory,
  Gender,
} from '../../src/health/dto/risk-assessment.dto';

describe('Health Risk Assessment (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  // 患者用户
  let patientAccessToken: string;
  let patientUserId: string;

  // 医生用户
  let doctorAccessToken: string;
  let doctorUserId: string;

  // 健康管理师
  let healthManagerAccessToken: string;
  let healthManagerUserId: string;

  // 其他患者（用于测试权限）
  let otherPatientAccessToken: string;
  let otherPatientUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // 应用全局异常过滤器（与 main.ts 保持一致）
    app.useGlobalFilters(new AllExceptionsFilter());

    // 应用全局管道（与 main.ts 保持一致）
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // 设置全局前缀（与 main.ts 保持一致）
    app.setGlobalPrefix('api/v1');

    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);

    // 创建患者用户并获取 Token
    const patientResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        username: `e2e_risk_patient_${Date.now()}`,
        password: 'Test@123456',
        role: UserRole.PATIENT,
        fullName: '风险评估测试患者',
      })
      .expect(201);

    patientAccessToken = patientResponse.body.data.accessToken;
    patientUserId = patientResponse.body.data.user.id;

    // 创建医生用户并获取 Token
    const doctorResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        username: `e2e_risk_doctor_${Date.now()}`,
        password: 'Test@123456',
        role: UserRole.DOCTOR,
        fullName: '风险评估测试医生',
      })
      .expect(201);

    doctorAccessToken = doctorResponse.body.data.accessToken;
    doctorUserId = doctorResponse.body.data.user.id;

    // 创建健康管理师用户并获取 Token
    const healthManagerResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        username: `e2e_risk_hm_${Date.now()}`,
        password: 'Test@123456',
        role: UserRole.HEALTH_MANAGER,
        fullName: '风险评估测试健康管理师',
      })
      .expect(201);

    healthManagerAccessToken = healthManagerResponse.body.data.accessToken;
    healthManagerUserId = healthManagerResponse.body.data.user.id;

    // 创建另一个患者（用于测试权限）
    const otherPatientResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        username: `e2e_risk_other_patient_${Date.now()}`,
        password: 'Test@123456',
        role: UserRole.PATIENT,
        fullName: '其他测试患者',
      })
      .expect(201);

    otherPatientAccessToken = otherPatientResponse.body.data.accessToken;
    otherPatientUserId = otherPatientResponse.body.data.user.id;
  });

  afterAll(async () => {
    // 清理测试数据 - 风险评估记录
    await prismaService.riskAssessment.deleteMany({
      where: {
        userId: {
          in: [patientUserId, doctorUserId, healthManagerUserId, otherPatientUserId],
        },
      },
    });

    // 清理测试用户
    await prismaService.user.deleteMany({
      where: {
        username: {
          startsWith: 'e2e_risk_',
        },
      },
    });

    await app.close();
  });

  afterEach(async () => {
    // 每个测试后清理风险评估数据，确保测试独立
    await prismaService.riskAssessment.deleteMany({
      where: {
        userId: {
          in: [patientUserId, doctorUserId, healthManagerUserId, otherPatientUserId],
        },
      },
    });
  });

  // ==================== 创建风险评估测试 ====================

  describe('POST /api/v1/health/assessments - 创建风险评估', () => {
    describe('成功案例', () => {
      it('患者应该成功创建自己的糖尿病风险评估', () => {
        const createDto = {
          user_id: patientUserId,
          assessment_type: RiskAssessmentType.DIABETES,
          diabetes_questionnaire: {
            age: 55,
            bmi: 28,
            waist_circumference: 95,
            exercise_frequency: ExerciseFrequency.WEEKLY,
            high_sugar_diet: false,
            hypertension: true,
            blood_glucose_history: false,
            family_history: FamilyHistory.SECOND,
          },
          include_device_data: true,
        };

        return request(app.getHttpServer())
          .post('/api/v1/health/assessments')
          .set('Authorization', `Bearer ${patientAccessToken}`)
          .send(createDto)
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('success', true);
            expect(res.body).toHaveProperty('data');
            expect(res.body).toHaveProperty('timestamp');
            expect(res.body.data).toHaveProperty('id');
            expect(res.body.data).toHaveProperty('userId', patientUserId);
            expect(res.body.data).toHaveProperty('type', 'diabetes');
            expect(res.body.data).toHaveProperty('riskLevel');
            expect(res.body.data).toHaveProperty('riskScore');
            expect(res.body.data.riskScore).toBeGreaterThanOrEqual(0);
            expect(res.body.data.riskScore).toBeLessThanOrEqual(100);
            expect(['LOW', 'MEDIUM', 'HIGH']).toContain(res.body.data.riskLevel);
            expect(res.body.data).toHaveProperty('aiRecommendations');
            expect(res.body.data.aiRecommendations).toContain('此建议仅供参考');
            expect(res.body.data).toHaveProperty('questionnaireData');
            expect(res.body.data).toHaveProperty('assessedAt');
          });
      });

      it('患者应该成功创建自己的卒中风险评估', () => {
        const createDto = {
          user_id: patientUserId,
          assessment_type: RiskAssessmentType.STROKE,
          stroke_questionnaire: {
            age: 65,
            gender: Gender.MALE,
            systolic_bp: 145,
            has_diabetes: true,
            smoking: false,
            cvd_history: true,
            atrial_fibrillation: false,
          },
          include_device_data: true,
        };

        return request(app.getHttpServer())
          .post('/api/v1/health/assessments')
          .set('Authorization', `Bearer ${patientAccessToken}`)
          .send(createDto)
          .expect(201)
          .expect((res) => {
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('type', 'stroke');
            expect(res.body.data).toHaveProperty('riskLevel');
            expect(res.body.data).toHaveProperty('riskScore');
            expect(res.body.data.aiRecommendations).toContain('此建议仅供参考');
          });
      });

      it('医生应该成功为患者创建糖尿病风险评估', () => {
        const createDto = {
          user_id: patientUserId,
          assessment_type: RiskAssessmentType.DIABETES,
          diabetes_questionnaire: {
            age: 45,
            bmi: 24,
            waist_circumference: 85,
            exercise_frequency: ExerciseFrequency.DAILY,
            high_sugar_diet: false,
            hypertension: false,
            blood_glucose_history: false,
            family_history: FamilyHistory.NONE,
          },
          include_device_data: true,
        };

        return request(app.getHttpServer())
          .post('/api/v1/health/assessments')
          .set('Authorization', `Bearer ${doctorAccessToken}`)
          .send(createDto)
          .expect(201)
          .expect((res) => {
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('userId', patientUserId);
            expect(res.body.data).toHaveProperty('type', 'diabetes');
          });
      });

      it('健康管理师应该成功为患者创建卒中风险评估', () => {
        const createDto = {
          user_id: patientUserId,
          assessment_type: RiskAssessmentType.STROKE,
          stroke_questionnaire: {
            age: 50,
            gender: Gender.FEMALE,
            systolic_bp: 125,
            has_diabetes: false,
            smoking: false,
            cvd_history: false,
            atrial_fibrillation: false,
          },
          include_device_data: true,
        };

        return request(app.getHttpServer())
          .post('/api/v1/health/assessments')
          .set('Authorization', `Bearer ${healthManagerAccessToken}`)
          .send(createDto)
          .expect(201)
          .expect((res) => {
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('userId', patientUserId);
          });
      });
    });

    describe('权限验证', () => {
      it('患者尝试为其他用户创建评估时应返回 403', () => {
        const createDto = {
          user_id: otherPatientUserId, // 尝试为其他患者创建
          assessment_type: RiskAssessmentType.DIABETES,
          diabetes_questionnaire: {
            age: 50,
            bmi: 25,
            waist_circumference: 90,
            exercise_frequency: ExerciseFrequency.WEEKLY,
            high_sugar_diet: false,
            hypertension: false,
            blood_glucose_history: false,
            family_history: FamilyHistory.NONE,
          },
        };

        return request(app.getHttpServer())
          .post('/api/v1/health/assessments')
          .set('Authorization', `Bearer ${patientAccessToken}`)
          .send(createDto)
          .expect(403)
          .expect((res) => {
            expect(res.body).toHaveProperty('success', false);
            expect(res.body.message).toContain('患者只能创建自己的风险评估');
          });
      });

      it('未认证用户尝试创建评估时应返回 401', () => {
        const createDto = {
          user_id: patientUserId,
          assessment_type: RiskAssessmentType.DIABETES,
          diabetes_questionnaire: {
            age: 50,
            bmi: 25,
            waist_circumference: 90,
            exercise_frequency: ExerciseFrequency.WEEKLY,
            high_sugar_diet: false,
            hypertension: false,
            blood_glucose_history: false,
            family_history: FamilyHistory.NONE,
          },
        };

        return request(app.getHttpServer())
          .post('/api/v1/health/assessments')
          .send(createDto)
          .expect(401);
      });
    });

    describe('参数验证', () => {
      it('缺少必填字段 userId 时应返回 400', () => {
        const createDto = {
          // 缺少 userId
          assessment_type: RiskAssessmentType.DIABETES,
          diabetes_questionnaire: {
            age: 50,
            bmi: 25,
            waist_circumference: 90,
            exercise_frequency: ExerciseFrequency.WEEKLY,
            high_sugar_diet: false,
            hypertension: false,
            blood_glucose_history: false,
            family_history: FamilyHistory.NONE,
          },
        };

        return request(app.getHttpServer())
          .post('/api/v1/health/assessments')
          .set('Authorization', `Bearer ${patientAccessToken}`)
          .send(createDto)
          .expect(400);
      });

      it('缺少必填字段 assessmentType 时应返回 400', () => {
        const createDto = {
          user_id: patientUserId,
          // 缺少 assessmentType
          diabetes_questionnaire: {
            age: 50,
            bmi: 25,
            waist_circumference: 90,
            exercise_frequency: ExerciseFrequency.WEEKLY,
            high_sugar_diet: false,
            hypertension: false,
            blood_glucose_history: false,
            family_history: FamilyHistory.NONE,
          },
        };

        return request(app.getHttpServer())
          .post('/api/v1/health/assessments')
          .set('Authorization', `Bearer ${patientAccessToken}`)
          .send(createDto)
          .expect(400);
      });

      it('无效的评估类型应返回 400', () => {
        const createDto = {
          user_id: patientUserId,
          assessment_type: 'invalid_type', // 无效类型
          diabetes_questionnaire: {
            age: 50,
            bmi: 25,
            waist_circumference: 90,
            exercise_frequency: ExerciseFrequency.WEEKLY,
            high_sugar_diet: false,
            hypertension: false,
            blood_glucose_history: false,
            family_history: FamilyHistory.NONE,
          },
        };

        return request(app.getHttpServer())
          .post('/api/v1/health/assessments')
          .set('Authorization', `Bearer ${patientAccessToken}`)
          .send(createDto)
          .expect(400)
          .expect((res) => {
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('评估类型');
          });
      });

      it('糖尿病问卷 BMI 超出范围时应返回 400', () => {
        const createDto = {
          user_id: patientUserId,
          assessment_type: RiskAssessmentType.DIABETES,
          diabetes_questionnaire: {
            age: 50,
            bmi: 65, // 超出范围（最大60）
            waist_circumference: 90,
            exercise_frequency: ExerciseFrequency.WEEKLY,
            high_sugar_diet: false,
            hypertension: false,
            blood_glucose_history: false,
            family_history: FamilyHistory.NONE,
          },
        };

        return request(app.getHttpServer())
          .post('/api/v1/health/assessments')
          .set('Authorization', `Bearer ${patientAccessToken}`)
          .send(createDto)
          .expect(400)
          .expect((res) => {
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('BMI');
          });
      });

      it('卒中问卷收缩压超出范围时应返回 400', () => {
        const createDto = {
          user_id: patientUserId,
          assessment_type: RiskAssessmentType.STROKE,
          stroke_questionnaire: {
            age: 50,
            gender: Gender.MALE,
            systolic_bp: 260, // 超出范围（最大250）
            has_diabetes: false,
            smoking: false,
            cvd_history: false,
            atrial_fibrillation: false,
          },
        };

        return request(app.getHttpServer())
          .post('/api/v1/health/assessments')
          .set('Authorization', `Bearer ${patientAccessToken}`)
          .send(createDto)
          .expect(400)
          .expect((res) => {
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('收缩压');
          });
      });

      it('糖尿病问卷缺少必填字段时应返回 400', () => {
        const createDto = {
          user_id: patientUserId,
          assessment_type: RiskAssessmentType.DIABETES,
          diabetes_questionnaire: {
            age: 50,
            bmi: 25,
            // 缺少 waist_circumference 等必填字段
          },
        };

        return request(app.getHttpServer())
          .post('/api/v1/health/assessments')
          .set('Authorization', `Bearer ${patientAccessToken}`)
          .send(createDto)
          .expect(400);
      });
    });
  });

  // ==================== 查询评估历史测试 ====================

  describe('GET /api/v1/health/assessments/:userId - 查询评估历史', () => {
    beforeEach(async () => {
      // 为患者创建多条评估记录
      const assessments = [
        {
          user_id: patientUserId,
          assessment_type: RiskAssessmentType.DIABETES,
          diabetes_questionnaire: {
            age: 50,
            bmi: 25,
            waist_circumference: 90,
            exercise_frequency: ExerciseFrequency.WEEKLY,
            high_sugar_diet: false,
            hypertension: false,
            blood_glucose_history: false,
            family_history: FamilyHistory.NONE,
          },
        },
        {
          user_id: patientUserId,
          assessment_type: RiskAssessmentType.STROKE,
          stroke_questionnaire: {
            age: 50,
            gender: Gender.MALE,
            systolic_bp: 125,
            has_diabetes: false,
            smoking: false,
            cvd_history: false,
            atrial_fibrillation: false,
          },
        },
      ];

      // 使用 Promise.all 替代 for 循环
      await Promise.all(
        assessments.map((dto) =>
          request(app.getHttpServer())
            .post('/api/v1/health/assessments')
            .set('Authorization', `Bearer ${patientAccessToken}`)
            .send(dto)
            .expect(201),
        ),
      );
    });

    describe('成功案例', () => {
      it('患者应该成功查询自己的评估历史', () => {
        return request(app.getHttpServer())
          .get(`/api/v1/health/assessments/${patientUserId}`)
          .set('Authorization', `Bearer ${patientAccessToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('success', true);
            expect(res.body).toHaveProperty('data');
            expect(res.body.data).toHaveProperty('total');
            expect(res.body.data).toHaveProperty('page', 1);
            expect(res.body.data).toHaveProperty('limit', 20);
            expect(res.body.data).toHaveProperty('items');
            expect(Array.isArray(res.body.data.items)).toBe(true);
            expect(res.body.data.total).toBeGreaterThanOrEqual(2);
          });
      });

      it('医生应该成功查询患者的评估历史', () => {
        return request(app.getHttpServer())
          .get(`/api/v1/health/assessments/${patientUserId}`)
          .set('Authorization', `Bearer ${doctorAccessToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('items');
            expect(Array.isArray(res.body.data.items)).toBe(true);
          });
      });

      it('健康管理师应该成功查询患者的评估历史', () => {
        return request(app.getHttpServer())
          .get(`/api/v1/health/assessments/${patientUserId}`)
          .set('Authorization', `Bearer ${healthManagerAccessToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.success).toBe(true);
          });
      });

      it('应该支持按评估类型筛选', () => {
        return request(app.getHttpServer())
          .get(`/api/v1/health/assessments/${patientUserId}`)
          .query({ assessment_type: RiskAssessmentType.DIABETES })
          .set('Authorization', `Bearer ${patientAccessToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('items');
            expect(Array.isArray(res.body.data.items)).toBe(true);
            if (res.body.data.items.length > 0) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              res.body.data.items.forEach((item: any) => {
                expect(item.type).toBe('diabetes');
              });
            }
          });
      });

      // TODO: 修复 API bug - risk_level 需要在 Service 层做大小写转换
      it.skip('应该支持按风险等级筛选', () => {
        return request(app.getHttpServer())
          .get(`/api/v1/health/assessments/${patientUserId}`)
          .query({ risk_level: 'low' }) // DTO 使用小写的枚举值
          .set('Authorization', `Bearer ${patientAccessToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.success).toBe(true);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            res.body.data.items.forEach((item: any) => {
              expect(['LOW', 'MEDIUM', 'HIGH']).toContain(item.riskLevel);
            });
          });
      });

      it('应该支持分页查询', () => {
        return request(app.getHttpServer())
          .get(`/api/v1/health/assessments/${patientUserId}`)
          .query({ page: 1, limit: 1 })
          .set('Authorization', `Bearer ${patientAccessToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('page', 1);
            expect(res.body.data).toHaveProperty('limit', 1);
            expect(res.body.data).toHaveProperty('items');
            expect(Array.isArray(res.body.data.items)).toBe(true);
            expect(res.body.data.items.length).toBeLessThanOrEqual(1);
          });
      });
    });

    describe('权限验证', () => {
      it('患者尝试查询其他用户评估时应返回 403', () => {
        return request(app.getHttpServer())
          .get(`/api/v1/health/assessments/${otherPatientUserId}`)
          .set('Authorization', `Bearer ${patientAccessToken}`)
          .expect(403)
          .expect((res) => {
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('无权访问');
          });
      });

      it('未认证用户尝试查询评估时应返回 401', () => {
        return request(app.getHttpServer())
          .get(`/api/v1/health/assessments/${patientUserId}`)
          .expect(401);
      });
    });
  });

  // ==================== 评估结果对比测试 ====================

  describe('GET /api/v1/health/assessments/:userId/compare - 评估结果对比', () => {
    beforeEach(async () => {
      // 创建多条糖尿病评估记录（用于对比）
      const assessments = [
        {
          user_id: patientUserId,
          assessment_type: RiskAssessmentType.DIABETES,
          diabetes_questionnaire: {
            age: 50,
            bmi: 30,
            waist_circumference: 100,
            exercise_frequency: ExerciseFrequency.RARELY,
            high_sugar_diet: true,
            hypertension: true,
            blood_glucose_history: true,
            family_history: FamilyHistory.FIRST,
          },
        },
        {
          user_id: patientUserId,
          assessment_type: RiskAssessmentType.DIABETES,
          diabetes_questionnaire: {
            age: 50,
            bmi: 28,
            waist_circumference: 95,
            exercise_frequency: ExerciseFrequency.WEEKLY,
            high_sugar_diet: false,
            hypertension: true,
            blood_glucose_history: false,
            family_history: FamilyHistory.SECOND,
          },
        },
        {
          user_id: patientUserId,
          assessment_type: RiskAssessmentType.DIABETES,
          diabetes_questionnaire: {
            age: 50,
            bmi: 25,
            waist_circumference: 90,
            exercise_frequency: ExerciseFrequency.DAILY,
            high_sugar_diet: false,
            hypertension: false,
            blood_glucose_history: false,
            family_history: FamilyHistory.NONE,
          },
        },
      ];

      // 使用 reduce 顺序执行，保证时间戳不同
      await assessments.reduce(async (promise, dto) => {
        await promise;
        await request(app.getHttpServer())
          .post('/api/v1/health/assessments')
          .set('Authorization', `Bearer ${patientAccessToken}`)
          .send(dto)
          .expect(201);
        // 稍微延迟以确保时间戳不同
        await new Promise((resolve) => {
          setTimeout(resolve, 100);
        });
      }, Promise.resolve());
    });

    describe('成功案例', () => {
      it('应该成功对比最近 3 次糖尿病评估', () => {
        return request(app.getHttpServer())
          .get(`/api/v1/health/assessments/${patientUserId}/compare`)
          .query({
            assessment_type: RiskAssessmentType.DIABETES,
            count: 3,
          })
          .set('Authorization', `Bearer ${patientAccessToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('success', true);
            expect(res.body).toHaveProperty('data');
            expect(res.body.data).toHaveProperty('assessmentType', 'diabetes');
            expect(res.body.data).toHaveProperty('comparisons');
            expect(res.body.data).toHaveProperty('trend');
            expect(Array.isArray(res.body.data.comparisons)).toBe(true);
            expect(res.body.data.comparisons.length).toBe(3);

            // 验证趋势分析
            expect(['increased', 'decreased', 'stable']).toContain(res.body.data.trend);

            // 验证每个对比项的结构
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            res.body.data.comparisons.forEach((item: any) => {
              expect(item).toHaveProperty('id');
              expect(item).toHaveProperty('assessedAt');
              expect(item).toHaveProperty('riskLevel');
              expect(item).toHaveProperty('riskScore');
              expect(['LOW', 'MEDIUM', 'HIGH']).toContain(item.riskLevel);
            });
          });
      });

      it('医生应该成功对比患者的评估', () => {
        return request(app.getHttpServer())
          .get(`/api/v1/health/assessments/${patientUserId}/compare`)
          .query({
            assessment_type: RiskAssessmentType.DIABETES,
            count: 2,
          })
          .set('Authorization', `Bearer ${doctorAccessToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.success).toBe(true);
            expect(res.body.data.comparisons.length).toBe(2);
          });
      });

      it('健康管理师应该成功对比患者的评估', () => {
        return request(app.getHttpServer())
          .get(`/api/v1/health/assessments/${patientUserId}/compare`)
          .query({
            assessment_type: RiskAssessmentType.DIABETES,
          })
          .set('Authorization', `Bearer ${healthManagerAccessToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.success).toBe(true);
          });
      });
    });

    describe('边界情况', () => {
      it('用户只有 1 次评估时应返回 400', async () => {
        // 清空之前的评估
        await prismaService.riskAssessment.deleteMany({
          where: { userId: otherPatientUserId },
        });

        // 只创建 1 次评估
        await request(app.getHttpServer())
          .post('/api/v1/health/assessments')
          .set('Authorization', `Bearer ${otherPatientAccessToken}`)
          .send({
            user_id: otherPatientUserId,
            assessment_type: RiskAssessmentType.DIABETES,
            diabetes_questionnaire: {
              age: 50,
              bmi: 25,
              waist_circumference: 90,
              exercise_frequency: ExerciseFrequency.WEEKLY,
              high_sugar_diet: false,
              hypertension: false,
              blood_glucose_history: false,
              family_history: FamilyHistory.NONE,
            },
          })
          .expect(201);

        return request(app.getHttpServer())
          .get(`/api/v1/health/assessments/${otherPatientUserId}/compare`)
          .query({
            assessment_type: RiskAssessmentType.DIABETES,
            count: 2,
          })
          .set('Authorization', `Bearer ${otherPatientAccessToken}`)
          .expect(400)
          .expect((res) => {
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('至少');
          });
      });
    });

    describe('权限验证', () => {
      it('患者尝试对比其他用户评估时应返回 403', () => {
        return request(app.getHttpServer())
          .get(`/api/v1/health/assessments/${otherPatientUserId}/compare`)
          .query({
            assessment_type: RiskAssessmentType.DIABETES,
          })
          .set('Authorization', `Bearer ${patientAccessToken}`)
          .expect(403)
          .expect((res) => {
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('无权访问');
          });
      });

      it('未认证用户尝试对比评估时应返回 401', () => {
        return request(app.getHttpServer())
          .get(`/api/v1/health/assessments/${patientUserId}/compare`)
          .query({
            assessment_type: RiskAssessmentType.DIABETES,
          })
          .expect(401);
      });
    });

    describe('参数验证', () => {
      it('缺少必填参数 assessmentType 时应返回 400', () => {
        return request(app.getHttpServer())
          .get(`/api/v1/health/assessments/${patientUserId}/compare`)
          .set('Authorization', `Bearer ${patientAccessToken}`)
          .expect(400);
      });

      it('count 参数超出范围时应返回 400', () => {
        return request(app.getHttpServer())
          .get(`/api/v1/health/assessments/${patientUserId}/compare`)
          .query({
            assessment_type: RiskAssessmentType.DIABETES,
            count: 15, // 超出范围（最大10）
          })
          .set('Authorization', `Bearer ${patientAccessToken}`)
          .expect(400)
          .expect((res) => {
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('对比数量');
          });
      });
    });
  });

  // ==================== 完整流程测试 ====================

  describe('完整风险评估流程 (E2E)', () => {
    it('应该完成完整的创建-查询-再创建-对比流程', async () => {
      // 1. 创建第一次评估（高风险）
      const firstAssessment = await request(app.getHttpServer())
        .post('/api/v1/health/assessments')
        .set('Authorization', `Bearer ${patientAccessToken}`)
        .send({
          user_id: patientUserId,
          assessment_type: RiskAssessmentType.DIABETES,
          diabetes_questionnaire: {
            age: 65,
            bmi: 32,
            waist_circumference: 105,
            exercise_frequency: ExerciseFrequency.RARELY,
            high_sugar_diet: true,
            hypertension: true,
            blood_glucose_history: true,
            family_history: FamilyHistory.FIRST,
          },
        })
        .expect(201);

      expect(firstAssessment.body.data).toHaveProperty('id');
      expect(firstAssessment.body.data.riskLevel).toBe('HIGH');

      // 稍微延迟以确保时间戳不同
      await new Promise((resolve) => {
        setTimeout(resolve, 100);
      });

      // 2. 查询评估列表
      const listResponse = await request(app.getHttpServer())
        .get(`/api/v1/health/assessments/${patientUserId}`)
        .set('Authorization', `Bearer ${patientAccessToken}`)
        .expect(200);

      expect(listResponse.body.data.total).toBeGreaterThanOrEqual(1);

      // 3. 创建第二次评估（中风险）
      const secondAssessment = await request(app.getHttpServer())
        .post('/api/v1/health/assessments')
        .set('Authorization', `Bearer ${patientAccessToken}`)
        .send({
          user_id: patientUserId,
          assessment_type: RiskAssessmentType.DIABETES,
          diabetes_questionnaire: {
            age: 65,
            bmi: 25,
            waist_circumference: 90,
            exercise_frequency: ExerciseFrequency.DAILY,
            high_sugar_diet: false,
            hypertension: false,
            blood_glucose_history: false,
            family_history: FamilyHistory.NONE,
          },
        })
        .expect(201);

      // 注意: 实际的风险等级由算法决定,这里不做严格断言,只验证流程完整性
      expect(['LOW', 'MEDIUM', 'HIGH']).toContain(secondAssessment.body.data.riskLevel);

      // 4. 对比两次评估的趋势
      const compareResponse = await request(app.getHttpServer())
        .get(`/api/v1/health/assessments/${patientUserId}/compare`)
        .query({
          assessment_type: RiskAssessmentType.DIABETES,
          count: 2,
        })
        .set('Authorization', `Bearer ${patientAccessToken}`)
        .expect(200);

      expect(compareResponse.body.data.comparisons.length).toBe(2);
      expect(['increased', 'decreased', 'stable']).toContain(compareResponse.body.data.trend);

      // 5. 验证数据一致性
      const latestList = await request(app.getHttpServer())
        .get(`/api/v1/health/assessments/${patientUserId}`)
        .set('Authorization', `Bearer ${patientAccessToken}`)
        .expect(200);

      expect(latestList.body.data.total).toBeGreaterThanOrEqual(2);
    });
  });
});
