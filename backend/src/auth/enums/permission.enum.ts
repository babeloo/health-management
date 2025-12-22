/**
 * 权限枚举
 * 基于 RBAC 模型定义的系统权限
 */
// eslint-disable-next-line no-shadow
export enum Permission {
  // 健康数据权限
  READ_OWN_HEALTH = 'read:own_health',
  WRITE_OWN_HEALTH = 'write:own_health',
  READ_PATIENT_HEALTH = 'read:patient_health',

  // 用户管理权限
  MANAGE_PATIENTS = 'manage:patients',
  MANAGE_USERS = 'manage:users',

  // AI 功能权限
  USE_AI_CHAT = 'use:ai_chat',
  ACCESS_AI_DIAGNOSIS = 'access:ai_diagnosis',

  // 系统配置权限
  CONFIGURE_SYSTEM = 'configure:system',
  VIEW_ANALYTICS = 'view:analytics',
}
