import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { CheckInType } from '../generated/prisma/client';
import { HealthService } from './health.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { FileStorageService } from '../common/storage/file-storage.service';
import { InfluxService } from '../common/influx/influx.service';
import { CreateHealthRecordDto } from './dto/create-health-record.dto';
import { UpdateHealthRecordDto } from './dto/update-health-record.dto';
import { CreateCheckInDto } from './dto/create-check-in.dto';

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
    checkIn: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockFileStorageService = {
    uploadHealthDocument: jest.fn(),
  };

  const mockInfluxService = {
    writeBloodPressure: jest.fn().mockResolvedValue(undefined),
    writeBloodSugar: jest.fn().mockResolvedValue(undefined),
    queryBloodPressure: jest.fn().mockResolvedValue([]),
    queryBloodSugar: jest.fn().mockResolvedValue([]),
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
        {
          provide: InfluxService,
          useValue: mockInfluxService,
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

  // ==================== 打卡功能测试 ====================

  describe('createCheckIn', () => {
    it('应该成功创建血压打卡记录', async () => {
      const userId = 'user-123';
      const createDto: CreateCheckInDto = {
        type: CheckInType.BLOOD_PRESSURE,
        data: {
          systolic: 120,
          diastolic: 80,
          pulse: 72,
        },
        notes: '今日状态良好',
      };

      const expectedCheckIn = {
        id: 'checkin-123',
        userId,
        type: CheckInType.BLOOD_PRESSURE,
        data: createDto.data,
        notes: createDto.notes,
        pointsEarned: 10,
        checkInDate: expect.any(Date),
        createdAt: new Date(),
      };

      mockPrismaService.checkIn.findUnique.mockResolvedValue(null);
      mockPrismaService.checkIn.create.mockResolvedValue(expectedCheckIn);

      const result = await service.createCheckIn(userId, createDto);

      expect(result).toEqual(expectedCheckIn);
      expect(mockPrismaService.checkIn.create).toHaveBeenCalledWith({
        data: {
          userId,
          type: CheckInType.BLOOD_PRESSURE,
          data: createDto.data,
          notes: createDto.notes,
          pointsEarned: 10,
          checkInDate: expect.any(Date),
        },
      });
    });

    it('应该成功创建血糖打卡记录', async () => {
      const userId = 'user-123';
      const createDto: CreateCheckInDto = {
        type: CheckInType.BLOOD_SUGAR,
        data: {
          value: 5.6,
          timing: 'fasting',
        },
      };

      const expectedCheckIn = {
        id: 'checkin-124',
        userId,
        type: CheckInType.BLOOD_SUGAR,
        data: createDto.data,
        notes: null,
        pointsEarned: 10,
        checkInDate: expect.any(Date),
        createdAt: new Date(),
      };

      mockPrismaService.checkIn.findFirst.mockResolvedValue(null);
      mockPrismaService.checkIn.create.mockResolvedValue(expectedCheckIn);

      const result = await service.createCheckIn(userId, createDto);

      expect(result).toEqual(expectedCheckIn);
      expect(result.pointsEarned).toBe(10);
    });

    it('应该成功创建用药打卡记录', async () => {
      const userId = 'user-123';
      const createDto: CreateCheckInDto = {
        type: CheckInType.MEDICATION,
        data: {
          medication: '阿司匹林',
          dosage: '100mg',
          taken: true,
        },
      };

      const expectedCheckIn = {
        id: 'checkin-125',
        userId,
        type: CheckInType.MEDICATION,
        data: createDto.data,
        notes: null,
        pointsEarned: 5,
        checkInDate: expect.any(Date),
        createdAt: new Date(),
      };

      mockPrismaService.checkIn.findFirst.mockResolvedValue(null);
      mockPrismaService.checkIn.create.mockResolvedValue(expectedCheckIn);

      const result = await service.createCheckIn(userId, createDto);

      expect(result).toEqual(expectedCheckIn);
      expect(result.pointsEarned).toBe(5);
    });

    it('应该拒绝打卡未来日期', async () => {
      const userId = 'user-123';
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2); // 确保是未来日期

      const createDto: CreateCheckInDto = {
        type: CheckInType.BLOOD_PRESSURE,
        data: {
          systolic: 120,
          diastolic: 80,
        },
        checkInDate: futureDate.toISOString().split('T')[0],
      };

      await expect(service.createCheckIn(userId, createDto)).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.checkIn.create).not.toHaveBeenCalled();
    });

    it('应该拒绝重复打卡（每天每种类型只能打卡一次）', async () => {
      const userId = 'user-123';
      const createDto: CreateCheckInDto = {
        type: CheckInType.BLOOD_PRESSURE,
        data: {
          systolic: 120,
          diastolic: 80,
        },
      };

      const existingCheckIn = {
        id: 'checkin-123',
        userId,
        type: CheckInType.BLOOD_PRESSURE,
        data: { systolic: 115, diastolic: 75 },
        pointsEarned: 10,
        checkInDate: new Date(),
        createdAt: new Date(),
      };

      mockPrismaService.checkIn.findFirst.mockResolvedValue(existingCheckIn);

      await expect(service.createCheckIn(userId, createDto)).rejects.toThrow(ConflictException);
      expect(mockPrismaService.checkIn.create).not.toHaveBeenCalled();
    });

    it('应该拒绝血压数据超出范围', async () => {
      const userId = 'user-123';
      const createDto: CreateCheckInDto = {
        type: CheckInType.BLOOD_PRESSURE,
        data: {
          systolic: 250, // 超出范围
          diastolic: 80,
        },
      };

      await expect(service.createCheckIn(userId, createDto)).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.checkIn.create).not.toHaveBeenCalled();
    });

    it('应该拒绝血糖数据缺少必填字段', async () => {
      const userId = 'user-123';
      const createDto: CreateCheckInDto = {
        type: CheckInType.BLOOD_SUGAR,
        data: {
          value: 5.6,
          // 缺少 timing 字段
        },
      };

      await expect(service.createCheckIn(userId, createDto)).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.checkIn.create).not.toHaveBeenCalled();
    });
  });

  describe('getCheckIns', () => {
    it('应该成功查询打卡记录列表', async () => {
      const userId = 'user-123';
      const query = {
        page: 1,
        limit: 20,
      };

      const mockCheckIns = [
        {
          id: 'checkin-1',
          userId,
          type: CheckInType.BLOOD_PRESSURE,
          data: { systolic: 120, diastolic: 80 },
          pointsEarned: 10,
          checkInDate: new Date('2025-12-22'),
          createdAt: new Date(),
        },
        {
          id: 'checkin-2',
          userId,
          type: CheckInType.BLOOD_SUGAR,
          data: { value: 5.6, timing: 'fasting' },
          pointsEarned: 10,
          checkInDate: new Date('2025-12-21'),
          createdAt: new Date(),
        },
      ];

      mockPrismaService.checkIn.count.mockResolvedValue(2);
      mockPrismaService.checkIn.findMany.mockResolvedValue(mockCheckIns);

      const result = await service.getCheckIns(userId, query);

      expect(result.items).toEqual(mockCheckIns);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('应该支持按类型筛选打卡记录', async () => {
      const userId = 'user-123';
      const query = {
        type: CheckInType.BLOOD_PRESSURE,
        page: 1,
        limit: 20,
      };

      const mockCheckIns = [
        {
          id: 'checkin-1',
          userId,
          type: CheckInType.BLOOD_PRESSURE,
          data: { systolic: 120, diastolic: 80 },
          pointsEarned: 10,
          checkInDate: new Date('2025-12-22'),
          createdAt: new Date(),
        },
      ];

      mockPrismaService.checkIn.count.mockResolvedValue(1);
      mockPrismaService.checkIn.findMany.mockResolvedValue(mockCheckIns);

      const result = await service.getCheckIns(userId, query);

      expect(result.items).toEqual(mockCheckIns);
      expect(mockPrismaService.checkIn.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          type: CheckInType.BLOOD_PRESSURE,
        },
        orderBy: { checkInDate: 'desc' },
        skip: 0,
        take: 20,
      });
    });

    it('应该支持按日期范围筛选打卡记录', async () => {
      const userId = 'user-123';
      const query = {
        startDate: '2025-12-01',
        endDate: '2025-12-31',
        page: 1,
        limit: 20,
      };

      mockPrismaService.checkIn.count.mockResolvedValue(0);
      mockPrismaService.checkIn.findMany.mockResolvedValue([]);

      await service.getCheckIns(userId, query);

      expect(mockPrismaService.checkIn.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          checkInDate: {
            gte: new Date('2025-12-01'),
            lte: new Date('2025-12-31'),
          },
        },
        orderBy: { checkInDate: 'desc' },
        skip: 0,
        take: 20,
      });
    });
  });

  describe('getCheckInTrends', () => {
    it('应该成功计算血压趋势统计数据', async () => {
      const userId = 'user-123';
      const trendQuery = {
        type: CheckInType.BLOOD_PRESSURE,
        startDate: '2025-11-22',
        endDate: '2025-12-22',
      };

      const mockCheckIns = [
        {
          id: 'checkin-1',
          userId,
          type: CheckInType.BLOOD_PRESSURE,
          data: { systolic: 120, diastolic: 80, pulse: 72 },
          pointsEarned: 10,
          checkInDate: new Date('2025-12-20'),
          createdAt: new Date(),
        },
        {
          id: 'checkin-2',
          userId,
          type: CheckInType.BLOOD_PRESSURE,
          data: { systolic: 118, diastolic: 78, pulse: 70 },
          pointsEarned: 10,
          checkInDate: new Date('2025-12-21'),
          createdAt: new Date(),
        },
      ];

      mockPrismaService.checkIn.findMany.mockResolvedValue(mockCheckIns);

      const result = await service.getCheckInTrends(userId, trendQuery);

      expect(result.type).toBe(CheckInType.BLOOD_PRESSURE);
      expect(result.data).toHaveLength(2);
      expect(result.statistics.avgSystolic).toBe(119);
      expect(result.statistics.avgDiastolic).toBe(79);
      expect(result.statistics.maxSystolic).toBe(120);
      expect(result.statistics.minSystolic).toBe(118);
    });

    it('应该成功计算血糖趋势统计数据', async () => {
      const userId = 'user-123';
      const trendQuery = {
        type: CheckInType.BLOOD_SUGAR,
        startDate: '2025-12-01',
        endDate: '2025-12-22',
      };

      const mockCheckIns = [
        {
          id: 'checkin-1',
          userId,
          type: CheckInType.BLOOD_SUGAR,
          data: { value: 5.6, timing: 'fasting' },
          pointsEarned: 10,
          checkInDate: new Date('2025-12-20'),
          createdAt: new Date(),
        },
        {
          id: 'checkin-2',
          userId,
          type: CheckInType.BLOOD_SUGAR,
          data: { value: 6.2, timing: 'after_meal' },
          pointsEarned: 10,
          checkInDate: new Date('2025-12-21'),
          createdAt: new Date(),
        },
      ];

      mockPrismaService.checkIn.findMany.mockResolvedValue(mockCheckIns);

      const result = await service.getCheckInTrends(userId, trendQuery);

      expect(result.type).toBe(CheckInType.BLOOD_SUGAR);
      expect(result.statistics.avgBloodSugar).toBe(5.9);
      expect(result.statistics.maxBloodSugar).toBe(6.2);
      expect(result.statistics.minBloodSugar).toBe(5.6);
    });

    it('应该处理空数据的情况', async () => {
      const userId = 'user-123';
      const trendQuery = {
        type: CheckInType.BLOOD_PRESSURE,
        startDate: '2025-12-01',
        endDate: '2025-12-22',
      };

      mockPrismaService.checkIn.findMany.mockResolvedValue([]);

      const result = await service.getCheckInTrends(userId, trendQuery);

      expect(result.data).toHaveLength(0);
      expect(result.statistics.totalCount).toBe(0);
    });
  });

  describe('getCheckInCalendar', () => {
    it('应该成功生成日历视图数据', async () => {
      const userId = 'user-123';
      const calendarQuery = {
        year: 2025,
        month: 12,
      };

      const mockCheckIns = [
        {
          id: 'checkin-1',
          userId,
          type: CheckInType.BLOOD_PRESSURE,
          data: { systolic: 120, diastolic: 80 },
          pointsEarned: 10,
          checkInDate: new Date('2025-12-01'),
          createdAt: new Date(),
        },
        {
          id: 'checkin-2',
          userId,
          type: CheckInType.MEDICATION,
          data: { medication: '阿司匹林', dosage: '100mg', taken: true },
          pointsEarned: 5,
          checkInDate: new Date('2025-12-01'),
          createdAt: new Date(),
        },
      ];

      mockPrismaService.checkIn.findMany.mockResolvedValue(mockCheckIns);

      const result = await service.getCheckInCalendar(userId, calendarQuery);

      expect(result.year).toBe(2025);
      expect(result.month).toBe(12);
      expect(result.calendar).toHaveLength(1);
      expect(result.calendar[0].date).toBe('2025-12-01');
      expect(result.calendar[0].checkedTypes).toContain(CheckInType.BLOOD_PRESSURE);
      expect(result.calendar[0].checkedTypes).toContain(CheckInType.MEDICATION);
      expect(result.calendar[0].totalPoints).toBe(15);
      expect(result.monthlyStats.totalCheckIns).toBe(2);
      expect(result.monthlyStats.totalPoints).toBe(15);
    });

    it('应该处理空数据的月份', async () => {
      const userId = 'user-123';
      const calendarQuery = {
        year: 2025,
        month: 1,
      };

      mockPrismaService.checkIn.findMany.mockResolvedValue([]);

      const result = await service.getCheckInCalendar(userId, calendarQuery);

      expect(result.calendar).toHaveLength(0);
      expect(result.monthlyStats.totalCheckIns).toBe(0);
      expect(result.monthlyStats.totalPoints).toBe(0);
      expect(result.monthlyStats.completionRate).toBe(0);
    });
  });
});
