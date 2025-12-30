import request from '@/utils/request';
import type { User, SystemConfig, AuditLog, ApiResponse, PaginatedResponse } from '@/types';

export const adminService = {
  // 用户管理
  getUsers: (params: { page?: number; pageSize?: number; role?: string; status?: string }) =>
    request.get<ApiResponse<PaginatedResponse<User>>>('/admin/users', { params }),

  getUserById: (id: number) => request.get<ApiResponse<User>>(`/admin/users/${id}`),

  updateUserRole: (id: number, role: string) =>
    request.patch<ApiResponse<User>>(`/admin/users/${id}/role`, { role }),

  updateUserStatus: (id: number, status: string) =>
    request.patch<ApiResponse<User>>(`/admin/users/${id}/status`, { status }),

  // 系统配置
  getConfigs: () => request.get<ApiResponse<SystemConfig[]>>('/admin/configs'),

  updateConfig: (key: string, value: string) =>
    request.put<ApiResponse<SystemConfig>>(`/admin/configs/${key}`, { value }),

  // 审计日志
  getAuditLogs: (params: {
    page?: number;
    pageSize?: number;
    userId?: number;
    action?: string;
    startDate?: string;
    endDate?: string;
  }) => request.get<ApiResponse<PaginatedResponse<AuditLog>>>('/admin/audit-logs', { params }),

  exportAuditLogs: (params: { startDate?: string; endDate?: string }) =>
    request.get('/admin/audit-logs/export', { params, responseType: 'blob' }),
};
