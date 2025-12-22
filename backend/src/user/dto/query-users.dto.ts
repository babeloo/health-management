import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';

/**
 * 用户列表查询 DTO
 */
export class QueryUsersDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(['PATIENT', 'DOCTOR', 'HEALTH_MANAGER', 'ADMIN'])
  role?: string;

  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE', 'BANNED'])
  status?: string;

  @IsOptional()
  @IsString()
  search?: string; // 搜索用户名或姓名
}
