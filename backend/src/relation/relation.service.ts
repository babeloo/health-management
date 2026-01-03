import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  DoctorPatientRelation,
  ManagerMemberRelation,
  UserRole,
  RelationStatus,
  AuditAction,
} from '../generated/prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateDoctorPatientRelationDto,
  CreateManagerMemberRelationDto,
  UpdateMembershipDto,
  QueryRelationsDto,
} from './dto';

/**
 * 医患关系服务
 * 管理医生-患者关系和健康管理师-会员关系
 */
@Injectable()
export class RelationService {
  private readonly logger = new Logger(RelationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * 创建医患关系
   * @param createDto 创建 DTO
   * @param requestUserId 操作用户 ID
   * @param requestUserRole 操作用户角色
   * @returns 创建的医患关系
   */
  async createDoctorPatientRelation(
    createDto: CreateDoctorPatientRelationDto,
    requestUserId: string,
    requestUserRole: UserRole,
  ): Promise<DoctorPatientRelation> {
    const { doctorId, patientId, notes } = createDto;

    // 权限检查：医生只能创建自己的关系，管理员可以创建任何关系
    if (requestUserRole !== UserRole.ADMIN && requestUserId !== doctorId) {
      throw new ForbiddenException('无权创建该医患关系');
    }

    // 验证医生存在且角色正确
    const doctor = await this.prisma.user.findUnique({
      where: { id: doctorId },
    });

    if (!doctor) {
      throw new NotFoundException('医生不存在');
    }

    if (doctor.role !== UserRole.DOCTOR) {
      throw new BadRequestException('指定用户不是医生');
    }

    // 验证患者存在且角色正确
    const patient = await this.prisma.user.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException('患者不存在');
    }

    if (patient.role !== UserRole.PATIENT) {
      throw new BadRequestException('指定用户不是患者');
    }

    // 检查关系是否已存在
    const existingRelation = await this.prisma.doctorPatientRelation.findFirst({
      where: {
        doctorId,
        patientId,
      },
    });

    if (existingRelation) {
      throw new ConflictException('医患关系已存在');
    }

    // 创建关系
    const relation = await this.prisma.doctorPatientRelation.create({
      data: {
        doctorId,
        patientId,
        notes,
        status: RelationStatus.ACTIVE,
      },
    });

    // 记录审计日志
    await this.auditService.createLog({
      userId: doctorId,
      action: AuditAction.CREATE,
      resource: 'doctor_patient_relation',
      resourceId: relation.id,
      details: {
        patientId,
        notes,
      },
    });

    this.logger.log(`Created doctor-patient relation: doctor=${doctorId}, patient=${patientId}`);

    return relation;
  }

