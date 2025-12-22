/**
 * 用户角色枚举
 * 对应 Prisma Schema 中的 UserRole
 */
// eslint-disable-next-line no-shadow
export enum Role {
  PATIENT = 'PATIENT', // 患者
  DOCTOR = 'DOCTOR', // 医生
  HEALTH_MANAGER = 'HEALTH_MANAGER', // 健康管理师
  ADMIN = 'ADMIN', // 系统管理员
}
