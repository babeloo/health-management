import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditAction, AuditLog } from '../generated/prisma/client';
import { QueryAuditLogsDto } from './dto';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建审计日志
   */
  async createLog(data: {
    userId?: string;
    action: AuditAction;
    resource: string;
    resourceId?: string;
    details?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuditLog> {
    return this.prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        details: data.details,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  }

  /**
   * 查询审计日志
   */
  async findLogs(query: QueryAuditLogsDto) {
    const { action, resource, userId, startDate, endDate, page = 1, limit = 20 } = query;

    const where: any = {};

    if (action) {
      where.action = action;
    }

    if (resource) {
      where.resource = resource;
    }

    if (userId) {
      where.userId = userId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              fullName: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 记录健康数据访问
   */
  async logHealthDataAccess(
    userId: string,
    action: AuditAction,
    resourceId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.createLog({
      userId,
      action,
      resource: 'health_record',
      resourceId,
      details: { type: 'health_data_access' },
      ipAddress,
      userAgent,
    });
  }

  /**
   * 记录用户管理操作
   */
  async logUserManagement(
    userId: string,
    action: AuditAction,
    targetUserId: string,
    details?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.createLog({
      userId,
      action,
      resource: 'user',
      resourceId: targetUserId,
      details: { ...details, type: 'user_management' },
      ipAddress,
      userAgent,
    });
  }

  /**
   * 记录权限变更
   */
  async logPermissionChange(
    userId: string,
    targetUserId: string,
    oldRole: string,
    newRole: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.createLog({
      userId,
      action: AuditAction.PERMISSION_CHANGE,
      resource: 'user',
      resourceId: targetUserId,
      details: {
        type: 'permission_change',
        oldRole,
        newRole,
      },
      ipAddress,
      userAgent,
    });
  }

  /**
   * 记录登录
   */
  async logLogin(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.createLog({
      userId,
      action: AuditAction.LOGIN,
      resource: 'auth',
      details: { type: 'login' },
      ipAddress,
      userAgent,
    });
  }

  /**
   * 记录登出
   */
  async logLogout(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.createLog({
      userId,
      action: AuditAction.LOGOUT,
      resource: 'auth',
      details: { type: 'logout' },
      ipAddress,
      userAgent,
    });
  }
}