  /**
   * 获取医生的患者列表（分页）
   * @param doctorId 医生 ID
   * @param queryDto 查询参数
   * @param requestUserId 操作用户 ID
   * @param requestUserRole 操作用户角色
   * @returns 患者列表（包含分页信息）
   */
  async getDoctorPatients(
    doctorId: string,
    queryDto: QueryRelationsDto,
    requestUserId: string,
    requestUserRole: UserRole,
  ): Promise<{
    data: DoctorPatientRelation[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    // 权限检查：医生只能查看自己的患者列表，管理员可以查看任何医生
    if (requestUserRole !== UserRole.ADMIN && requestUserId !== doctorId) {
      throw new ForbiddenException('无权访问该医生的患者列表');
    }

    const { status, page = 1, limit = 20 } = queryDto;

    const where: { doctorId: string; status?: RelationStatus } = {
      doctorId,
    };

    if (status) {
      where.status = status;
    }

    const [relations, total] = await Promise.all([
      this.prisma.doctorPatientRelation.findMany({
        where,
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
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.doctorPatientRelation.count({ where }),
    ]);

    return {
      data: relations,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 获取患者的医生列表
   * @param patientId 患者 ID
   * @param requestUserId 操作用户 ID
   * @param requestUserRole 操作用户角色
   * @returns 医生列表
   */
  async getPatientDoctors(
    patientId: string,
    requestUserId: string,
    requestUserRole: UserRole,
  ): Promise<DoctorPatientRelation[]> {
    // 权限检查：患者只能查看自己的医生列表，管理员可以查看任何患者
    if (requestUserRole !== UserRole.ADMIN && requestUserId !== patientId) {
      throw new ForbiddenException('无权访问该患者的医生列表');
    }

    const relations = await this.prisma.doctorPatientRelation.findMany({
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

    return relations;
  }

  /**
   * 解除医患关系（软删除，设置为 INACTIVE）
   * @param relationId 关系 ID
   * @param userId 操作用户 ID
   * @param userRole 操作用户角色
   */
  async deleteDoctorPatientRelation(
    relationId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<void> {
    // 查询关系
    const relation = await this.prisma.doctorPatientRelation.findUnique({
      where: { id: relationId },
    });

    if (!relation) {
      throw new NotFoundException('关系不存在');
    }

    // 权限检查：医生只能删除自己的关系，管理员可以删除任何关系
    if (userRole !== UserRole.ADMIN && relation.doctorId !== userId) {
      throw new ForbiddenException('无权操作此关系');
    }

    // 软删除：设置状态为 INACTIVE
    await this.prisma.doctorPatientRelation.update({
      where: { id: relationId },
      data: { status: RelationStatus.INACTIVE },
    });

    // 记录审计日志
    await this.auditService.createLog({
      userId,
      action: AuditAction.DELETE,
      resource: 'doctor_patient_relation',
      resourceId: relationId,
      details: {
        doctorId: relation.doctorId,
        patientId: relation.patientId,
      },
    });

    this.logger.log(`Deleted doctor-patient relation: id=${relationId}, userId=${userId}`);
  }

  /**
   * 创建健康管理师会员关系
   * @param createDto 创建 DTO
   * @param requestUserId 操作用户 ID
   * @param requestUserRole 操作用户角色
   * @returns 创建的会员关系
   */
  async createManagerMemberRelation(
    createDto: CreateManagerMemberRelationDto,
    requestUserId: string,
    requestUserRole: UserRole,
  ): Promise<ManagerMemberRelation> {
    const { managerId, memberId, membershipType } = createDto;

    // 权限检查：健康管理师只能创建自己的关系，管理员可以创建任何关系
    if (requestUserRole !== UserRole.ADMIN && requestUserId !== managerId) {
      throw new ForbiddenException('无权创建该健康管理师会员关系');
    }

    // 验证健康管理师存在且角色正确
    const manager = await this.prisma.user.findUnique({
      where: { id: managerId },
    });

    if (!manager) {
      throw new NotFoundException('健康管理师不存在');
    }

    if (manager.role !== UserRole.HEALTH_MANAGER) {
      throw new BadRequestException('指定用户不是健康管理师');
    }

    // 验证会员存在
    const member = await this.prisma.user.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      throw new NotFoundException('会员不存在');
    }

    // 检查关系是否已存在
    const existingRelation = await this.prisma.managerMemberRelation.findFirst({
      where: {
        managerId,
        memberId,
      },
    });

    if (existingRelation) {
      throw new ConflictException('健康管理师会员关系已存在');
    }

    // 创建关系
    const relation = await this.prisma.managerMemberRelation.create({
      data: {
        managerId,
        memberId,
        membershipType,
        status: RelationStatus.ACTIVE,
      },
    });

    // 记录审计日志
    await this.auditService.createLog({
      userId: managerId,
      action: AuditAction.CREATE,
      resource: 'manager_member_relation',
      resourceId: relation.id,
      details: {
        memberId,
        membershipType,
      },
    });

    this.logger.log(`Created manager-member relation: manager=${managerId}, member=${memberId}`);

    return relation;
  }

  /**
   * 获取健康管理师的会员列表（分页）
   * @param managerId 健康管理师 ID
   * @param queryDto 查询参数
   * @param requestUserId 操作用户 ID
   * @param requestUserRole 操作用户角色
   * @returns 会员列表（包含分页信息）
   */
  async getManagerMembers(
    managerId: string,
    queryDto: QueryRelationsDto,
    requestUserId: string,
    requestUserRole: UserRole,
  ): Promise<{
    data: ManagerMemberRelation[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    // 权限检查：健康管理师只能查看自己的会员列表，管理员可以查看任何健康管理师
    if (requestUserRole !== UserRole.ADMIN && requestUserId !== managerId) {
      throw new ForbiddenException('无权访问该健康管理师的会员列表');
    }

    const { status, page = 1, limit = 20 } = queryDto;

    const where: { managerId: string; status?: RelationStatus } = {
      managerId,
    };

    if (status) {
      where.status = status;
    }

    const [relations, total] = await Promise.all([
      this.prisma.managerMemberRelation.findMany({
        where,
        include: {
          member: {
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
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.managerMemberRelation.count({ where }),
    ]);

    return {
      data: relations,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 更新会员类型
   * @param relationId 关系 ID
   * @param updateDto 更新 DTO
   * @param requestUserId 操作用户 ID
   * @param requestUserRole 操作用户角色
   * @returns 更新后的关系
   */
  async updateMembership(
    relationId: string,
    updateDto: UpdateMembershipDto,
    requestUserId: string,
    requestUserRole: UserRole,
  ): Promise<ManagerMemberRelation> {
    const { membershipType } = updateDto;

    // 查询关系是否存在
    const relation = await this.prisma.managerMemberRelation.findUnique({
      where: { id: relationId },
    });

    if (!relation) {
      throw new NotFoundException('关系不存在');
    }

    // 权限检查：健康管理师只能更新自己的关系，管理员可以更新任何关系
    if (requestUserRole !== UserRole.ADMIN && relation.managerId !== requestUserId) {
      throw new ForbiddenException('无权更新此会员关系');
    }

    // 更新会员类型
    const updatedRelation = await this.prisma.managerMemberRelation.update({
      where: { id: relationId },
      data: { membershipType },
    });

    // 记录审计日志
    await this.auditService.createLog({
      userId: relation.managerId,
      action: AuditAction.UPDATE,
      resource: 'manager_member_relation',
      resourceId: relationId,
      details: {
        oldMembershipType: relation.membershipType,
        newMembershipType: membershipType,
      },
    });

    this.logger.log(`Updated membership: relationId=${relationId}, type=${membershipType}`);

    return updatedRelation;
  }

  /**
   * 解除健康管理师会员关系
   * @param relationId 关系 ID
   * @param userId 操作用户 ID
   * @param userRole 操作用户角色
   */
  async deleteManagerMemberRelation(
    relationId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<void> {
    // 查询关系
    const relation = await this.prisma.managerMemberRelation.findUnique({
      where: { id: relationId },
    });

    if (!relation) {
      throw new NotFoundException('关系不存在');
    }

    // 权限检查：健康管理师只能删除自己的关系，管理员可以删除任何关系
    if (userRole !== UserRole.ADMIN && relation.managerId !== userId) {
      throw new ForbiddenException('无权操作此关系');
    }

    // 软删除：设置状态为 INACTIVE
    await this.prisma.managerMemberRelation.update({
      where: { id: relationId },
      data: {
        status: RelationStatus.INACTIVE,
        endedAt: new Date(),
      },
    });

    // 记录审计日志
    await this.auditService.createLog({
      userId,
      action: AuditAction.DELETE,
      resource: 'manager_member_relation',
      resourceId: relationId,
      details: {
        managerId: relation.managerId,
        memberId: relation.memberId,
      },
    });

    this.logger.log(`Deleted manager-member relation: id=${relationId}, userId=${userId}`);
  }
}
