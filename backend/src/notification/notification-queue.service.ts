import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { CheckInReminderJob, MedicationReminderJob } from './notification.processor';

@Injectable()
export class NotificationQueueService {
  private readonly logger = new Logger(NotificationQueueService.name);

  constructor(@InjectQueue('notification') private readonly notificationQueue: Queue) {}

  /**
   * 添加打卡提醒任务（定时任务）
   * @param userId 用户ID
   * @param reminderTime 提醒时间（格式：HH:mm，如 "09:00"）
   */
  async scheduleCheckInReminder(userId: string, reminderTime: string): Promise<void> {
    const [hour, minute] = reminderTime.split(':').map(Number);

    // 计算下次提醒时间
    const now = new Date();
    const nextReminder = new Date();
    nextReminder.setHours(hour, minute, 0, 0);

    // 如果今天的提醒时间已过，则设置为明天
    if (nextReminder <= now) {
      nextReminder.setDate(nextReminder.getDate() + 1);
    }

    const delay = nextReminder.getTime() - now.getTime();

    await this.notificationQueue.add('check-in-reminder', { userId } as CheckInReminderJob, {
      delay,
      repeat: {
        every: 24 * 60 * 60 * 1000, // 每24小时重复一次
      },
      jobId: `check-in-reminder-${userId}`,
    });

    this.logger.log(`Scheduled check-in reminder for user ${userId} at ${reminderTime}`);
  }

  /**
   * 添加用药提醒任务（定时任务）
   * @param userId 用户ID
   * @param medicationName 药品名称
   * @param reminderTimes 提醒时间数组（格式：HH:mm）
   */
  async scheduleMedicationReminder(
    userId: string,
    medicationName: string,
    reminderTimes: string[],
  ): Promise<void> {
    const now = new Date();

    await Promise.all(
      reminderTimes.map(async (reminderTime) => {
        const [hour, minute] = reminderTime.split(':').map(Number);

        // 计算下次提醒时间
        const nextReminder = new Date();
        nextReminder.setHours(hour, minute, 0, 0);

        // 如果今天的提醒时间已过，则设置为明天
        if (nextReminder <= now) {
          nextReminder.setDate(nextReminder.getDate() + 1);
        }

        const delay = nextReminder.getTime() - now.getTime();

        await this.notificationQueue.add(
          'medication-reminder',
          { userId, medicationName } as MedicationReminderJob,
          {
            delay,
            repeat: {
              every: 24 * 60 * 60 * 1000, // 每24小时重复一次
            },
            jobId: `medication-reminder-${userId}-${reminderTime}`,
          },
        );

        this.logger.log(`Scheduled medication reminder for user ${userId} at ${reminderTime}`);
      }),
    );
  }

  /**
   * 取消打卡提醒
   */
  async cancelCheckInReminder(userId: string): Promise<void> {
    const jobId = `check-in-reminder-${userId}`;
    const job = await this.notificationQueue.getJob(jobId);

    if (job) {
      await job.remove();
      this.logger.log(`Cancelled check-in reminder for user ${userId}`);
    }
  }

  /**
   * 取消用药提醒
   */
  async cancelMedicationReminder(userId: string, reminderTime: string): Promise<void> {
    const jobId = `medication-reminder-${userId}-${reminderTime}`;
    const job = await this.notificationQueue.getJob(jobId);

    if (job) {
      await job.remove();
      this.logger.log(`Cancelled medication reminder for user ${userId} at ${reminderTime}`);
    }
  }

  /**
   * 立即发送打卡提醒（用于测试或手动触发）
   */
  async sendCheckInReminderNow(userId: string): Promise<void> {
    await this.notificationQueue.add('check-in-reminder', { userId } as CheckInReminderJob, {
      priority: 1, // 高优先级
    });

    this.logger.log(`Queued immediate check-in reminder for user ${userId}`);
  }

  /**
   * 立即发送用药提醒（用于测试或手动触发）
   */
  async sendMedicationReminderNow(userId: string, medicationName: string): Promise<void> {
    await this.notificationQueue.add(
      'medication-reminder',
      { userId, medicationName } as MedicationReminderJob,
      {
        priority: 1, // 高优先级
      },
    );

    this.logger.log(`Queued immediate medication reminder for user ${userId}`);
  }
}
