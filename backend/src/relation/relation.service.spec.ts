import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import {
  UserRole,
  RelationStatus,
  DoctorPatientRelation,
  ManagerMemberRelation,
} from '../generated/prisma/client';
import { RelationService } from './relation.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateDoctorPatientRelationDto,
  CreateManagerMemberRelationDto,
  UpdateMembershipDto,
  MembershipType,
  QueryRelationsDto,
} from './dto';

describe('RelationService', () => {
  let service: RelationService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    doctorPatientRelation: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    managerMemberRelation: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockAuditService = {
    createLog: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RelationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<RelationService>(RelationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createDoctorPatientRelation', () => {
    const createDto: CreateDoctorPatientRelationDto = {
      doctorId: 'doctor-123',
      patientId: 'patient-456',
      notes: '高血压患者',
    };

    it('应该成功创建医患关系', async () => {
      const mockDoctor = {
        id: createDto.doctorId,
        role: UserRole.DOCTOR,
        username: 'doctor1',
      };
      const mockPatient = {
        id: createDto.patientId,
        role: UserRole.PATIENT,
        username: 'patient1',
      };
      const expectedRelation: DoctorPatientRelation = {
        id: 'relation-123',
        doctorId: createDto.doctorId,
        patientId: createDto.patientId,
        status: RelationStatus.ACTIVE,
        notes: createDto.notes ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockDoctor)
        .mockResolvedValueOnce(mockPatient);
      mockPrismaService.doctorPatientRelation.findFirst.mockResolvedValue(null);
      mockPrismaService.doctorPatientRelation.create.mockResolvedValue(expectedRelation);

      const result = await service.createDoctorPatientRelation(createDto);

      expect(result).toEqual(expectedRelation);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.doctorPatientRelation.create).toHaveBeenCalledWith({
        data: {
          doctorId: createDto.doctorId,
          patientId: createDto.patientId,
          notes: createDto.notes,
          status: RelationStatus.ACTIVE,
        },
      });
      expect(mockAuditService.createLog).toHaveBeenCalled();
    });

    it('应该抛出 NotFoundException 当医生不存在时', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce(null);

      await expect(service.createDoctorPatientRelation(createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('应该抛出 BadRequestException 当医生角色不正确时', async () => {
      const mockDoctor = {
        id: createDto.doctorId,
        role: UserRole.PATIENT,
        username: 'patient1',
      };

      mockPrismaService.user.findUnique.mockResolvedValueOnce(mockDoctor);

      await expect(service.createDoctorPatientRelation(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('应该抛出 NotFoundException 当患者不存在时', async () => {
      const mockDoctor = {
        id: createDto.doctorId,
        role: UserRole.DOCTOR,
        username: 'doctor1',
      };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockDoctor)
        .mockResolvedValueOnce(null);

      await expect(service.createDoctorPatientRelation(createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('应该抛出 BadRequestException 当患者角色不正确时', async () => {
      const mockDoctor = {
        id: createDto.doctorId,
        role: UserRole.DOCTOR,
        username: 'doctor1',
      };
      const mockPatient = {
        id: createDto.patientId,
        role: UserRole.DOCTOR,
        username: 'doctor2',
      };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockDoctor)
        .mockResolvedValueOnce(mockPatient);

      await expect(service.createDoctorPatientRelation(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('应该抛出 ConflictException 当关系已存在时', async () => {
      const mockDoctor = {
        id: createDto.doctorId,
        role: UserRole.DOCTOR,
        username: 'doctor1',
      };
      const mockPatient = {
        id: createDto.patientId,
        role: UserRole.PATIENT,
        username: 'patient1',
      };
      const existingRelation: DoctorPatientRelation = {
        id: 'relation-123',
        doctorId: createDto.doctorId,
        patientId: createDto.patientId,
        status: RelationStatus.ACTIVE,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockDoctor)
        .mockResolvedValueOnce(mockPatient);
      mockPrismaService.doctorPatientRelation.findFirst.mockResolvedValue(existingRelation);

      await expect(service.createDoctorPatientRelation(createDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('getDoctorPatients', () => {
    const doctorId = 'doctor-123';
    const queryDto: QueryRelationsDto = {
      status: RelationStatus.ACTIVE,
      page: 1,
      limit: 20,
    };

    it('应该返回医生的患者列表（分页）', async () => {
      const mockRelations: DoctorPatientRelation[] = [
        {
          id: 'relation-1',
          doctorId,
          patientId: 'patient-1',
          status: RelationStatus.ACTIVE,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'relation-2',
          doctorId,
          patientId: 'patient-2',
          status: RelationStatus.ACTIVE,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      const total = 2;

      mockPrismaService.doctorPatientRelation.findMany.mockResolvedValue(mockRelations);
      mockPrismaService.doctorPatientRelation.count.mockResolvedValue(total);

      const result = await service.getDoctorPatients(doctorId, queryDto);

      expect(result).toEqual({
        data: mockRelations,
        total,
        page: queryDto.page,
        limit: queryDto.limit,
        totalPages: 1,
      });
      expect(mockPrismaService.doctorPatientRelation.findMany).toHaveBeenCalledWith({
        where: {
          doctorId,
          status: queryDto.status,
        },
        include: {
          patient: {
            select: {
              id: true,
              username: true,
              fullName: true,
              gender: true,
              birthDate: true,
              phone: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
        skip: 0,
        take: queryDto.limit,
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    it('应该支持不传 status 查询所有状态', async () => {
      const queryWithoutStatus: QueryRelationsDto = {
        page: 1,
        limit: 20,
      };

      mockPrismaService.doctorPatientRelation.findMany.mockResolvedValue([]);
      mockPrismaService.doctorPatientRelation.count.mockResolvedValue(0);

      await service.getDoctorPatients(doctorId, queryWithoutStatus);

      expect(mockPrismaService.doctorPatientRelation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            doctorId,
          },
        }),
      );
    });
  });

  describe('getPatientDoctors', () => {
    const patientId = 'patient-123';

    it('应该返回患者的医生列表', async () => {
      const mockRelations: DoctorPatientRelation[] = [
        {
          id: 'relation-1',
          doctorId: 'doctor-1',
          patientId,
          status: RelationStatus.ACTIVE,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.doctorPatientRelation.findMany.mockResolvedValue(mockRelations);

      const result = await service.getPatientDoctors(patientId);

      expect(result).toEqual(mockRelations);
      expect(mockPrismaService.doctorPatientRelation.findMany).toHaveBeenCalledWith({
        where: {
          patientId,
          status: RelationStatus.ACTIVE,
        },
        include: {
          doctor: {
            select: {
              id: true,
              username: true,
              fullName: true,
              avatarUrl: true,
            },
          },
        },
      });
    });
  });

  describe('deleteRelation', () => {
    const relationId = 'relation-123';
    const userId = 'doctor-123';
    const userRole = UserRole.DOCTOR;

    it('应该成功删除医患关系（医生操作）', async () => {
      const mockRelation: DoctorPatientRelation = {
        id: relationId,
        doctorId: userId,
        patientId: 'patient-456',
        status: RelationStatus.ACTIVE,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.doctorPatientRelation.findUnique.mockResolvedValue(mockRelation);
      mockPrismaService.doctorPatientRelation.update.mockResolvedValue({
        ...mockRelation,
        status: RelationStatus.INACTIVE,
      });

      await service.deleteDoctorPatientRelation(relationId, userId, userRole);

      expect(mockPrismaService.doctorPatientRelation.update).toHaveBeenCalledWith({
        where: { id: relationId },
        data: { status: RelationStatus.INACTIVE },
      });
      expect(mockAuditService.createLog).toHaveBeenCalled();
    });

    it('应该抛出 NotFoundException 当关系不存在时', async () => {
      mockPrismaService.doctorPatientRelation.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteDoctorPatientRelation(relationId, userId, userRole),
      ).rejects.toThrow(NotFoundException);
    });

    it('应该抛出 ForbiddenException 当医生尝试删除他人的关系时', async () => {
      const mockRelation: DoctorPatientRelation = {
        id: relationId,
        doctorId: 'other-doctor-789',
        patientId: 'patient-456',
        status: RelationStatus.ACTIVE,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.doctorPatientRelation.findUnique.mockResolvedValue(mockRelation);

      await expect(
        service.deleteDoctorPatientRelation(relationId, userId, userRole),
      ).rejects.toThrow(ForbiddenException);
    });

    it('应该允许管理员删除任何关系', async () => {
      const mockRelation: DoctorPatientRelation = {
        id: relationId,
        doctorId: 'other-doctor-789',
        patientId: 'patient-456',
        status: RelationStatus.ACTIVE,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.doctorPatientRelation.findUnique.mockResolvedValue(mockRelation);
      mockPrismaService.doctorPatientRelation.update.mockResolvedValue({
        ...mockRelation,
        status: RelationStatus.INACTIVE,
      });

      await service.deleteDoctorPatientRelation(relationId, 'admin-123', UserRole.ADMIN);

      expect(mockPrismaService.doctorPatientRelation.update).toHaveBeenCalled();
    });
  });

  describe('createManagerMemberRelation', () => {
    const createDto: CreateManagerMemberRelationDto = {
      managerId: 'manager-123',
      memberId: 'member-456',
      membershipType: MembershipType.BASIC,
    };

    it('应该成功创建健康管理师会员关系', async () => {
      const mockManager = {
        id: createDto.managerId,
        role: UserRole.HEALTH_MANAGER,
        username: 'manager1',
      };
      const mockMember = {
        id: createDto.memberId,
        role: UserRole.PATIENT,
        username: 'member1',
      };
      const expectedRelation: ManagerMemberRelation = {
        id: 'relation-123',
        managerId: createDto.managerId,
        memberId: createDto.memberId,
        membershipType: createDto.membershipType ?? null,
        serviceCount: 0,
        totalServiceHours: 0,
        status: RelationStatus.ACTIVE,
        startedAt: new Date(),
        endedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockManager)
        .mockResolvedValueOnce(mockMember);
      mockPrismaService.managerMemberRelation.findFirst.mockResolvedValue(null);
      mockPrismaService.managerMemberRelation.create.mockResolvedValue(expectedRelation);

      const result = await service.createManagerMemberRelation(createDto);

      expect(result).toEqual(expectedRelation);
      expect(mockPrismaService.managerMemberRelation.create).toHaveBeenCalledWith({
        data: {
          managerId: createDto.managerId,
          memberId: createDto.memberId,
          membershipType: createDto.membershipType,
          status: RelationStatus.ACTIVE,
        },
      });
    });

    it('应该抛出 NotFoundException 当健康管理师不存在时', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce(null);

      await expect(service.createManagerMemberRelation(createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('应该抛出 ConflictException 当关系已存在时', async () => {
      const mockManager = {
        id: createDto.managerId,
        role: UserRole.HEALTH_MANAGER,
        username: 'manager1',
      };
      const mockMember = {
        id: createDto.memberId,
        role: UserRole.PATIENT,
        username: 'member1',
      };
      const existingRelation: ManagerMemberRelation = {
        id: 'relation-123',
        managerId: createDto.managerId,
        memberId: createDto.memberId,
        membershipType: MembershipType.BASIC,
        serviceCount: 0,
        totalServiceHours: 0,
        status: RelationStatus.ACTIVE,
        startedAt: new Date(),
        endedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockManager)
        .mockResolvedValueOnce(mockMember);
      mockPrismaService.managerMemberRelation.findFirst.mockResolvedValue(existingRelation);

      await expect(service.createManagerMemberRelation(createDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('updateMembership', () => {
    const relationId = 'relation-123';
    const updateDto: UpdateMembershipDto = {
      membershipType: MembershipType.PREMIUM,
    };

    it('应该成功更新会员类型', async () => {
      const mockRelation: ManagerMemberRelation = {
        id: relationId,
        managerId: 'manager-123',
        memberId: 'member-456',
        membershipType: MembershipType.BASIC,
        serviceCount: 0,
        totalServiceHours: 0,
        status: RelationStatus.ACTIVE,
        startedAt: new Date(),
        endedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updatedRelation: ManagerMemberRelation = {
        ...mockRelation,
        membershipType: updateDto.membershipType,
      };

      mockPrismaService.managerMemberRelation.findUnique.mockResolvedValue(mockRelation);
      mockPrismaService.managerMemberRelation.update.mockResolvedValue(updatedRelation);

      const result = await service.updateMembership(relationId, updateDto);

      expect(result).toEqual(updatedRelation);
      expect(mockPrismaService.managerMemberRelation.update).toHaveBeenCalledWith({
        where: { id: relationId },
        data: { membershipType: updateDto.membershipType },
      });
    });

    it('应该抛出 NotFoundException 当关系不存在时', async () => {
      mockPrismaService.managerMemberRelation.findUnique.mockResolvedValue(null);

      await expect(service.updateMembership(relationId, updateDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.updateMembership(relationId, updateDto)).rejects.toThrow('关系不存在');
    });
  });
});
