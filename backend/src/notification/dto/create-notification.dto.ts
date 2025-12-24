import { IsString, IsEnum, IsOptional, IsObject } from 'class-validator';
import { NotificationType } from '../../generated/prisma/client';

export class CreateNotificationDto {
  @IsString()
  userId: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}
