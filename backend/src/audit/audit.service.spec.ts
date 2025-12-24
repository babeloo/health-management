import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditAction } from '../generated/prisma/client';

describe('AuditService', () => {
  let service: AuditService;

  const mockPrismaService = {
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createLog', () => {
    it('should create an audit log', async () => {
      const logData = {
        userId: 'user-123',
        action: AuditAction.CREATE,
        resource: 'health_record',
        resourceId: 'record-123',
        details: { test: 'data' },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      };

      const mockLog = {
        id: 'log-123',
        ...logData,
        createdAt: new Date(),
      };

      mockPrismaService.auditLog.create.mockResolvedValue(mockLog);

      const result = await service.createLog(logData);

      expect(result).toEqual(mockLog);
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: logData,
      });
    });
  });

  describe('findLogs', () => {
    it('should return paginated audit logs', async () => {
      const query = {
        page: 1,
        limit: 20,
      };

      const mockLogs = [
        {
          id: 'log-1',
          userId: 'user-1',
          action: AuditAction.CREATE,
          resource: 'health_record',
          resourceId: 'record-1',
          details: {},
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          createdAt: new Date(),
          user: {
            id: 'user-1',
            username: 'testuser',
            fullName: 'Test User',
            role: 'PATIENT',
          },
        },
      ];

      mockPrismaService.auditLog.findMany.mockResolvedValue(mockLogs);
      mockPrismaService.auditLog.count.mockResolvedValue(1);

      const result = await service.findLogs(query);

      expect(result.data).toEqual(mockLogs);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
    });

    it('should filter logs by action', async () => {
      const query = {
        action: AuditAction.CREATE,
        page: 1,
        limit: 20,
      };

      mockPrismaService.auditLog.findMany.mockResolvedValue([]);
      mockPrismaService.auditLog.count.mockResolvedValue(0);

      await service.findLogs(query);

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: AuditAction.CREATE,
          }),
        }),
      );
    });

    it('should filter logs by date range', async () => {
      const query = {
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        page: 1,
        limit: 20,
      };

      mockPrismaService.auditLog.findMany.mockResolvedValue([]);
      mockPrismaService.auditLog.count.mockResolvedValue(0);

      await service.findLogs(query);

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: new Date('2025-01-01'),
              lte: new Date('2025-12-31'),
            },
          }),
        }),
      );
    });
  });

  describe('logHealthDataAccess', () => {
    it('should log health data access', async () => {
      const mockLog = {
        id: 'log-123',
        userId: 'user-123',
        action: AuditAction.READ,
        resource: 'health_record',
        resourceId: 'record-123',
        details: { type: 'health_data_access' },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        createdAt: new Date(),
      };

      mockPrismaService.auditLog.create.mockResolvedValue(mockLog);

      await service.logHealthDataAccess(
        'user-123',
        AuditAction.READ,
        'record-123',
        '127.0.0.1',
        'test-agent',
      );

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          action: AuditAction.READ,
          resource: 'health_record',
          resourceId: 'record-123',
          details: { type: 'health_data_access' },
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
        },
      });
    });
  });

  describe('logUserManagement', () => {
    it('should log user management operation', async () => {
      const mockLog = {
        id: 'log-123',
        userId: 'admin-123',
        action: AuditAction.UPDATE,
        resource: 'user',
        resourceId: 'user-456',
        details: { type: 'user_management', field: 'role' },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        createdAt: new Date(),
      };

      mockPrismaService.auditLog.create.mockResolvedValue(mockLog);

      await service.logUserManagement(
        'admin-123',
        AuditAction.UPDATE,
        'user-456',
        { field: 'role' },
        '127.0.0.1',
        'test-agent',
      );

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'admin-123',
          action: AuditAction.UPDATE,
          resource: 'user',
          resourceId: 'user-456',
          details: { type: 'user_management', field: 'role' },
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
        },
      });
    });
  });

  describe('logPermissionChange', () => {
    it('should log permission change', async () => {
      const mockLog = {
        id: 'log-123',
        userId: 'admin-123',
        action: AuditAction.PERMISSION_CHANGE,
        resource: 'user',
        resourceId: 'user-456',
        details: {
          type: 'permission_change',
          oldRole: 'PATIENT',
          newRole: 'DOCTOR',
        },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        createdAt: new Date(),
      };

      mockPrismaService.auditLog.create.mockResolvedValue(mockLog);

      await service.logPermissionChange(
        'admin-123',
        'user-456',
        'PATIENT',
        'DOCTOR',
        '127.0.0.1',
        'test-agent',
      );

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'admin-123',
          action: AuditAction.PERMISSION_CHANGE,
          resource: 'user',
          resourceId: 'user-456',
          details: {
            type: 'permission_change',
            oldRole: 'PATIENT',
            newRole: 'DOCTOR',
          },
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
        },
      });
    });
  });

  describe('logLogin', () => {
    it('should log user login', async () => {
      const mockLog = {
        id: 'log-123',
        userId: 'user-123',
        action: AuditAction.LOGIN,
        resource: 'auth',
        resourceId: null,
        details: { type: 'login' },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        createdAt: new Date(),
      };

      mockPrismaService.auditLog.create.mockResolvedValue(mockLog);

      await service.logLogin('user-123', '127.0.0.1', 'test-agent');

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          action: AuditAction.LOGIN,
          resource: 'auth',
          details: { type: 'login' },
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
        },
      });
    });
  });

  describe('logLogout', () => {
    it('should log user logout', async () => {
      const mockLog = {
        id: 'log-123',
        userId: 'user-123',
        action: AuditAction.LOGOUT,
        resource: 'auth',
        resourceId: null,
        details: { type: 'logout' },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        createdAt: new Date(),
      };

      mockPrismaService.auditLog.create.mockResolvedValue(mockLog);

      await service.logLogout('user-123', '127.0.0.1', 'test-agent');

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          action: AuditAction.LOGOUT,
          resource: 'auth',
          details: { type: 'logout' },
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
        },
      });
    });
  });
});
