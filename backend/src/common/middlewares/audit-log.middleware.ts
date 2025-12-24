import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../generated/prisma/client';

@Injectable()
export class AuditLogMiddleware implements NestMiddleware {
  constructor(private readonly auditService: AuditService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const { user } = req as Request & { user?: { userId: string } };
    const { method } = req;
    const { path } = req;

    // 只记录敏感操作
    const shouldAudit = this.shouldAuditRequest(method, path);

    if (shouldAudit && user) {
      const action = this.mapMethodToAction(method);
      const resource = this.extractResource(path);
      const resourceId = this.extractResourceId(path);
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      // 异步记录审计日志,不阻塞请求
      setImmediate(async () => {
        try {
          await this.auditService.createLog({
            userId: user.userId,
            action,
            resource,
            resourceId,
            details: {
              method,
              path,
              query: req.query,
              body: this.sanitizeBody(req.body),
            },
            ipAddress,
            userAgent,
          });
        } catch (error) {
          console.error('Failed to create audit log:', error);
        }
      });
    }

    next();
  }

  private shouldAuditRequest(method: string, path: string): boolean {
    // 需要审计的路径模式
    const auditPatterns = [
      /^\/api\/v1\/health\/records/, // 健康档案
      /^\/api\/v1\/users\/\w+/, // 用户管理
      /^\/api\/v1\/admin/, // 管理操作
    ];

    // 只审计 POST, PUT, PATCH, DELETE 操作
    const auditMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

    return auditMethods.includes(method) && auditPatterns.some((pattern) => pattern.test(path));
  }

  private mapMethodToAction(method: string): AuditAction {
    const actionMap: Record<string, AuditAction> = {
      POST: AuditAction.CREATE,
      GET: AuditAction.READ,
      PUT: AuditAction.UPDATE,
      PATCH: AuditAction.UPDATE,
      DELETE: AuditAction.DELETE,
    };

    return actionMap[method] || AuditAction.READ;
  }

  private extractResource(path: string): string {
    // 从路径中提取资源类型
    const match = path.match(/\/api\/v1\/([^/]+)/);
    return match ? match[1] : 'unknown';
  }

  private extractResourceId(path: string): string | undefined {
    // 从路径中提取资源ID (UUID格式)
    const match = path.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
    return match ? match[1] : undefined;
  }

  private sanitizeBody(body: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!body) return undefined;

    // 移除敏感字段
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey'];

    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    });

    return sanitized;
  }
}
