import { IsString, IsEnum, IsOptional, IsObject, IsNotEmpty } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  recipientId: string;

  @IsEnum(['text', 'image', 'voice', 'video', 'file'])
  type: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsObject()
  metadata?: {
    fileName?: string;
    fileSize?: number;
    duration?: number;
  };
}
