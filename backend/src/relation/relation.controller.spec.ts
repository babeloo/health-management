import { Test, TestingModule } from '@nestjs/testing';
import {
  ValidationPipe,
  ExecutionContext,
  ArgumentsHost,
  Catch,
  ExceptionFilter,
} from '@nestjs/common';
import request from 'supertest';
import { UserRole, RelationStatus } from '../generated/prisma/client';
import { RelationController } from './relation.controller';
import { RelationService } from './relation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MembershipType } from './dto';

@Catch()
class TestCompatExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    // monorepo 下可能存在 @nestjs/common 多实例：BadRequestException instanceof 判断失效时，兜底按 name 处理
    if (exception?.name === 'BadRequestException') {
      response.status(400).json({
        statusCode: 400,
        message: exception?.message ?? 'Bad Request',
        error: 'Bad Request',
      });
      return;
    }

    const status = typeof exception?.status === 'number' ? exception.status : 500;
    response.status(status).json({
      statusCode: status,
      message: exception?.message ?? 'Internal Server Error',
      error: status === 500 ? 'Internal Server Error' : 'Error',
    });
  }
}

describe('RelationController (集成测试)', () => {
  let app: any;

  const mockRelationService = {
    createDoctorPatientRelation: jest.fn(),
    getDoctorPatients: jest.fn(),
    getPatientDoctors: jest.fn(),
    deleteDoctorPatientRelation: jest.fn(),
    createManagerMemberRelation: jest.fn(),
    getManagerMembers: jest.fn(),
    updateMembership: jest.fn(),
    deleteManagerMemberRelation: jest.fn(),
  };

  // Mock 用户（来自 JWT）
  const mockDoctorUser = {
    id: 'doctor-123',
    userId: 'doctor-123',
    role: UserRole.DOCTOR,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RelationController],
      providers: [
        {
          provide: RelationService,
          useValue: mockRelationService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          // 根据测试需要设置不同的用户
          req.user = mockDoctorUser;
          return true;
        },
      })
      .compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new TestCompatExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  describe('POST /api/v1/relations/doctor-patient', () => {
    const createDto = {
      doctorId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      patientId: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      notes: '高血压患者',
    };

    it('应该成功创建医患关系', async () => {
      const expectedRelation = {
        id: 'relation-123',
        ...createDto,
        status: RelationStatus.ACTIVE,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockRelationService.createDoctorPatientRelation.mockResolvedValue(expectedRelation);

      const response = await request(app.getHttpServer())
        .post('/api/v1/relations/doctor-patient')
        .send(createDto);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(expectedRelation);
      expect(mockRelationService.createDoctorPatientRelation).toHaveBeenCalledWith(
        createDto,
        mockDoctorUser.id,
        mockDoctorUser.role,
      );
    });

    it('应该验证 DTO（缺少必填字段）', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/relations/doctor-patient')
        .send({ doctorId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
        .expect(400);
    });

    it('应该验证 DTO（doctorId 不是有效 UUID）', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/relations/doctor-patient')
        .send({
          doctorId: 'invalid-uuid',
          patientId: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/relations/doctor/:doctorId/patients', () => {
    const doctorId = 'doctor-123';

    it('应该返回医生的患者列表', async () => {
      const mockResponse = {
        data: [
          {
            id: 'relation-1',
            doctorId,
            patientId: 'patient-1',
            status: RelationStatus.ACTIVE,
            notes: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            patient: {
              id: 'patient-1',
              username: 'patient1',
              fullName: '张三',
            },
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      mockRelationService.getDoctorPatients.mockResolvedValue(mockResponse);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/relations/doctor/${doctorId}/patients`)
        .expect(200);

      expect(response.body).toEqual(mockResponse);
      expect(mockRelationService.getDoctorPatients).toHaveBeenCalledWith(
        doctorId,
        expect.objectContaining({
          page: 1,
          limit: 20,
        }),
        mockDoctorUser.id,
        mockDoctorUser.role,
      );
    });

    it('应该支持分页和状态过滤', async () => {
      const mockResponse = {
        data: [],
        total: 0,
        page: 2,
        limit: 10,
        totalPages: 0,
      };

      mockRelationService.getDoctorPatients.mockResolvedValue(mockResponse);

      await request(app.getHttpServer())
        .get(`/api/v1/relations/doctor/${doctorId}/patients`)
        .query({ status: 'ACTIVE', page: 2, limit: 10 })
        .expect(200);

      expect(mockRelationService.getDoctorPatients).toHaveBeenCalledWith(
        doctorId,
        expect.objectContaining({
          status: RelationStatus.ACTIVE,
          page: 2,
          limit: 10,
        }),
        mockDoctorUser.id,
        mockDoctorUser.role,
      );
    });
  });

  describe('GET /api/v1/relations/patient/:patientId/doctors', () => {
    const patientId = 'patient-456';

    it('应该返回患者的医生列表', async () => {
      const mockDoctors = [
        {
          id: 'relation-1',
          doctorId: 'doctor-1',
          patientId,
          status: RelationStatus.ACTIVE,
          notes: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          doctor: {
            id: 'doctor-1',
            username: 'doctor1',
            fullName: '李医生',
          },
        },
      ];

      mockRelationService.getPatientDoctors.mockResolvedValue(mockDoctors);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/relations/patient/${patientId}/doctors`)
        .expect(200);

      expect(response.body).toEqual(mockDoctors);
      expect(mockRelationService.getPatientDoctors).toHaveBeenCalledWith(
        patientId,
        mockDoctorUser.id,
        mockDoctorUser.role,
      );
    });
  });

  describe('DELETE /api/v1/relations/doctor-patient/:id', () => {
    const relationId = 'relation-123';

    it('应该成功解除医患关系', async () => {
      mockRelationService.deleteDoctorPatientRelation.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete(`/api/v1/relations/doctor-patient/${relationId}`)
        .expect(200);

      expect(mockRelationService.deleteDoctorPatientRelation).toHaveBeenCalledWith(
        relationId,
        mockDoctorUser.id,
        mockDoctorUser.role,
      );
    });
  });

  describe('POST /api/v1/relations/manager-member', () => {
    const createDto = {
      managerId: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
      memberId: 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
      membershipType: MembershipType.BASIC,
    };

    it('应该成功创建健康管理师会员关系', async () => {
      const expectedRelation = {
        id: 'relation-123',
        ...createDto,
        serviceCount: 0,
        totalServiceHours: 0,
        status: RelationStatus.ACTIVE,
        startedAt: new Date().toISOString(),
        endedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockRelationService.createManagerMemberRelation.mockResolvedValue(expectedRelation);

      const response = await request(app.getHttpServer())
        .post('/api/v1/relations/manager-member')
        .send(createDto);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(expectedRelation);
      expect(mockRelationService.createManagerMemberRelation).toHaveBeenCalledWith(
        createDto,
        mockDoctorUser.id,
        mockDoctorUser.role,
      );
    });

    it('应该验证会员类型枚举', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/relations/manager-member')
        .send({
          managerId: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
          memberId: 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
          membershipType: 'invalid-type',
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/relations/manager/:managerId/members', () => {
    const managerId = 'manager-123';

    it('应该返回健康管理师的会员列表', async () => {
      const mockResponse = {
        data: [
          {
            id: 'relation-1',
            managerId,
            memberId: 'member-1',
            membershipType: MembershipType.BASIC,
            serviceCount: 0,
            totalServiceHours: 0,
            status: RelationStatus.ACTIVE,
            startedAt: new Date().toISOString(),
            endedAt: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            member: {
              id: 'member-1',
              username: 'member1',
              fullName: '王五',
            },
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      mockRelationService.getManagerMembers.mockResolvedValue(mockResponse);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/relations/manager/${managerId}/members`)
        .expect(200);

      expect(response.body).toEqual(mockResponse);
      expect(mockRelationService.getManagerMembers).toHaveBeenCalledWith(
        managerId,
        expect.objectContaining({
          page: 1,
          limit: 20,
        }),
        mockDoctorUser.id,
        mockDoctorUser.role,
      );
    });
  });

  describe('PUT /api/v1/relations/manager-member/:id/membership', () => {
    const relationId = 'relation-123';
    const updateDto = {
      membershipType: MembershipType.PREMIUM,
    };

    it('应该成功更新会员类型', async () => {
      const updatedRelation = {
        id: relationId,
        managerId: 'manager-123',
        memberId: 'member-456',
        membershipType: updateDto.membershipType,
        serviceCount: 0,
        totalServiceHours: 0,
        status: RelationStatus.ACTIVE,
        startedAt: new Date().toISOString(),
        endedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockRelationService.updateMembership.mockResolvedValue(updatedRelation);

      const response = await request(app.getHttpServer())
        .put(`/api/v1/relations/manager-member/${relationId}/membership`)
        .send(updateDto)
        .expect(200);

      expect(response.body).toEqual(updatedRelation);
      expect(mockRelationService.updateMembership).toHaveBeenCalledWith(
        relationId,
        updateDto,
        mockDoctorUser.id,
        mockDoctorUser.role,
      );
    });
  });

  describe('DELETE /api/v1/relations/manager-member/:id', () => {
    const relationId = 'relation-123';

    it('应该成功解除健康管理师会员关系', async () => {
      mockRelationService.deleteManagerMemberRelation.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete(`/api/v1/relations/manager-member/${relationId}`)
        .expect(200);

      expect(mockRelationService.deleteManagerMemberRelation).toHaveBeenCalledWith(
        relationId,
        mockDoctorUser.id,
        mockDoctorUser.role,
      );
    });
  });
});
