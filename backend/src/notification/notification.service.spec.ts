import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { PrismaService } from '../common/prisma/prisma.service';

// 定义 NotificationType 枚举（用于测试）
const TestNotificationType = {
  CHECK_IN_REMINDER: 'CHECK_IN_REMINDER',
  MEDICATION_REMINDER: 'MEDICATION_REMINDER',
  RISK_ALERT: 'RISK_ALERT',
  HEALTH_ABNORMAL: 'HEALTH_ABNORMAL',
  SYSTEM_NOTIFICATION: 'SYSTEM_NOTIFICATION',
  MESSAGE: 'MESSAGE',
} as const;

describe('NotificationService', () => {
  let service: NotificationService;

  const mockPrismaService = {
    notification: {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);

    // 清除所有 mock
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createNotification', () => {
    it('应该成功创建通知', async () => {
      const dto = {
        userId: 'user-1',
        type: TestNotificationType.CHECK_IN_REMINDER as any,
        title: '打卡提醒',
        content: '今天还没有完成健康打卡哦',
        data: { reminderType: 'daily_check_in' },
      };

      const mockNotification = {
        id: 'notification-1',
        ...dto,
        isRead: false,
        readAt: null,
        createdAt: new Date(),
      };

      mockPrismaService.notification.create.mockResolvedValue(mockNotification);

      const result = await service.createNotification(dto);

      expect(result).toEqual(mockNotification);
      expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
        data: {
          userId: dto.userId,
          type: dto.type,
          title: dto.title,
          content: dto.content,
          data: dto.data,
        },
      });
    });
  });

  describe('createBulkNotifications', () => {
    it('应该批量创建通知', async () => {
      const dtos = [
        {
          userId: 'user-1',
          type: TestNotificationType.CHECK_IN_REMINDER,
          title: '打卡提醒',
          content: '今天还没有完成健康打卡哦',
        },
        {
          userId: 'user-2',
          type: TestNotificationType.MEDICATION_REMINDER,
          title: '用药提醒',
          content: '该服用药物了',
        },
      ];

      mockPrismaService.notification.createMany.mockResolvedValue({
        count: 2,
      });

      const result = await service.createBulkNotifications(dtos);

      expect(result).toBe(2);
      expect(mockPrismaService.notification.createMany).toHaveBeenCalled();
    });
  });

  describe('getNotifications', () => {
    it('应该返回用户通知列表', async () => {
      const userId = 'user-1';
      const query = { page: 1, limit: 20 };

      const mockNotifications = [
        {
          id: 'notification-1',
          userId,
          type: TestNotificationType.CHECK_IN_REMINDER,
          title: '打卡提醒',
          content: '今天还没有完成健康打卡哦',
          data: {},
          isRead: false,
          readAt: null,
          createdAt: new Date(),
        },
      ];

      mockPrismaService.notification.findMany.mockResolvedValue(mockNotifications);
      mockPrismaService.notification.count.mockResolvedValue(1);

      const result = await service.getNotifications(userId, query);

      expect(result.data).toEqual(mockNotifications);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
    });

    it('应该支持按类型筛选', async () => {
      const userId = 'user-1';
      const query = {
        type: TestNotificationType.CHECK_IN_REMINDER,
        page: 1,
        limit: 20,
      };

      mockPrismaService.notification.findMany.mockResolvedValue([]);
      mockPrismaService.notification.count.mockResolvedValue(0);

      await service.getNotifications(userId, query);

      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId,
            type: TestNotificationType.CHECK_IN_REMINDER,
          }),
        }),
      );
    });

    it('应该支持按已读状态筛选', async () => {
      const userId = 'user-1';
      const query = { isRead: false, page: 1, limit: 20 };

      mockPrismaService.notification.findMany.mockResolvedValue([]);
      mockPrismaService.notification.count.mockResolvedValue(0);

      await service.getNotifications(userId, query);

      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId,
            isRead: false,
          }),
        }),
      );
    });
  });

  describe('getUnreadCount', () => {
    it('应该返回未读通知数量', async () => {
      const userId = 'user-1';
      mockPrismaService.notification.count.mockResolvedValue(5);

      const result = await service.getUnreadCount(userId);

      expect(result).toBe(5);
      expect(mockPrismaService.notification.count).toHaveBeenCalledWith({
        where: {
          userId,
          isRead: false,
        },
      });
    });
  });

  describe('markAsRead', () => {
    it('应该成功标记通知为已读', async () => {
      const id = 'notification-1';
      const userId = 'user-1';

      const mockNotification = {
        id,
        userId,
        type: TestNotificationType.CHECK_IN_REMINDER,
        title: '打卡提醒',
        content: '今天还没有完成健康打卡哦',
        data: {},
        isRead: false,
        readAt: null,
        createdAt: new Date(),
      };

      const updatedNotification = {
        ...mockNotification,
        isRead: true,
        readAt: new Date(),
      };

      mockPrismaService.notification.findFirst.mockResolvedValue(mockNotification);
      mockPrismaService.notification.update.mockResolvedValue(updatedNotification);

      const result = await service.markAsRead(id, userId);

      expect(result.isRead).toBe(true);
      expect(result.readAt).toBeDefined();
    });

    it('如果通知不存在应该抛出异常', async () => {
      const id = 'non-existent';
      const userId = 'user-1';

      mockPrismaService.notification.findFirst.mockResolvedValue(null);

      await expect(service.markAsRead(id, userId)).rejects.toThrow(NotFoundException);
    });

    it('如果通知已读应该直接返回', async () => {
      const id = 'notification-1';
      const userId = 'user-1';

      const mockNotification = {
        id,
        userId,
        type: TestNotificationType.CHECK_IN_REMINDER,
        title: '打卡提醒',
        content: '今天还没有完成健康打卡哦',
        data: {},
        isRead: true,
        readAt: new Date(),
        createdAt: new Date(),
      };

      mockPrismaService.notification.findFirst.mockResolvedValue(mockNotification);

      const result = await service.markAsRead(id, userId);

      expect(result).toEqual(mockNotification);
      expect(mockPrismaService.notification.update).not.toHaveBeenCalled();
    });
  });

  describe('markAllAsRead', () => {
    it('应该批量标记所有通知为已读', async () => {
      const userId = 'user-1';

      mockPrismaService.notification.updateMany.mockResolvedValue({
        count: 3,
      });

      const result = await service.markAllAsRead(userId);

      expect(result).toBe(3);
      expect(mockPrismaService.notification.updateMany).toHaveBeenCalledWith({
        where: {
          userId,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: expect.any(Date),
        },
      });
    });
  });

  describe('deleteNotification', () => {
    it('应该成功删除通知', async () => {
      const id = 'notification-1';
      const userId = 'user-1';

      const mockNotification = {
        id,
        userId,
        type: TestNotificationType.CHECK_IN_REMINDER,
        title: '打卡提醒',
        content: '今天还没有完成健康打卡哦',
        data: {},
        isRead: false,
        readAt: null,
        createdAt: new Date(),
      };

      mockPrismaService.notification.findFirst.mockResolvedValue(mockNotification);
      mockPrismaService.notification.delete.mockResolvedValue(mockNotification);

      await service.deleteNotification(id, userId);

      expect(mockPrismaService.notification.delete).toHaveBeenCalledWith({
        where: { id },
      });
    });

    it('如果通知不存在应该抛出异常', async () => {
      const id = 'non-existent';
      const userId = 'user-1';

      mockPrismaService.notification.findFirst.mockResolvedValue(null);

      await expect(service.deleteNotification(id, userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('clearReadNotifications', () => {
    it('应该清空已读通知', async () => {
      const userId = 'user-1';

      mockPrismaService.notification.deleteMany.mockResolvedValue({
        count: 5,
      });

      const result = await service.clearReadNotifications(userId);

      expect(result).toBe(5);
      expect(mockPrismaService.notification.deleteMany).toHaveBeenCalledWith({
        where: {
          userId,
          isRead: true,
        },
      });
    });
  });

  describe('sendCheckInReminder', () => {
    it('应该发送打卡提醒通知', async () => {
      const userId = 'user-1';

      const mockNotification = {
        id: 'notification-1',
        userId,
        type: TestNotificationType.CHECK_IN_REMINDER,
        title: '打卡提醒',
        content: '今天还没有完成健康打卡哦，记得记录您的健康数据！',
        data: { reminderType: 'daily_check_in' },
        isRead: false,
        readAt: null,
        createdAt: new Date(),
      };

      mockPrismaService.notification.create.mockResolvedValue(mockNotification);

      const result = await service.sendCheckInReminder(userId);

      expect(result.type).toBe(TestNotificationType.CHECK_IN_REMINDER);
      expect(result.title).toBe('打卡提醒');
    });
  });

  describe('sendMedicationReminder', () => {
    it('应该发送用药提醒通知', async () => {
      const userId = 'user-1';
      const medicationName = '阿司匹林';

      const mockNotification = {
        id: 'notification-1',
        userId,
        type: TestNotificationType.MEDICATION_REMINDER,
        title: '用药提醒',
        content: `该服用 ${medicationName} 了，请按时用药！`,
        data: { medicationName, reminderType: 'medication' },
        isRead: false,
        readAt: null,
        createdAt: new Date(),
      };

      mockPrismaService.notification.create.mockResolvedValue(mockNotification);

      const result = await service.sendMedicationReminder(userId, medicationName);

      expect(result.type).toBe(TestNotificationType.MEDICATION_REMINDER);
      expect(result.content).toContain(medicationName);
    });
  });

  describe('sendRiskAlert', () => {
    it('应该发送风险预警通知', async () => {
      const userId = 'user-1';
      const riskType = 'diabetes';
      const riskLevel = 'HIGH';
      const message = '您的糖尿病风险等级为高风险，请及时就医';

      const mockNotification = {
        id: 'notification-1',
        userId,
        type: TestNotificationType.RISK_ALERT,
        title: '健康风险预警',
        content: message,
        data: { riskType, riskLevel },
        isRead: false,
        readAt: null,
        createdAt: new Date(),
      };

      mockPrismaService.notification.create.mockResolvedValue(mockNotification);

      const result = await service.sendRiskAlert(userId, riskType, riskLevel, message);

      expect(result.type).toBe(TestNotificationType.RISK_ALERT);
      expect(result.data).toEqual({ riskType, riskLevel });
    });
  });

  describe('sendHealthAbnormalAlert', () => {
    it('应该发送健康指标异常通知', async () => {
      const userId = 'user-1';
      const indicator = '血压';
      const value = 160;
      const normalRange = '90-140 mmHg';

      const mockNotification = {
        id: 'notification-1',
        userId,
        type: TestNotificationType.HEALTH_ABNORMAL,
        title: '健康指标异常',
        content: `您的${indicator}为${value}，超出正常范围（${normalRange}），请注意！`,
        data: { indicator, value, normalRange },
        isRead: false,
        readAt: null,
        createdAt: new Date(),
      };

      mockPrismaService.notification.create.mockResolvedValue(mockNotification);

      const result = await service.sendHealthAbnormalAlert(userId, indicator, value, normalRange);

      expect(result.type).toBe(TestNotificationType.HEALTH_ABNORMAL);
      expect(result.content).toContain(indicator);
      expect(result.content).toContain(value.toString());
    });
  });
});
