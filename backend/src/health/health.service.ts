import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { HealthRecord, UserRole } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { FileStorageService } from '../common/storage/file-storage.service';
import { CreateHealthRecordDto } from './dto/create-health-record.dto';
import { UpdateHealthRecordDto } from './dto/update-health-record.dto';

/**
 * 健康档案服务
 * 管理患者的健康档案创建、查询、更新和医疗文档上传
 */
@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fileStorageService: FileStorageService,
  ) {}

  /**
   * 创建健康档案
   * @param userId 用户 ID
   * @param createDto 创建 DTO
   * @returns 创建的健康档案
   */
  async createHealthRecord(
    userId: string,
    createDto: CreateHealthRecordDto,
  ): Promise<HealthRecord> {
    return this.prisma.healthRecord.create({
      data: {
        userId,
        height: createDto.height,
        weight: createDto.weight,
        bloodType: createDto.bloodType,
        chronicDiseases: createDto.chronicDiseases,
        allergies: createDto.allergies,
        familyHistory: createDto.familyHistory,
      },
    });
  }

  /**
   * 获取健康档案
   * 权限验证：
   * - 患者只能查看自己的档案
   * - 医生可以查看其管理的患者档案
   * - 管理员和健康管理师可以查看所有档案
   *
   * @param userId 目标用户 ID
   * @param currentUserId 当前登录用户 ID
   * @param currentUserRole 当前登录用户角色
   * @returns 健康档案
   */
  async getHealthRecord(
    userId: string,
    currentUserId: string,
    currentUserRole: UserRole,
  ): Promise<HealthRecord> {
    // 权限验证
    await this.validateAccess(userId, currentUserId, currentUserRole);

    // 查询健康档案
    const record = await this.prisma.healthRecord.findUnique({
      where: { userId },
    });

    if (!record) {
      throw new NotFoundException('健康档案不存在');
    }

    return record;
  }

  /**
   * 更新健康档案
   * 权限验证：仅允许患者本人更新
   *
   * @param userId 目标用户 ID
   * @param updateDto 更新 DTO
   * @param currentUserId 当前登录用户 ID
   * @param currentUserRole 当前登录用户角色
   * @returns 更新后的健康档案
   */
  async updateHealthRecord(
    userId: string,
    updateDto: UpdateHealthRecordDto,
    currentUserId: string,
    currentUserRole: UserRole,
  ): Promise<HealthRecord> {
    // 权限验证：仅允许患者本人更新
    if (currentUserRole === UserRole.PATIENT && currentUserId !== userId) {
      throw new ForbiddenException('无权更新他人的健康档案');
    }

    // 检查档案是否存在
    const existingRecord = await this.prisma.healthRecord.findUnique({
      where: { userId },
    });

    if (!existingRecord) {
      throw new NotFoundException('健康档案不存在');
    }

    // 更新档案
    return this.prisma.healthRecord.update({
      where: { userId },
      data: updateDto,
    });
  }

  /**
   * 添加医疗文档
   * 权限验证：仅允许患者本人上传
   *
   * @param userId 目标用户 ID
   * @param file 上传的文件
   * @param currentUserId 当前登录用户 ID
   * @param currentUserRole 当前登录用户角色
   * @returns 更新后的健康档案
   */
  async addDocument(
    userId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    currentUserId: string,
    currentUserRole: UserRole,
  ): Promise<HealthRecord> {
    // 权限验证：仅允许患者本人上传
    if (currentUserRole === UserRole.PATIENT && currentUserId !== userId) {
      throw new ForbiddenException('无权上传文档到他人的健康档案');
    }

    // 检查档案是否存在
    const existingRecord = await this.prisma.healthRecord.findUnique({
      where: { userId },
    });

    if (!existingRecord) {
      throw new NotFoundException('健康档案不存在');
    }

    // 上传文件到 MinIO
    const fileUrl = await this.fileStorageService.uploadHealthDocument(
      file.buffer,
      userId,
      file.originalname,
    );

    // 构建新文档对象
    const newDocument = {
      url: fileUrl,
      type: file.mimetype,
      name: file.originalname,
      size: file.size,
      uploadDate: new Date().toISOString(),
    };

    // 获取现有文档列表
    const existingDocuments = Array.isArray(existingRecord.documents)
      ? existingRecord.documents
      : [];

    // 更新档案，添加新文档
    return this.prisma.healthRecord.update({
      where: { userId },
      data: {
        documents: [...existingDocuments, newDocument],
      },
    });
  }

  /**
   * 验证访问权限
   * @param userId 目标用户 ID
   * @param currentUserId 当前登录用户 ID
   * @param currentUserRole 当前登录用户角色
   */
  private async validateAccess(
    userId: string,
    currentUserId: string,
    currentUserRole: UserRole,
  ): Promise<void> {
    // 管理员和健康管理师有全局访问权限
    if (currentUserRole === UserRole.ADMIN || currentUserRole === UserRole.HEALTH_MANAGER) {
      return;
    }

    // 患者只能访问自己的档案
    if (currentUserRole === UserRole.PATIENT) {
      if (currentUserId !== userId) {
        throw new ForbiddenException('无权访问他人的健康档案');
      }
      return;
    }

    // 医生可以访问其管理的患者档案
    if (currentUserRole === UserRole.DOCTOR) {
      const relation = await this.prisma.doctorPatientRelation.findFirst({
        where: {
          doctorId: currentUserId,
          patientId: userId,
          status: 'ACTIVE',
        },
      });

      if (!relation) {
        throw new ForbiddenException('无权访问该患者的健康档案');
      }
      return;
    }

    // 其他角色拒绝访问
    throw new ForbiddenException('无权访问健康档案');
  }
}
