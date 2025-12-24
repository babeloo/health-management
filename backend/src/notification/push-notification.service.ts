import { Injectable, Logger } from '@nestjs/common';
import { NotificationType } from '../generated/prisma/client';

export interface PushNotificationPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  type: NotificationType;
}

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);

  /**
   * 发送推送通知
   * 注意：这是预留接口，实际集成 FCM 时需要配置 Firebase Admin SDK
   */
  async sendPushNotification(payload: PushNotificationPayload): Promise<boolean> {
    this.logger.log(`[预留接口] 发送推送通知给用户 ${payload.userId}: ${payload.title}`);

    // TODO: 集成 Firebase Cloud Messaging (FCM)
    // 1. 安装依赖: pnpm add firebase-admin
    // 2. 配置 Firebase Admin SDK
    // 3. 获取用户的设备 Token（需要在用户表中存储）
    // 4. 调用 FCM API 发送推送

    /*
    示例代码（需要实际配置后启用）:

    import * as admin from 'firebase-admin';

    const message = {
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data || {},
      token: deviceToken, // 从数据库获取用户的设备 Token
    };

    try {
      const response = await admin.messaging().send(message);
      this.logger.log(`推送通知发送成功: ${response}`);
      return true;
    } catch (error) {
      this.logger.error(`推送通知发送失败: ${error.message}`);
      return false;
    }
    */

    // 当前仅记录日志，不实际发送
    this.logger.warn('推送通知功能尚未集成 FCM，请配置 Firebase Admin SDK');
    return false;
  }

  /**
   * 批量发送推送通知
   */
  async sendBulkPushNotifications(payloads: PushNotificationPayload[]): Promise<number> {
    this.logger.log(`[预留接口] 批量发送 ${payloads.length} 条推送通知`);

    // TODO: 使用 FCM 的批量发送 API
    // admin.messaging().sendAll(messages)

    const results = await Promise.all(
      payloads.map((payload) => this.sendPushNotification(payload)),
    );

    return results.filter((success) => success).length;
  }

  /**
   * 保存用户设备 Token（用于推送）
   * 注意：需要在用户表中添加 deviceToken 字段
   */
  async saveDeviceToken(_userId: string, _deviceToken: string): Promise<void> {
    this.logger.log(`[预留接口] 保存用户设备 Token`);

    // TODO: 将 deviceToken 保存到数据库
    // await this.prisma.user.update({
    //   where: { id: userId },
    //   data: { deviceToken },
    // });
  }

  /**
   * 删除用户设备 Token（用户登出时调用）
   */
  async removeDeviceToken(_userId: string): Promise<void> {
    this.logger.log(`[预留接口] 删除用户设备 Token`);

    // TODO: 从数据库中删除 deviceToken
    // await this.prisma.user.update({
    //   where: { id: userId },
    //   data: { deviceToken: null },
    // });
  }
}
