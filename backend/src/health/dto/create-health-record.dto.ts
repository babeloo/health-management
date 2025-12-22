import { IsNumber, IsOptional, IsString, IsArray, Min, Max, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 创建健康档案 DTO
 */
export class CreateHealthRecordDto {
  @ApiPropertyOptional({
    description: '身高（厘米）',
    minimum: 50,
    maximum: 250,
    example: 175.5,
  })
  @IsNumber()
  @IsOptional()
  @Min(50, { message: '身高必须在 50-250 cm 之间' })
  @Max(250, { message: '身高必须在 50-250 cm 之间' })
  height?: number;

  @ApiPropertyOptional({
    description: '体重（千克）',
    minimum: 20,
    maximum: 300,
    example: 70.2,
  })
  @IsNumber()
  @IsOptional()
  @Min(20, { message: '体重必须在 20-300 kg 之间' })
  @Max(300, { message: '体重必须在 20-300 kg 之间' })
  weight?: number;

  @ApiPropertyOptional({
    description: '血型',
    enum: ['A', 'B', 'AB', 'O', 'Unknown'],
    example: 'A',
  })
  @IsString()
  @IsOptional()
  @IsIn(['A', 'B', 'AB', 'O', 'Unknown'], {
    message: '血型必须是 A、B、AB、O 或 Unknown',
  })
  bloodType?: string;

  @ApiPropertyOptional({
    description: '慢性疾病列表',
    type: [String],
    example: ['高血压', '糖尿病'],
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true, message: '慢性疾病列表中的每项必须是字符串' })
  chronicDiseases?: string[];

  @ApiPropertyOptional({
    description: '过敏史',
    type: [String],
    example: ['青霉素', '花粉'],
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true, message: '过敏史列表中的每项必须是字符串' })
  allergies?: string[];

  @ApiPropertyOptional({
    description: '家族病史',
    type: [String],
    example: ['家族有高血压史', '父亲患糖尿病'],
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true, message: '家族病史列表中的每项必须是字符串' })
  familyHistory?: string[];
}
