import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsBoolean,
  ValidateNested,
  Min,
  Max,
  IsDateString,
  IsString,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 评估类型枚举
 */
// eslint-disable-next-line no-shadow
export enum RiskAssessmentType {
  DIABETES = 'diabetes',
  STROKE = 'stroke',
  VASCULAR_AGE = 'vascular_age',
  HEART_DISEASE = 'heart_disease',
}

/**
 * 风险等级枚举
 */
// eslint-disable-next-line no-shadow
export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

/**
 * 运动频率枚举
 */
// eslint-disable-next-line no-shadow
export enum ExerciseFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  RARELY = 'rarely',
}

/**
 * 家族史枚举
 */
// eslint-disable-next-line no-shadow
export enum FamilyHistory {
  NONE = 'none',
  SECOND = 'second',
  FIRST = 'first',
}

/**
 * 性别枚举
 */
// eslint-disable-next-line no-shadow
export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
}

/**
 * 糖尿病风险评估问卷
 */
export class DiabetesQuestionnaireDto {
  @ApiProperty({ description: '年龄（岁）', minimum: 0, maximum: 120, example: 45 })
  @IsInt({ message: '年龄必须是整数' })
  @Min(0, { message: '年龄不能小于 0' })
  @Max(120, { message: '年龄不能大于 120' })
  age: number;

  @ApiProperty({ description: 'BMI 值', minimum: 10, maximum: 60, example: 25.5 })
  @IsNumber({}, { message: 'BMI 必须是数字' })
  @Min(10, { message: 'BMI 不能小于 10' })
  @Max(60, { message: 'BMI 不能大于 60' })
  bmi: number;

  @ApiProperty({ description: '腰围（cm）', minimum: 50, maximum: 200, example: 85 })
  @IsNumber({}, { message: '腰围必须是数字' })
  @Min(50, { message: '腰围不能小于 50 cm' })
  @Max(200, { message: '腰围不能大于 200 cm' })
  waist_circumference: number;

  @ApiProperty({
    description: '运动频率',
    enum: ExerciseFrequency,
    example: ExerciseFrequency.WEEKLY,
  })
  @IsEnum(ExerciseFrequency, { message: '运动频率必须是 daily、weekly 或 rarely' })
  exercise_frequency: ExerciseFrequency;

  @ApiProperty({ description: '高糖饮食', example: true })
  @IsBoolean({ message: '高糖饮食必须是布尔值' })
  high_sugar_diet: boolean;

  @ApiProperty({ description: '高血压史', example: false })
  @IsBoolean({ message: '高血压史必须是布尔值' })
  hypertension: boolean;

  @ApiProperty({ description: '血糖异常史', example: false })
  @IsBoolean({ message: '血糖异常史必须是布尔值' })
  blood_glucose_history: boolean;

  @ApiProperty({
    description: '糖尿病家族史',
    enum: FamilyHistory,
    example: FamilyHistory.NONE,
  })
  @IsEnum(FamilyHistory, { message: '糖尿病家族史必须是 none、second 或 first' })
  family_history: FamilyHistory;
}

/**
 * 卒中风险评估问卷
 */
export class StrokeQuestionnaireDto {
  @ApiProperty({ description: '年龄（岁）', minimum: 0, maximum: 120, example: 55 })
  @IsInt({ message: '年龄必须是整数' })
  @Min(0, { message: '年龄不能小于 0' })
  @Max(120, { message: '年龄不能大于 120' })
  age: number;

  @ApiProperty({ description: '性别', enum: Gender, example: Gender.MALE })
  @IsEnum(Gender, { message: '性别必须是 male 或 female' })
  gender: Gender;

  @ApiProperty({
    description: '收缩压（mmHg）',
    minimum: 60,
    maximum: 250,
    example: 135,
  })
  @IsNumber({}, { message: '收缩压必须是数字' })
  @Min(60, { message: '收缩压不能小于 60 mmHg' })
  @Max(250, { message: '收缩压不能大于 250 mmHg' })
  systolic_bp: number;

