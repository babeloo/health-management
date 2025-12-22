import { Role } from '../enums/role.enum';
import { Permission } from '../enums/permission.enum';

/**
 * 角色权限映射
 * 定义每个角色拥有的权限列表
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.PATIENT]: [Permission.READ_OWN_HEALTH, Permission.WRITE_OWN_HEALTH, Permission.USE_AI_CHAT],
  [Role.DOCTOR]: [
    Permission.READ_PATIENT_HEALTH,
    Permission.MANAGE_PATIENTS,
    Permission.ACCESS_AI_DIAGNOSIS,
  ],
  [Role.HEALTH_MANAGER]: [
    Permission.READ_PATIENT_HEALTH,
    Permission.MANAGE_PATIENTS,
    Permission.USE_AI_CHAT,
  ],
  [Role.ADMIN]: Object.values(Permission), // 管理员拥有所有权限
};

/**
 * 获取指定角色的权限列表
 */
export function getPermissionsByRole(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}
