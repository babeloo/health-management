import { PartialType } from '@nestjs/swagger';
import { CreateHealthRecordDto } from './create-health-record.dto';

/**
 * 更新健康档案 DTO
 * 所有字段均可选，继承自 CreateHealthRecordDto
 */
export class UpdateHealthRecordDto extends PartialType(CreateHealthRecordDto) {}
