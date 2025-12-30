import { create } from 'zustand';
import type { User, SystemConfig, AuditLog } from '@/types';

interface AdminState {
  users: User[];
  configs: SystemConfig[];
  auditLogs: AuditLog[];
  loading: boolean;
  setUsers: (users: User[]) => void;
  setConfigs: (configs: SystemConfig[]) => void;
  setAuditLogs: (logs: AuditLog[]) => void;
  setLoading: (loading: boolean) => void;
}

export const useAdminStore = create<AdminState>((set) => ({
  users: [],
  configs: [],
  auditLogs: [],
  loading: false,
  setUsers: (users) => set({ users }),
  setConfigs: (configs) => set({ configs }),
  setAuditLogs: (auditLogs) => set({ auditLogs }),
  setLoading: (loading) => set({ loading }),
}));
