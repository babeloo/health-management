import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

describe.skip('AnalyticsController (e2e)', () => {
  let app: INestApplication;

  const mockAnalyticsService = {
    getDashboard: jest.fn(),
    getPatientStats: jest.fn(),
    getCheckInStats: jest.fn(),
    exportReport: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [{ provide: AnalyticsService, useValue: mockAnalyticsService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/analytics/dashboard', () => {
    it('应该返回仪表盘数据', async () => {
      const dashboardData = {
        totalPatients: 100,
        activePatients: 80,
        newPatientsWeek: 10,
        newPatientsMonth: 30,
        totalCheckIns: 500,
        todayCheckIns: 50,
        checkInCompletionRate: 50,
        highRiskPatients: 10,
        mediumRiskPatients: 30,
        lowRiskPatients: 60,
        totalDoctors: 20,
        totalHealthManagers: 10,
        topPatients: [],
      };

      mockAnalyticsService.getDashboard.mockResolvedValue(dashboardData);

      const response = await request(app.getHttpServer())
        .get('/api/v1/analytics/dashboard')
        .expect(200);

      expect(response.body).toEqual(dashboardData);
      expect(mockAnalyticsService.getDashboard).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/analytics/patient-stats', () => {
    it('应该返回患者统计数据', async () => {
      const statsData = {
        groupBy: 'risk_level',
        data: [
          { label: '高风险', count: 10, percentage: 10 },
          { label: '中风险', count: 30, percentage: 30 },
          { label: '低风险', count: 60, percentage: 60 },
        ],
      };

      mockAnalyticsService.getPatientStats.mockResolvedValue(statsData);

      const response = await request(app.getHttpServer())
        .get('/api/v1/analytics/patient-stats')
        .query({ groupBy: 'risk_level' })
        .expect(200);

      expect(response.body).toEqual(statsData);
    });
  });

  describe('GET /api/v1/analytics/check-in-stats', () => {
    it('应该返回打卡统计数据', async () => {
      const statsData = {
        dailyStats: [{ date: '2024-01-01', count: 10 }],
        typeStats: [{ type: 'BLOOD_PRESSURE', count: 50, percentage: 50 }],
        completionRateTrend: [],
        streakDistribution: [{ days: '7天', userCount: 20 }],
      };

      mockAnalyticsService.getCheckInStats.mockResolvedValue(statsData);

      const response = await request(app.getHttpServer())
        .get('/api/v1/analytics/check-in-stats')
        .expect(200);

      expect(response.body).toEqual(statsData);
    });
  });

  describe('POST /api/v1/analytics/export', () => {
    it('应该导出报表并返回 Excel 文件', async () => {
      const buffer = Buffer.from('mock excel data');
      mockAnalyticsService.exportReport.mockResolvedValue(buffer);

      const response = await request(app.getHttpServer())
        .post('/api/v1/analytics/export')
        .send({ type: 'patients' })
        .expect(200);

      expect(response.headers['content-type']).toContain('spreadsheetml.sheet');
      expect(response.headers['content-disposition']).toContain('attachment');
    });
  });
});
