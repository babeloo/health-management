export enum Role {
  PATIENT = 'patient',
  DOCTOR = 'doctor',
  HEALTH_MANAGER = 'health_manager',
  ADMIN = 'admin',
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: Role;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface SystemConfig {
  id: number;
  key: string;
  value: string;
  description: string;
  updatedAt: string;
}

export interface AuditLog {
  id: number;
  userId: number;
  username: string;
  action: string;
  resource: string;
  details: string;
  ipAddress: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
