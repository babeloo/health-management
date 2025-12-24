import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { CheckInType, RiskLevel as PrismaRiskLevel } from '../generated/prisma/client';
import { HealthService } from './health.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { FileStorageService } from '../common/storage/file-storage.service';
import { InfluxService } from '../common/influx/influx.service';
import { RiskCalculationService } from './services/risk-calculation.service';
import { PointsRulesService } from '../points/services/points-rules.service';
import { StreakCalculationService } from '../points/services/streak-calculation.service';
import { PointsService } from '../points/points.service';
import { AuditService } from '../audit/audit.service';
import { CreateHealthRecordDto } from './dto/create-health-record.dto';
import { UpdateHealthRecordDto } from './dto/update-health-record.dto';
import { CreateCheckInDto } from './dto/create-check-in.dto';
import {
  CreateRiskAssessmentDto,
  RiskAssessmentType,
  ExerciseFrequency,
  FamilyHistory,
  Gender,
  RiskLevel,
} from './dto/risk-assessment.dto';

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
    user: {
      findUnique: jest.fn(),
    },
    riskAssessment: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
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

  const mockRiskCalculationService = {
    calculateDiabetesRisk: jest.fn(),
    calculateStrokeRisk: jest.fn(),
  };

  const mockPointsRulesService = {
    calculateCheckInPoints: jest.fn().mockReturnValue(10),
  };

  const mockStreakCalculationService = {
    calculateStreakDays: jest.fn().mockResolvedValue(1),
    hasTodayBonusTriggered: jest.fn().mockResolvedValue(false),
    recordStreakBonus: jest.fn().mockResolvedValue(undefined),
  };

  const mockPointsService = {
    addPoints: jest.fn().mockResolvedValue(undefined),
    earnPoints: jest.fn().mockResolvedValue(undefined),
  };

  const mockAuditService = {
    logHealthDataAccess: jest.fn().mockResolvedValue(undefined),
    logUserManagement: jest.fn().mockResolvedValue(undefined),
    logLogin: jest.fn().mockResolvedValue(undefined),
    logLogout: jest.fn().mockResolvedValue(undefined),
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
        {
          provide: RiskCalculationService,
          useValue: mockRiskCalculationService,
        },
        {
          provide: PointsRulesService,
          useValue: mockPointsRulesService,
        },
        {
          provide: StreakCalculationService,
          useValue: mockStreakCalculationService,
        },
        {
          provide: PointsService,
          useValue: mockPointsService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
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
        bonusPoints: 0,
        streakDays: 1,
        totalPoints: 10,
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
        bonusPoints: 0,
        streakDays: 1,
        totalPoints: 10,
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
        bonusPoints: 0,
        streakDays: 1,
        totalPoints: 10,
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

  // ==================== 风险评估功能测试 ====================

  describe('createRiskAssessment', () => {
    it('应该成功创建糖尿病风险评估', async () => {
      const userId = 'user-123';
      const createDto: CreateRiskAssessmentDto = {
        user_id: 'user-123',
        assessment_type: RiskAssessmentType.DIABETES,
        diabetes_questionnaire: {
          age: 45,
          bmi: 26.5,
          waist_circumference: 95,
          exercise_frequency: ExerciseFrequency.RARELY,
          high_sugar_diet: true,
          hypertension: true,
          blood_glucose_history: false,
          family_history: FamilyHistory.FIRST,
        },
        include_device_data: false,
      };

      const riskCalculationResult = {
        score: 75,
        level: RiskLevel.HIGH,
        recommendations: ['建议定期检查血糖', '增加运动量'],
        details: {
          age: { score: 2, description: '45岁' },
          bmi: { score: 1, description: 'BMI 26.5' },
        },
      };

      const expectedAssessment = {
        id: 'assessment-123',
        userId,
        type: RiskAssessmentType.DIABETES,
        riskLevel: PrismaRiskLevel.HIGH, // 数据库使用大写枚举
        riskScore: 75,
        questionnaireData: createDto.diabetes_questionnaire,
        deviceData: null,
        resultDetails: riskCalculationResult.details,
        aiRecommendations: '建议定期检查血糖\n增加运动量',
        assessedAt: expect.any(Date),
      };

      mockPrismaService.user.findUnique.mockResolvedValue({ id: userId });
      mockRiskCalculationService.calculateDiabetesRisk.mockReturnValue(riskCalculationResult);
      mockPrismaService.riskAssessment.create.mockResolvedValue(expectedAssessment);

      const result = await service.createRiskAssessment(createDto);

      expect(result).toEqual(expectedAssessment);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user-123' } });
      expect(mockRiskCalculationService.calculateDiabetesRisk).toHaveBeenCalledWith(
        createDto.diabetes_questionnaire,
      );
      expect(mockPrismaService.riskAssessment.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          type: RiskAssessmentType.DIABETES,
          riskLevel: PrismaRiskLevel.HIGH,
          riskScore: 75,
          questionnaireData: createDto.diabetes_questionnaire,
          deviceData: undefined,
          resultDetails: riskCalculationResult.details,
          aiRecommendations: '建议定期检查血糖\n增加运动量',
        },
      });
    });

    it('应该成功创建卒中风险评估', async () => {
      const userId = 'user-456';
      const createDto: CreateRiskAssessmentDto = {
        user_id: 'user-456',
        assessment_type: RiskAssessmentType.STROKE,
        stroke_questionnaire: {
          age: 60,
          gender: Gender.FEMALE,
          systolic_bp: 145,
          has_diabetes: true,
          smoking: true,
          cvd_history: false,
          atrial_fibrillation: false,
        },
        include_device_data: false,
      };

      const riskCalculationResult = {
        score: 85,
        level: RiskLevel.HIGH,
        recommendations: ['立即戒烟', '控制血压'],
        details: {
          smoking: { score: 3, description: '当前吸烟' },
          systolicBP: { score: 2, description: '收缩压 145 mmHg' },
        },
      };

      const expectedAssessment = {
        id: 'assessment-456',
        userId,
        type: RiskAssessmentType.STROKE,
        riskLevel: PrismaRiskLevel.HIGH,
        riskScore: 85,
        questionnaireData: createDto.stroke_questionnaire,
        deviceData: null,
        resultDetails: riskCalculationResult.details,
        aiRecommendations: '立即戒烟\n控制血压',
        assessedAt: expect.any(Date),
      };

      mockPrismaService.user.findUnique.mockResolvedValue({ id: userId });
      mockRiskCalculationService.calculateStrokeRisk.mockReturnValue(riskCalculationResult);
      mockPrismaService.riskAssessment.create.mockResolvedValue(expectedAssessment);

      const result = await service.createRiskAssessment(createDto);

      expect(result).toEqual(expectedAssessment);
      expect(mockRiskCalculationService.calculateStrokeRisk).toHaveBeenCalledWith(
        createDto.stroke_questionnaire,
      );
    });

    it('应该在用户不存在时抛出 NotFoundException', async () => {
      const createDto: CreateRiskAssessmentDto = {
        user_id: 'non-existing-user-999',
        assessment_type: RiskAssessmentType.DIABETES,
        diabetes_questionnaire: {
          age: 45,
          bmi: 26.5,
          waist_circumference: 95,
          exercise_frequency: ExerciseFrequency.WEEKLY,
          high_sugar_diet: false,
          hypertension: false,
          blood_glucose_history: false,
          family_history: FamilyHistory.NONE,
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.createRiskAssessment(createDto)).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.riskAssessment.create).not.toHaveBeenCalled();
    });

    it('应该在缺少问卷数据时抛出 BadRequestException', async () => {
      const createDto: CreateRiskAssessmentDto = {
        user_id: 'user-123',
        assessment_type: RiskAssessmentType.DIABETES,
        // 缺少 diabetes_questionnaire
      };

      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-123' });

      await expect(service.createRiskAssessment(createDto)).rejects.toThrow(BadRequestException);
    });

    it('应该包含设备数据（includeDeviceData=true）', async () => {
      const userId = 'user-789';
      const createDto: CreateRiskAssessmentDto = {
        user_id: 'user-789',
        assessment_type: RiskAssessmentType.DIABETES,
        diabetes_questionnaire: {
          age: 50,
          bmi: 28.0,
          waist_circumference: 100,
          exercise_frequency: ExerciseFrequency.RARELY,
          high_sugar_diet: true,
          hypertension: true,
          blood_glucose_history: true,
          family_history: FamilyHistory.FIRST,
        },
        include_device_data: true,
      };

      const deviceDataFromInflux = {
        bloodPressure: [
          { systolic: 140, diastolic: 90, timestamp: '2025-12-20' },
          { systolic: 142, diastolic: 92, timestamp: '2025-12-21' },
        ],
        bloodSugar: [
          { value: 6.5, timing: 'fasting', timestamp: '2025-12-20' },
          { value: 7.2, timing: 'after_meal', timestamp: '2025-12-21' },
        ],
      };

      const riskCalculationResult = {
        score: 80,
        level: RiskLevel.HIGH,
        recommendations: ['建议定期检查血糖', '控制饮食'],
        details: {
          bmi: { score: 2, description: 'BMI 28.0' },
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue({ id: userId });
      mockInfluxService.queryBloodPressure.mockResolvedValue(deviceDataFromInflux.bloodPressure);
      mockInfluxService.queryBloodSugar.mockResolvedValue(deviceDataFromInflux.bloodSugar);
      mockRiskCalculationService.calculateDiabetesRisk.mockReturnValue(riskCalculationResult);
      mockPrismaService.riskAssessment.create.mockResolvedValue({
        id: 'assessment-789',
        userId,
        type: RiskAssessmentType.DIABETES,
        riskLevel: PrismaRiskLevel.HIGH,
        riskScore: 80,
        deviceData: deviceDataFromInflux,
        resultDetails: riskCalculationResult.details,
        aiRecommendations: '建议定期检查血糖\n控制饮食',
        assessedAt: expect.any(Date),
      });

      const result = await service.createRiskAssessment(createDto);

      expect(result.deviceData).toEqual(deviceDataFromInflux);
      expect(mockInfluxService.queryBloodSugar).toHaveBeenCalled();
    });
  });

  describe('getRiskAssessments', () => {
    it('应该成功查询评估列表（无筛选条件）', async () => {
      const userId = 'user-123';
      const query = {
        page: 1,
        limit: 20,
      };

      const mockAssessments = [
        {
          id: 'assessment-1',
          userId,
          type: RiskAssessmentType.DIABETES,
          riskLevel: PrismaRiskLevel.MEDIUM,
          riskScore: 60,
          assessedAt: new Date('2025-12-20'),
          createdAt: new Date(),
        },
        {
          id: 'assessment-2',
          userId,
          type: RiskAssessmentType.STROKE,
          riskLevel: PrismaRiskLevel.LOW,
          riskScore: 30,
          assessedAt: new Date('2025-12-15'),
          createdAt: new Date(),
        },
      ];

      mockPrismaService.riskAssessment.count.mockResolvedValue(2);
      mockPrismaService.riskAssessment.findMany.mockResolvedValue(mockAssessments);

      const result = await service.getRiskAssessments(userId, query);

      expect(result.items).toEqual(mockAssessments);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('应该按评估类型筛选', async () => {
      const userId = 'user-123';
      const query = {
        assessment_type: RiskAssessmentType.DIABETES,
        page: 1,
        limit: 20,
      };

      const mockAssessments = [
        {
          id: 'assessment-1',
          userId,
          type: RiskAssessmentType.DIABETES,
          riskLevel: PrismaRiskLevel.HIGH,
          riskScore: 75,
          assessedAt: new Date(),
        },
      ];

      mockPrismaService.riskAssessment.count.mockResolvedValue(1);
      mockPrismaService.riskAssessment.findMany.mockResolvedValue(mockAssessments);

      const result = await service.getRiskAssessments(userId, query);

      expect(result.items).toHaveLength(1);
      expect(mockPrismaService.riskAssessment.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          type: RiskAssessmentType.DIABETES,
        },
        orderBy: { assessedAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });

    it('应该按风险等级筛选', async () => {
      const userId = 'user-123';
      const query = {
        risk_level: RiskLevel.HIGH,
        page: 1,
        limit: 20,
      };

      mockPrismaService.riskAssessment.count.mockResolvedValue(0);
      mockPrismaService.riskAssessment.findMany.mockResolvedValue([]);

      await service.getRiskAssessments(userId, query);

      expect(mockPrismaService.riskAssessment.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          riskLevel: RiskLevel.HIGH,
        },
        orderBy: { assessedAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });

    it('应该按日期范围筛选', async () => {
      const userId = 'user-123';
      const query = {
        start_date: '2025-12-01',
        end_date: '2025-12-31',
        page: 1,
        limit: 20,
      };

      mockPrismaService.riskAssessment.count.mockResolvedValue(0);
      mockPrismaService.riskAssessment.findMany.mockResolvedValue([]);

      await service.getRiskAssessments(userId, query);

      expect(mockPrismaService.riskAssessment.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          assessedAt: {
            gte: new Date('2025-12-01'),
            lte: new Date('2025-12-31'),
          },
        },
        orderBy: { assessedAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });

    it('应该正确处理分页', async () => {
      const userId = 'user-123';
      const query = {
        page: 2,
        limit: 10,
      };

      mockPrismaService.riskAssessment.count.mockResolvedValue(25);
      mockPrismaService.riskAssessment.findMany.mockResolvedValue([]);

      const result = await service.getRiskAssessments(userId, query);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(mockPrismaService.riskAssessment.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { assessedAt: 'desc' },
        skip: 10,
        take: 10,
      });
    });

    it('应该在用户无评估时返回空列表', async () => {
      const userId = 'user-without-assessment';
      const query = { page: 1, limit: 20 };

      mockPrismaService.riskAssessment.count.mockResolvedValue(0);
      mockPrismaService.riskAssessment.findMany.mockResolvedValue([]);

      const result = await service.getRiskAssessments(userId, query);

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('compareRiskAssessments', () => {
    it('应该成功对比多次评估', async () => {
      const userId = 'user-123';
      const dto = {
        assessment_type: RiskAssessmentType.DIABETES,
        count: 3,
      };

      const mockAssessments = [
        {
          id: 'assessment-3',
          assessedAt: new Date('2025-12-22'),
          riskLevel: PrismaRiskLevel.HIGH,
          riskScore: 80,
        },
        {
          id: 'assessment-2',
          assessedAt: new Date('2025-12-15'),
          riskLevel: PrismaRiskLevel.MEDIUM,
          riskScore: 60,
        },
        {
          id: 'assessment-1',
          assessedAt: new Date('2025-12-01'),
          riskLevel: PrismaRiskLevel.LOW,
          riskScore: 40,
        },
      ];

      mockPrismaService.riskAssessment.findMany.mockResolvedValue(mockAssessments);

      const result = await service.compareRiskAssessments(userId, dto);

      expect(result.assessmentType).toBe(RiskAssessmentType.DIABETES);
      expect(result.comparisons).toHaveLength(3);
      expect(result.trend).toBe('increased');
      expect(result.avgScore).toBe(60);
      expect(result.maxScore).toBe(80);
      expect(result.minScore).toBe(40);
    });

    it('应该正确计算趋势（decreased）', async () => {
      const userId = 'user-123';
      const dto = {
        assessment_type: RiskAssessmentType.STROKE,
        count: 3,
      };

      const mockAssessments = [
        {
          id: '1',
          assessedAt: new Date('2025-12-22'),
          riskLevel: PrismaRiskLevel.LOW,
          riskScore: 30,
        },
        {
          id: '2',
          assessedAt: new Date('2025-12-15'),
          riskLevel: PrismaRiskLevel.MEDIUM,
          riskScore: 55,
        },
        {
          id: '3',
          assessedAt: new Date('2025-12-01'),
          riskLevel: PrismaRiskLevel.HIGH,
          riskScore: 75,
        },
      ];

      mockPrismaService.riskAssessment.findMany.mockResolvedValue(mockAssessments);

      const result = await service.compareRiskAssessments(userId, dto);

      expect(result.trend).toBe('decreased');
    });

    it('应该正确计算趋势（stable）', async () => {
      const userId = 'user-123';
      const dto = {
        assessment_type: RiskAssessmentType.DIABETES,
        count: 3,
      };

      const mockAssessments = [
        {
          id: '1',
          assessedAt: new Date('2025-12-22'),
          riskLevel: PrismaRiskLevel.MEDIUM,
          riskScore: 60,
        },
        {
          id: '2',
          assessedAt: new Date('2025-12-15'),
          riskLevel: PrismaRiskLevel.MEDIUM,
          riskScore: 62,
        },
        {
          id: '3',
          assessedAt: new Date('2025-12-01'),
          riskLevel: PrismaRiskLevel.MEDIUM,
          riskScore: 58,
        },
      ];

      mockPrismaService.riskAssessment.findMany.mockResolvedValue(mockAssessments);

      const result = await service.compareRiskAssessments(userId, dto);

      expect(result.trend).toBe('stable');
    });

    it('应该正确计算统计信息', async () => {
      const userId = 'user-123';
      const dto = {
        assessment_type: RiskAssessmentType.DIABETES,
        count: 4,
      };

      const mockAssessments = [
        { id: '1', assessedAt: new Date(), riskLevel: PrismaRiskLevel.HIGH, riskScore: 80 },
        { id: '2', assessedAt: new Date(), riskLevel: PrismaRiskLevel.HIGH, riskScore: 70 },
        { id: '3', assessedAt: new Date(), riskLevel: PrismaRiskLevel.MEDIUM, riskScore: 50 },
        { id: '4', assessedAt: new Date(), riskLevel: PrismaRiskLevel.LOW, riskScore: 20 },
      ];

      mockPrismaService.riskAssessment.findMany.mockResolvedValue(mockAssessments);

      const result = await service.compareRiskAssessments(userId, dto);

      expect(result.avgScore).toBe(55);
      expect(result.maxScore).toBe(80);
      expect(result.minScore).toBe(20);
    });

    it('应该在评估不足 2 次时抛出 BadRequestException', async () => {
      const userId = 'user-123';
      const dto = {
        assessment_type: RiskAssessmentType.DIABETES,
        count: 3,
      };

      mockPrismaService.riskAssessment.findMany.mockResolvedValue([
        { id: '1', assessedAt: new Date(), riskLevel: PrismaRiskLevel.MEDIUM, riskScore: 60 },
      ]);

      await expect(service.compareRiskAssessments(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('应该在用户无评估时抛出 BadRequestException', async () => {
      const userId = 'user-without-assessment';
      const dto = {
        assessment_type: RiskAssessmentType.DIABETES,
        count: 3,
      };

      mockPrismaService.riskAssessment.findMany.mockResolvedValue([]);

      await expect(service.compareRiskAssessments(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
