import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { NotificationType } from '../../src/generated/prisma/client';

describe('Notification E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // 创建测试用户并获取 Token
    const registerResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        username: `test_notification_${Date.now()}`,
        password: 'Test123456',
        email: `test_notification_${Date.now()}@example.com`,
        role: 'PATIENT',
      });

    authToken = registerResponse.body.data.accessToken;
    userId = registerResponse.body.data.user.id;
  });

  afterAll(async () => {
    // 清理测试数据
    await prisma.notification.deleteMany({
      where: { userId },
    });
    await prisma.user.deleteMany({
      where: { id: userId },
    });

    await app.close();
  });

  describe('POST /api/v1/notifications', () => {
    it('应该成功创建通知', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId,
          type: NotificationType.CHECK_IN_REMINDER,
          title: '打卡提醒',
          content: '今天还没有完成健康打卡哦',
          data: { reminderType: 'daily_check_in' },
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.type).toBe(NotificationType.CHECK_IN_REMINDER);
      expect(response.body.data.title).toBe('打卡提醒');
    });

    it('应该验证必填字段', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId,
          // 缺少 type, title, content
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/notifications/:userId', () => {
    beforeEach(async () => {
      // 创建测试通知
      await prisma.notification.createMany({
        data: [
          {
            userId,
            type: NotificationType.CHECK_IN_REMINDER,
            title: '打卡提醒1',
            content: '内容1',
            data: {},
          },
          {
            userId,
            type: NotificationType.MEDICATION_REMINDER,
            title: '用药提醒1',
            content: '内容2',
            data: {},
          },
          {
            userId,
            type: NotificationType.CHECK_IN_REMINDER,
            title: '打卡提醒2',
            content: '内容3',
            data: {},
            isRead: true,
            readAt: new Date(),
          },
        ],
      });
    });

    afterEach(async () => {
      await prisma.notification.deleteMany({
        where: { userId },
      });
    });

    it('应该返回用户通知列表', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/notifications/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.pagination).toBeDefined();
    });

    it('应该支持按类型筛选', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/notifications/${userId}`)
        .query({ type: NotificationType.CHECK_IN_REMINDER })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(
        response.body.data.every((n: any) => n.type === NotificationType.CHECK_IN_REMINDER),
      ).toBe(true);
    });

    it('应该支持按已读状态筛选', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/notifications/${userId}`)
        .query({ isRead: false })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every((n: any) => n.isRead === false)).toBe(true);
    });

    it('应该支持分页', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/notifications/${userId}`)
        .query({ page: 1, limit: 2 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(2);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(2);
    });
  });

  describe('GET /api/v1/notifications/:userId/unread-count', () => {
    beforeEach(async () => {
      await prisma.notification.createMany({
        data: [
          {
            userId,
            type: NotificationType.CHECK_IN_REMINDER,
            title: '未读通知1',
            content: '内容1',
            data: {},
            isRead: false,
          },
          {
            userId,
            type: NotificationType.CHECK_IN_REMINDER,
            title: '未读通知2',
            content: '内容2',
            data: {},
            isRead: false,
          },
          {
            userId,
            type: NotificationType.CHECK_IN_REMINDER,
            title: '已读通知',
            content: '内容3',
            data: {},
            isRead: true,
            readAt: new Date(),
          },
        ],
      });
    });

    afterEach(async () => {
      await prisma.notification.deleteMany({
        where: { userId },
      });
    });

    it('应该返回未读通知数量', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/notifications/${userId}/unread-count`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.count).toBe(2);
    });
  });

  describe('PUT /api/v1/notifications/:id/read', () => {
    let notificationId: string;

    beforeEach(async () => {
      const notification = await prisma.notification.create({
        data: {
          userId,
          type: NotificationType.CHECK_IN_REMINDER,
          title: '测试通知',
          content: '测试内容',
          data: {},
          isRead: false,
        },
      });
      notificationId = notification.id;
    });

    afterEach(async () => {
      await prisma.notification.deleteMany({
        where: { userId },
      });
    });

    it('应该成功标记通知为已读', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isRead).toBe(true);
      expect(response.body.data.readAt).toBeDefined();
    });

    it('如果通知不存在应该返回404', async () => {
      await request(app.getHttpServer())
        .put('/api/v1/notifications/non-existent-id/read')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('PUT /api/v1/notifications/:userId/read-all', () => {
    beforeEach(async () => {
      await prisma.notification.createMany({
        data: [
          {
            userId,
            type: NotificationType.CHECK_IN_REMINDER,
            title: '未读通知1',
            content: '内容1',
            data: {},
            isRead: false,
          },
          {
            userId,
            type: NotificationType.CHECK_IN_REMINDER,
            title: '未读通知2',
            content: '内容2',
            data: {},
            isRead: false,
          },
        ],
      });
    });

    afterEach(async () => {
      await prisma.notification.deleteMany({
        where: { userId },
      });
    });

    it('应该批量标记所有通知为已读', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/notifications/${userId}/read-all`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.count).toBe(2);

      // 验证所有通知都已标记为已读
      const unreadCount = await prisma.notification.count({
        where: { userId, isRead: false },
      });
      expect(unreadCount).toBe(0);
    });
  });

  describe('DELETE /api/v1/notifications/:id', () => {
    let notificationId: string;

    beforeEach(async () => {
      const notification = await prisma.notification.create({
        data: {
          userId,
          type: NotificationType.CHECK_IN_REMINDER,
          title: '测试通知',
          content: '测试内容',
          data: {},
        },
      });
      notificationId = notification.id;
    });

    it('应该成功删除通知', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/notifications/${notificationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // 验证通知已删除
      const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
      });
      expect(notification).toBeNull();
    });

    it('如果通知不存在应该返回404', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/notifications/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('DELETE /api/v1/notifications/:userId/clear-read', () => {
    beforeEach(async () => {
      await prisma.notification.createMany({
        data: [
          {
            userId,
            type: NotificationType.CHECK_IN_REMINDER,
            title: '已读通知1',
            content: '内容1',
            data: {},
            isRead: true,
            readAt: new Date(),
          },
          {
            userId,
            type: NotificationType.CHECK_IN_REMINDER,
            title: '已读通知2',
            content: '内容2',
            data: {},
            isRead: true,
            readAt: new Date(),
          },
          {
            userId,
            type: NotificationType.CHECK_IN_REMINDER,
            title: '未读通知',
            content: '内容3',
            data: {},
            isRead: false,
          },
        ],
      });
    });

    afterEach(async () => {
      await prisma.notification.deleteMany({
        where: { userId },
      });
    });

    it('应该清空已读通知', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/notifications/${userId}/clear-read`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.count).toBe(2);

      // 验证只剩下未读通知
      const remainingNotifications = await prisma.notification.findMany({
        where: { userId },
      });
      expect(remainingNotifications.length).toBe(1);
      expect(remainingNotifications[0].isRead).toBe(false);
    });
  });
});
