import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 设备绑定 DTO
 */
export class BindDeviceDto {
  @ApiProperty({
    description: '用户ID',
    example: 'user-uuid-123',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;
}