  @ApiProperty({ description: '是否有糖尿病', example: false })
  @IsBoolean({ message: '是否有糖尿病必须是布尔值' })
  has_diabetes: boolean;

  @ApiProperty({ description: '是否吸烟', example: false })
  @IsBoolean({ message: '是否吸烟必须是布尔值' })
  smoking: boolean;

  @ApiProperty({ description: '心血管疾病史', example: false })
  @IsBoolean({ message: '心血管疾病史必须是布尔值' })
  cvd_history: boolean;

  @ApiProperty({ description: '是否有心房颤动', example: false })
  @IsBoolean({ message: '是否有心房颤动必须是布尔值' })
  atrial_fibrillation: boolean;
}

/**
 * 创建风险评估 DTO
 */
export class CreateRiskAssessmentDto {
  @ApiProperty({ description: '用户 ID (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString({ message: '用户 ID 必须是字符串' })
  @IsUUID('4', { message: '用户 ID 必须是有效的 UUID' })
  user_id: string;

  @ApiProperty({
    description: '评估类型',
    enum: RiskAssessmentType,
    example: RiskAssessmentType.DIABETES,
  })
  @IsEnum(RiskAssessmentType, {
    message: '评估类型必须是 diabetes、stroke、vascular_age 或 heart_disease',
  })
  assessment_type: RiskAssessmentType;

  @ApiPropertyOptional({
    description: '糖尿病问卷数据（当评估类型为 diabetes 时必填）',
    type: DiabetesQuestionnaireDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DiabetesQuestionnaireDto)
  diabetes_questionnaire?: DiabetesQuestionnaireDto;

  @ApiPropertyOptional({
    description: '卒中问卷数据（当评估类型为 stroke 时必填）',
    type: StrokeQuestionnaireDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => StrokeQuestionnaireDto)
  stroke_questionnaire?: StrokeQuestionnaireDto;

  @ApiPropertyOptional({
    description: '是否包含设备数据（血压、血糖）',
    default: true,
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: '是否包含设备数据必须是布尔值' })
  include_device_data?: boolean = true;
}

/**
 * 查询风险评估 DTO
 */
export class QueryRiskAssessmentsDto {
  @ApiPropertyOptional({
    description: '评估类型筛选',
    enum: RiskAssessmentType,
    example: RiskAssessmentType.DIABETES,
  })
  @IsOptional()
  @IsEnum(RiskAssessmentType, {
    message: '评估类型必须是 diabetes、stroke、vascular_age 或 heart_disease',
  })
  assessment_type?: RiskAssessmentType;

  @ApiPropertyOptional({
    description: '风险等级筛选',
    enum: RiskLevel,
    example: RiskLevel.HIGH,
  })
  @IsOptional()
  @IsEnum(RiskLevel, { message: '风险等级必须是 low、medium 或 high' })
  risk_level?: RiskLevel;

  @ApiPropertyOptional({
    description: '开始日期（ISO 8601 格式）',
    example: '2025-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString({}, { message: '开始日期必须是有效的 ISO 8601 日期字符串' })
  start_date?: string;

  @ApiPropertyOptional({
    description: '结束日期（ISO 8601 格式）',
    example: '2025-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString({}, { message: '结束日期必须是有效的 ISO 8601 日期字符串' })
  end_date?: string;

  @ApiPropertyOptional({ description: '页码', minimum: 1, default: 1, example: 1 })
  @IsOptional()
  @IsInt({ message: '页码必须是整数' })
  @Min(1, { message: '页码必须大于等于 1' })
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: '每页数量',
    minimum: 1,
    maximum: 100,
    default: 20,
    example: 20,
  })
  @IsOptional()
  @IsInt({ message: '每页数量必须是整数' })
  @Min(1, { message: '每页数量必须大于等于 1' })
  @Max(100, { message: '每页数量不能超过 100' })
  @Type(() => Number)
  limit?: number = 20;
}

/**
 * 对比风险评估 DTO
 */
export class CompareRiskAssessmentsDto {
  @ApiProperty({
    description: '评估类型',
    enum: RiskAssessmentType,
    example: RiskAssessmentType.DIABETES,
  })
  @IsEnum(RiskAssessmentType, {
    message: '评估类型必须是 diabetes、stroke、vascular_age 或 heart_disease',
  })
  assessment_type: RiskAssessmentType;

  @ApiPropertyOptional({
    description: '对比数量（最近 N 次评估）',
    minimum: 2,
    maximum: 10,
    default: 5,
    example: 5,
  })
  @IsOptional()
  @IsInt({ message: '对比数量必须是整数' })
  @Min(2, { message: '对比数量至少为 2' })
  @Max(10, { message: '对比数量不能超过 10' })
  @Type(() => Number)
  count?: number = 5;
}

/**
 * 风险评估详情响应 DTO
 */
export class RiskAssessmentDetailDto {
  @ApiProperty({ description: '评估 ID', example: 1 })
  id: number;

  @ApiProperty({ description: '用户 ID (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  user_id: string;

  @ApiProperty({
    description: '评估类型',
    enum: RiskAssessmentType,
    example: RiskAssessmentType.DIABETES,
  })
  assessment_type: RiskAssessmentType;

  @ApiProperty({ description: '风险等级', enum: RiskLevel, example: RiskLevel.MEDIUM })
  risk_level: RiskLevel;

  @ApiProperty({ description: '风险评分（0-100）', example: 65 })
  risk_score: number;

  @ApiProperty({ description: '问卷数据（JSON 格式）', example: { age: 45, bmi: 25.5 } })
  questionnaire_data: Record<string, unknown>;

  @ApiPropertyOptional({ description: '设备数据（JSON 格式）', example: { systolic_bp: 135 } })
  device_data?: Record<string, unknown>;

  @ApiProperty({ description: 'AI 生成的建议', example: '建议加强运动，控制饮食' })
  ai_suggestions: string;

  @ApiProperty({ description: '评估时间', example: '2025-01-15T10:30:00.000Z' })
  assessed_at: Date;

  @ApiProperty({ description: '创建时间', example: '2025-01-15T10:30:00.000Z' })
  created_at: Date;

  @ApiProperty({ description: '更新时间', example: '2025-01-15T10:30:00.000Z' })
  updated_at: Date;
}

/**
 * 风险评估列表响应 DTO
 */
export class RiskAssessmentListDto {
  @ApiProperty({ description: '总记录数', example: 50 })
  total: number;

  @ApiProperty({ description: '当前页码', example: 1 })
  page: number;

  @ApiProperty({ description: '每页数量', example: 20 })
  limit: number;

  @ApiProperty({ description: '评估记录列表', type: [RiskAssessmentDetailDto] })
  data: RiskAssessmentDetailDto[];
}

/**
 * 风险评估对比项 DTO
 */
export class RiskAssessmentComparisonItemDto {
  @ApiProperty({ description: '评估 ID', example: 1 })
  id: number;

  @ApiProperty({ description: '评估时间', example: '2025-01-15T10:30:00.000Z' })
  assessed_at: Date;

  @ApiProperty({ description: '风险等级', enum: RiskLevel, example: RiskLevel.MEDIUM })
  risk_level: RiskLevel;

  @ApiProperty({ description: '风险评分（0-100）', example: 65 })
  risk_score: number;
}

/**
 * 风险评估对比响应 DTO
 */
export class RiskAssessmentComparisonDto {
  @ApiProperty({
    description: '评估类型',
    enum: RiskAssessmentType,
    example: RiskAssessmentType.DIABETES,
  })
  assessment_type: RiskAssessmentType;

  @ApiProperty({
    description: '对比数据列表（按时间倒序）',
    type: [RiskAssessmentComparisonItemDto],
  })
  comparisons: RiskAssessmentComparisonItemDto[];

  @ApiProperty({ description: '趋势分析（improving/stable/worsening）', example: 'improving' })
  trend: string;

  @ApiProperty({ description: 'AI 生成的趋势分析', example: '您的糖尿病风险有所下降，请继续保持' })
  ai_trend_analysis: string;
}
