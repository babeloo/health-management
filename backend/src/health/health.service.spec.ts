import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { HealthService } from './health.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { FileStorageService } from '../common/storage/file-storage.service';
import { CreateHealthRecordDto } from './dto/create-health-record.dto';
import { UpdateHealthRecordDto } from './dto/update-health-record.dto';

describe('HealthService', () => {
  let service: HealthService;

  const mockPrismaService = {
    healthRecord: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    doctorPatientRelation: {
      findFirst: jest.fn(),
    },
  };

  const mockFileStorageService = {
    uploadHealthDocument: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: FileStorageService,
          useValue: mockFileStorageService,
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createHealthRecord', () => {
    it('应该成功创建健康档案', async () => {
      const userId = 'user-123';
      const createDto: CreateHealthRecordDto = {
        height: 175.5,
        weight: 70.2,
        bloodType: 'A',
        chronicDiseases: ['高血压'],
        allergies: ['青霉素'],
        familyHistory: ['家族有高血压史'],
      };

      const expectedRecord = {
        id: 'record-123',
        userId,
        ...createDto,
        documents: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.healthRecord.create.mockResolvedValue(expectedRecord);

      const result = await service.createHealthRecord(userId, createDto);

      expect(result).toEqual(expectedRecord);
      expect(mockPrismaService.healthRecord.create).toHaveBeenCalledWith({
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
    });

    it('应该处理仅包含部分字段的创建请求', async () => {
      const userId = 'user-123';
      const createDto: CreateHealthRecordDto = {
        height: 175.5,
      };

      const expectedRecord = {
        id: 'record-123',
        userId,
        height: 175.5,
        weight: null,
        bloodType: null,
        chronicDiseases: null,
        allergies: null,
        familyHistory: null,
        documents: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.healthRecord.create.mockResolvedValue(expectedRecord);

      const result = await service.createHealthRecord(userId, createDto);

      expect(result).toEqual(expectedRecord);
    });
  });

  describe('getHealthRecord', () => {
    it('应该成功获取患者本人的健康档案', async () => {
      const userId = 'user-123';
      const currentUserId = 'user-123';
      const currentUserRole = 'PATIENT';

      const expectedRecord = {
        id: 'record-123',
        userId,
        height: 175.5,
        weight: 70.2,
        bloodType: 'A',
        chronicDiseases: ['高血压'],
        allergies: ['青霉素'],
        familyHistory: ['家族有高血压史'],
        documents: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.healthRecord.findUnique.mockResolvedValue(expectedRecord);

      const result = await service.getHealthRecord(userId, currentUserId, currentUserRole);

      expect(result).toEqual(expectedRecord);
      expect(mockPrismaService.healthRecord.findUnique).toHaveBeenCalledWith({
        where: { userId },
      });
    });

    it('应该允许医生访问其管理的患者健康档案', async () => {
      const userId = 'patient-123';
      const currentUserId = 'doctor-123';
      const currentUserRole = 'DOCTOR';

      const expectedRecord = {
        id: 'record-123',
        userId,
        height: 175.5,
        weight: 70.2,
        bloodType: 'A',
        chronicDiseases: ['高血压'],
        allergies: null,
        familyHistory: null,
        documents: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.doctorPatientRelation.findFirst.mockResolvedValue({
        id: 'relation-123',
        doctorId: currentUserId,
        patientId: userId,
        status: 'ACTIVE',
      });

      mockPrismaService.healthRecord.findUnique.mockResolvedValue(expectedRecord);

      const result = await service.getHealthRecord(userId, currentUserId, currentUserRole);

      expect(result).toEqual(expectedRecord);
      expect(mockPrismaService.doctorPatientRelation.findFirst).toHaveBeenCalledWith({
        where: {
          doctorId: currentUserId,
          patientId: userId,
          status: 'ACTIVE',
        },
      });
    });

    it('应该拒绝患者访问他人的健康档案', async () => {
      const userId = 'user-456';
      const currentUserId = 'user-123';
      const currentUserRole = 'PATIENT';

      await expect(service.getHealthRecord(userId, currentUserId, currentUserRole)).rejects.toThrow(
        ForbiddenException,
      );

      expect(mockPrismaService.healthRecord.findUnique).not.toHaveBeenCalled();
    });

    it('应该拒绝医生访问非其管理的患者健康档案', async () => {
      const userId = 'patient-456';
      const currentUserId = 'doctor-123';
      const currentUserRole = 'DOCTOR';

      mockPrismaService.doctorPatientRelation.findFirst.mockResolvedValue(null);

      await expect(service.getHealthRecord(userId, currentUserId, currentUserRole)).rejects.toThrow(
        ForbiddenException,
      );

      expect(mockPrismaService.healthRecord.findUnique).not.toHaveBeenCalled();
    });

    it('应该在健康档案不存在时抛出 NotFoundException', async () => {
      const userId = 'user-123';
      const currentUserId = 'user-123';
      const currentUserRole = 'PATIENT';

      mockPrismaService.healthRecord.findUnique.mockResolvedValue(null);

      await expect(service.getHealthRecord(userId, currentUserId, currentUserRole)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateHealthRecord', () => {
    it('应该成功更新患者本人的健康档案', async () => {
      const userId = 'user-123';
      const currentUserId = 'user-123';
      const currentUserRole = 'PATIENT';
      const updateDto: UpdateHealthRecordDto = {
        height: 176.0,
        weight: 71.0,
      };

      const existingRecord = {
        id: 'record-123',
        userId,
        height: 175.5,
        weight: 70.2,
        bloodType: 'A',
        chronicDiseases: ['高血压'],
        allergies: null,
        familyHistory: null,
        documents: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedRecord = {
        ...existingRecord,
        height: 176.0,
        weight: 71.0,
        updatedAt: new Date(),
      };

      mockPrismaService.healthRecord.findUnique.mockResolvedValue(existingRecord);
      mockPrismaService.healthRecord.update.mockResolvedValue(updatedRecord);

      const result = await service.updateHealthRecord(
        userId,
        updateDto,
        currentUserId,
        currentUserRole,
      );

      expect(result).toEqual(updatedRecord);
      expect(mockPrismaService.healthRecord.update).toHaveBeenCalledWith({
        where: { userId },
        data: updateDto,
      });
    });

    it('应该拒绝患者更新他人的健康档案', async () => {
      const userId = 'user-456';
      const currentUserId = 'user-123';
      const currentUserRole = 'PATIENT';
      const updateDto: UpdateHealthRecordDto = {
        height: 176.0,
      };

      await expect(
        service.updateHealthRecord(userId, updateDto, currentUserId, currentUserRole),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrismaService.healthRecord.update).not.toHaveBeenCalled();
    });
  });

  describe('addDocument', () => {
    it('应该成功添加医疗文档到健康档案', async () => {
      const userId = 'user-123';
      const currentUserId = 'user-123';
      const currentUserRole = 'PATIENT';
      const file = {
        buffer: Buffer.from('fake-pdf-content'),
        originalname: '体检报告.pdf',
        mimetype: 'application/pdf',
        size: 2048576,
      };

      const fileUrl =
        'https://minio.example.com/health-mgmt/health_docs/user-123/1234567890_abc123.pdf';

      const existingRecord = {
        id: 'record-123',
        userId,
        height: 175.5,
        weight: 70.2,
        bloodType: 'A',
        chronicDiseases: ['高血压'],
        allergies: null,
        familyHistory: null,
        documents: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const newDocument = {
        url: fileUrl,
        type: file.mimetype,
        name: file.originalname,
        size: file.size,
        uploadDate: expect.any(String),
      };

      const updatedRecord = {
        ...existingRecord,
        documents: [newDocument],
        updatedAt: new Date(),
      };

      mockPrismaService.healthRecord.findUnique.mockResolvedValue(existingRecord);
      mockFileStorageService.uploadHealthDocument.mockResolvedValue(fileUrl);
      mockPrismaService.healthRecord.update.mockResolvedValue(updatedRecord);

      const result = await service.addDocument(userId, file, currentUserId, currentUserRole);

      expect(result).toEqual(updatedRecord);
      expect(mockFileStorageService.uploadHealthDocument).toHaveBeenCalledWith(
        file.buffer,
        userId,
        file.originalname,
      );
      expect(mockPrismaService.healthRecord.update).toHaveBeenCalledWith({
        where: { userId },
        data: {
          documents: [newDocument],
        },
      });
    });

    it('应该在已有文档的基础上追加新文档', async () => {
      const userId = 'user-123';
      const currentUserId = 'user-123';
      const currentUserRole = 'PATIENT';
      const file = {
        buffer: Buffer.from('fake-pdf-content'),
        originalname: '血常规报告.pdf',
        mimetype: 'application/pdf',
        size: 1024000,
      };

      const fileUrl =
        'https://minio.example.com/health-mgmt/health_docs/user-123/1234567890_def456.pdf';

      const existingDocument = {
        url: 'https://minio.example.com/health-mgmt/health_docs/user-123/old-doc.pdf',
        type: 'application/pdf',
        name: '体检报告.pdf',
        size: 2048576,
        uploadDate: '2025-12-20T10:00:00Z',
      };

      const existingRecord = {
        id: 'record-123',
        userId,
        height: 175.5,
        weight: 70.2,
        bloodType: 'A',
        chronicDiseases: ['高血压'],
        allergies: null,
        familyHistory: null,
        documents: [existingDocument],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const newDocument = {
        url: fileUrl,
        type: file.mimetype,
        name: file.originalname,
        size: file.size,
        uploadDate: expect.any(String),
      };

      const updatedRecord = {
        ...existingRecord,
        documents: [existingDocument, newDocument],
        updatedAt: new Date(),
      };

      mockPrismaService.healthRecord.findUnique.mockResolvedValue(existingRecord);
      mockFileStorageService.uploadHealthDocument.mockResolvedValue(fileUrl);
      mockPrismaService.healthRecord.update.mockResolvedValue(updatedRecord);

      const result = await service.addDocument(userId, file, currentUserId, currentUserRole);

      expect(result).toEqual(updatedRecord);
      expect(mockPrismaService.healthRecord.update).toHaveBeenCalledWith({
        where: { userId },
        data: {
          documents: [existingDocument, newDocument],
        },
      });
    });

    it('应该拒绝患者上传文档到他人的健康档案', async () => {
      const userId = 'user-456';
      const currentUserId = 'user-123';
      const currentUserRole = 'PATIENT';
      const file = {
        buffer: Buffer.from('fake-pdf-content'),
        originalname: '体检报告.pdf',
        mimetype: 'application/pdf',
        size: 2048576,
      };

      await expect(
        service.addDocument(userId, file, currentUserId, currentUserRole),
      ).rejects.toThrow(ForbiddenException);

      expect(mockFileStorageService.uploadHealthDocument).not.toHaveBeenCalled();
      expect(mockPrismaService.healthRecord.update).not.toHaveBeenCalled();
    });
  });
});
