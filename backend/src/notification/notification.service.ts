import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateNotificationDto, QueryNotificationsDto } from './dto';
import { Notification, NotificationType } from '../generated/prisma/client';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建通知
   */
  async createNotification(dto: CreateNotificationDto): Promise<Notification> {
    this.logger.log(`Creating notification for user ${dto.userId}, type: ${dto.type}`);

    return this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        content: dto.content,
        data: dto.data || {},
      },
    });
  }

  /**
   * 批量创建通知
   */
  async createBulkNotifications(dtos: CreateNotificationDto[]): Promise<number> {
    this.logger.log(`Creating ${dtos.length} notifications in bulk`);

    const result = await this.prisma.notification.createMany({
      data: dtos.map((dto) => ({
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        content: dto.content,
        data: dto.data || {},
      })),
    });

    return result.count;
  }

  /**
   * 获取用户通知列表
   */
  async getNotifications(userId: string, query: QueryNotificationsDto) {
    const { type, isRead, page = 1, limit = 20 } = query;

    const where: any = { userId };

    if (type !== undefined) {
      where.type = type;
    }

    if (isRead !== undefined) {
      where.isRead = isRead;
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 获取未读通知数量
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  /**
   * 标记通知为已读
   */
  async markAsRead(id: string, userId: string): Promise<Notification> {
    // 验证通知是否存在且属于该用户
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('通知不存在');
    }

    if (notification.isRead) {
      return notification;
    }

    return this.prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * 批量标记为已读
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return result.count;
  }

  /**
   * 删除通知
   */
  async deleteNotification(id: string, userId: string): Promise<void> {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('通知不存在');
    }

    await this.prisma.notification.delete({
      where: { id },
    });
  }

  /**
   * 清空已读通知
   */
  async clearReadNotifications(userId: string): Promise<number> {
    const result = await this.prisma.notification.deleteMany({
      where: {
        userId,
        isRead: true,
      },
    });

    return result.count;
  }

  /**
   * 发送打卡提醒通知
   */
  async sendCheckInReminder(userId: string): Promise<Notification> {
    return this.createNotification({
      userId,
      type: NotificationType.CHECK_IN_REMINDER,
      title: '打卡提醒',
      content: '今天还没有完成健康打卡哦，记得记录您的健康数据！',
      data: {
        reminderType: 'daily_check_in',
      },
    });
  }

  /**
   * 发送用药提醒通知
   */
  async sendMedicationReminder(userId: string, medicationName: string): Promise<Notification> {
    return this.createNotification({
      userId,
      type: NotificationType.MEDICATION_REMINDER,
      title: '用药提醒',
      content: `该服用 ${medicationName} 了，请按时用药！`,
      data: {
        medicationName,
        reminderType: 'medication',
      },
    });
  }

  /**
   * 发送风险预警通知
   */
  async sendRiskAlert(
    userId: string,
    riskType: string,
    riskLevel: string,
    message: string,
  ): Promise<Notification> {
    return this.createNotification({
      userId,
      type: NotificationType.RISK_ALERT,
      title: '健康风险预警',
      content: message,
      data: {
        riskType,
        riskLevel,
      },
    });
  }

  /**
   * 发送健康指标异常通知
   */
  async sendHealthAbnormalAlert(
    userId: string,
    indicator: string,
    value: number,
    normalRange: string,
  ): Promise<Notification> {
    return this.createNotification({
      userId,
      type: NotificationType.HEALTH_ABNORMAL,
      title: '健康指标异常',
      content: `您的${indicator}为${value}，超出正常范围（${normalRange}），请注意！`,
      data: {
        indicator,
        value,
        normalRange,
      },
    });
  }
}
