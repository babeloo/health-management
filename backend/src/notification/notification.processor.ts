import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { NotificationService } from './notification.service';

export interface CheckInReminderJob {
  userId: string;
}

export interface MedicationReminderJob {
  userId: string;
  medicationName: string;
}

@Processor('notification')
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private readonly notificationService: NotificationService) {}

  @Process('check-in-reminder')
  async handleCheckInReminder(job: Job<CheckInReminderJob>) {
    this.logger.log(`Processing check-in reminder for user ${job.data.userId}`);

    try {
      await this.notificationService.sendCheckInReminder(job.data.userId);
      this.logger.log(`Check-in reminder sent successfully to user ${job.data.userId}`);
    } catch (error) {
      this.logger.error(`Failed to send check-in reminder to user ${job.data.userId}`, error);
      throw error;
    }
  }

  @Process('medication-reminder')
  async handleMedicationReminder(job: Job<MedicationReminderJob>) {
    this.logger.log(`Processing medication reminder for user ${job.data.userId}`);

    try {
      await this.notificationService.sendMedicationReminder(
        job.data.userId,
        job.data.medicationName,
      );
      this.logger.log(`Medication reminder sent successfully to user ${job.data.userId}`);
    } catch (error) {
      this.logger.error(`Failed to send medication reminder to user ${job.data.userId}`, error);
      throw error;
    }
  }
}
