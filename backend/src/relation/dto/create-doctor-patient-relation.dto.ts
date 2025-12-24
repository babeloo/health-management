import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

/**
 * 创建医患关系 DTO
 */
export class CreateDoctorPatientRelationDto {
  @ApiProperty({
    description: '医生 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4', { message: '医生 ID 必须是有效的 UUID' })
  @IsNotEmpty({ message: '医生 ID 不能为空' })
  doctorId: string;

  @ApiProperty({
    description: '患者 ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsUUID('4', { message: '患者 ID 必须是有效的 UUID' })
  @IsNotEmpty({ message: '患者 ID 不能为空' })
  patientId: string;

  @ApiProperty({
    description: '备注信息',
    example: '高血压患者，需定期监测',
    required: false,
  })
  @IsString({ message: '备注必须是字符串' })
  @IsOptional()
  notes?: string;
}
