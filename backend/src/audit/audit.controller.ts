import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { AuditService } from './audit.service';
import { QueryAuditLogsDto } from './dto';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Permissions(Permission.MANAGE_USERS)
  async findLogs(@Query() query: QueryAuditLogsDto) {
    const logs = await this.auditService.findLogs(query);

    return {
      success: true,
      data: logs.data,
      pagination: logs.pagination,
    };
  }
}
