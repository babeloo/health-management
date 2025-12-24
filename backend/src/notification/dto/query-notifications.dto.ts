import { IsOptional, IsEnum, IsBoolean, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationType } from '../../generated/prisma/client';

export class QueryNotificationsDto {
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isRead?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;
}
