/* eslint-disable import/no-extraneous-dependencies */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { CheckInType } from '../../src/generated/prisma/client';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { Role } from '../../src/auth/enums/role.enum';
import { AllExceptionsFilter } from '../../src/common/filters/all-exceptions.filter';

describe('Health Check-In (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let accessToken: string;
  let userId: string;

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

    // 创建测试用户并获取 Token
    const registerDto = {
      username: `e2e_checkin_test_${Date.now()}`,
      password: 'Test@123456',
      role: Role.PATIENT,
      fullName: '打卡测试用户',
    };

    const registerResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(registerDto)
      .expect(201);

    accessToken = registerResponse.body.data.accessToken;
    userId = registerResponse.body.data.user.id;
  });

  afterAll(async () => {
    // 清理测试数据
    await prismaService.checkIn.deleteMany({
      where: { userId },
    });

    await prismaService.healthRecord.deleteMany({
      where: { userId },
    });

    await prismaService.user.deleteMany({
      where: {
        username: {
          startsWith: 'e2e_checkin_test_',
        },
      },
    });

    await app.close();
  });

  describe('POST /api/v1/health/check-ins - 创建打卡记录', () => {
    it('应该成功创建血压打卡记录', () => {
      const createDto = {
        type: CheckInType.BLOOD_PRESSURE,
        data: {
          systolic: 120,
          diastolic: 80,
          pulse: 72,
        },
        notes: '今日状态良好',
      };

      return request(app.getHttpServer())
        .post('/api/v1/health/check-ins')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true);
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data).toHaveProperty('userId', userId);
          expect(res.body.data).toHaveProperty('type', CheckInType.BLOOD_PRESSURE);
          expect(res.body.data).toHaveProperty('pointsEarned', 10);
          expect(res.body.data.data).toMatchObject(createDto.data);
        });
    });

    it('应该成功创建血糖打卡记录', () => {
      const createDto = {
        type: CheckInType.BLOOD_SUGAR,
        data: {
          value: 5.6,
          timing: 'fasting',
        },
      };

      return request(app.getHttpServer())
        .post('/api/v1/health/check-ins')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('type', CheckInType.BLOOD_SUGAR);
          expect(res.body.data).toHaveProperty('pointsEarned', 10);
        });
    });

    it('应该成功创建用药打卡记录', () => {
      const createDto = {
        type: CheckInType.MEDICATION,
        data: {
          medication: '阿司匹林',
          dosage: '100mg',
          taken: true,
        },
      };

      return request(app.getHttpServer())
        .post('/api/v1/health/check-ins')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('type', CheckInType.MEDICATION);
          expect(res.body.data).toHaveProperty('pointsEarned', 5);
        });
    });

    it('应该拒绝重复打卡（每天每种类型只能打卡一次）', async () => {
      const createDto = {
        type: CheckInType.EXERCISE,
        data: {
          exerciseType: '慢跑',
          duration: 30,
          intensity: 'moderate',
        },
      };

      // 第一次打卡应该成功
      await request(app.getHttpServer())
        .post('/api/v1/health/check-ins')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createDto)
        .expect(201);

      // 第二次打卡应该失败
      return request(app.getHttpServer())
        .post('/api/v1/health/check-ins')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createDto)
        .expect(409)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', false);
          expect(res.body.message).toContain('今日已完成该类型打卡');
        });
    });

    it('应该拒绝血压数据超出范围', () => {
      const createDto = {
        type: CheckInType.BLOOD_PRESSURE,
        data: {
          systolic: 250, // 超出范围
          diastolic: 80,
        },
      };

      return request(app.getHttpServer())
        .post('/api/v1/health/check-ins')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createDto)
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', false);
          expect(res.body.message).toContain('收缩压');
        });
    });

    it('应该拒绝血糖数据缺少必填字段', () => {
      const createDto = {
        type: CheckInType.BLOOD_SUGAR,
        data: {
          value: 5.6,
          // 缺少 timing 字段
        },
      };

      return request(app.getHttpServer())
        .post('/api/v1/health/check-ins')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createDto)
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', false);
          expect(res.body.message).toContain('timing');
        });
    });

    it('应该在未授权时返回 401 错误', () => {
      const createDto = {
        type: CheckInType.DIET,
        data: {
          meal: 'lunch',
          items: ['米饭', '炒青菜'],
        },
      };

      return request(app.getHttpServer())
        .post('/api/v1/health/check-ins')
        .send(createDto)
        .expect(401);
    });
  });

  describe('GET /api/v1/health/check-ins/:userId - 查询打卡记录', () => {
    it('应该成功查询打卡记录列表', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/health/check-ins/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true);
          expect(res.body.data).toHaveProperty('items');
          expect(res.body.data).toHaveProperty('total');
          expect(res.body.data).toHaveProperty('page', 1);
          expect(res.body.data).toHaveProperty('limit', 20);
          expect(Array.isArray(res.body.data.items)).toBe(true);
        });
    });

    it('应该支持按类型筛选打卡记录', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/health/check-ins/${userId}`)
        .query({ type: CheckInType.BLOOD_PRESSURE })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            res.body.data.items.every((item: any) => item.type === CheckInType.BLOOD_PRESSURE),
          ).toBe(true);
        });
    });

    it('应该支持分页查询', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/health/check-ins/${userId}`)
        .query({ page: 1, limit: 10 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('page', 1);
          expect(res.body.data).toHaveProperty('limit', 10);
        });
    });

    it('应该在未授权时返回 401 错误', () => {
      return request(app.getHttpServer()).get(`/api/v1/health/check-ins/${userId}`).expect(401);
    });
  });

  describe('GET /api/v1/health/check-ins/:userId/trends - 趋势分析', () => {
    it('应该成功获取血压趋势分析', () => {
      const today = new Date();
      const endDate = today.toISOString().split('T')[0];
      const startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      return request(app.getHttpServer())
        .get(`/api/v1/health/check-ins/${userId}/trends`)
        .query({
          type: CheckInType.BLOOD_PRESSURE,
          startDate,
          endDate,
        })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true);
          expect(res.body.data).toHaveProperty('type', CheckInType.BLOOD_PRESSURE);
          expect(res.body.data).toHaveProperty('startDate', startDate);
          expect(res.body.data).toHaveProperty('endDate', endDate);
          expect(res.body.data).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('statistics');
          expect(Array.isArray(res.body.data.data)).toBe(true);
        });
    });

    it('应该在缺少必填参数时返回 400 错误', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/health/check-ins/${userId}/trends`)
        .query({
          type: CheckInType.BLOOD_PRESSURE,
          // 缺少 startDate 和 endDate
        })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('应该在未授权时返回 401 错误', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/health/check-ins/${userId}/trends`)
        .query({
          type: CheckInType.BLOOD_PRESSURE,
          startDate: '2025-12-01',
          endDate: '2025-12-31',
        })
        .expect(401);
    });
  });

  describe('GET /api/v1/health/check-ins/:userId/calendar - 日历视图', () => {
    it('应该成功获取日历视图数据', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/health/check-ins/${userId}/calendar`)
        .query({ year: 2025, month: 12 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true);
          expect(res.body.data).toHaveProperty('year', 2025);
          expect(res.body.data).toHaveProperty('month', 12);
          expect(res.body.data).toHaveProperty('calendar');
          expect(res.body.data).toHaveProperty('monthlyStats');
          expect(Array.isArray(res.body.data.calendar)).toBe(true);
          expect(res.body.data.monthlyStats).toHaveProperty('totalCheckIns');
          expect(res.body.data.monthlyStats).toHaveProperty('totalPoints');
          expect(res.body.data.monthlyStats).toHaveProperty('completionRate');
          expect(res.body.data.monthlyStats).toHaveProperty('continuousStreak');
        });
    });

    it('应该在缺少必填参数时返回 400 错误', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/health/check-ins/${userId}/calendar`)
        .query({ year: 2025 }) // 缺少 month
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('应该在月份超出范围时返回 400 错误', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/health/check-ins/${userId}/calendar`)
        .query({ year: 2025, month: 13 }) // 月份超出范围
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('应该在未授权时返回 401 错误', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/health/check-ins/${userId}/calendar`)
        .query({ year: 2025, month: 12 })
        .expect(401);
    });
  });
});
