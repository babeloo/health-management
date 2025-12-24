/* eslint-disable import/no-extraneous-dependencies */
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RegisterDto, LoginDto } from './dto';
import { Role } from './enums/role.enum';

// Mock bcrypt 模块
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockAuditService = {
    logHealthDataAccess: jest.fn().mockResolvedValue(undefined),
    logUserManagement: jest.fn().mockResolvedValue(undefined),
    logLogin: jest.fn().mockResolvedValue(undefined),
    logLogout: jest.fn().mockResolvedValue(undefined),
  };

  const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    // 重置所有 mock
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      username: 'testuser',
      password: 'Test@123456',
      email: 'test@example.com',
      phone: '13800138000',
      role: Role.PATIENT,
      fullName: '测试用户',
    };

    it('应该成功注册新用户', async () => {
      // Mock 数据
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user-id-123',
        username: registerDto.username,
        email: registerDto.email,
        role: registerDto.role,
        fullName: registerDto.fullName,
      });
      mockConfigService.get.mockReturnValue('test-secret');
      mockJwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');

      // 执行
      const result = await service.register(registerDto);

      // 验证
      expect(result).toHaveProperty('accessToken', 'access-token');
      expect(result).toHaveProperty('refreshToken', 'refresh-token');
      expect(result).toHaveProperty('tokenType', 'Bearer');
      expect(result.user).toHaveProperty('username', registerDto.username);
      expect(mockPrismaService.user.create).toHaveBeenCalledTimes(1);
    });

    it('应该在用户名已存在时抛出 ConflictException', async () => {
      // Mock 用户名已存在
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'existing-user-id',
        username: registerDto.username,
      });

      // 执行并验证
      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });

    it('应该正确加密密码', async () => {
      // Mock 数据
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      const hashedPassword = '$2b$10$mockedHashedPassword1234567890123456789012345678901234';
      mockedBcrypt.hash.mockResolvedValue(hashedPassword as never);

      const createSpy = mockPrismaService.user.create.mockResolvedValue({
        id: 'user-id-123',
        username: registerDto.username,
        email: registerDto.email,
        role: registerDto.role,
        fullName: registerDto.fullName,
      });
      mockConfigService.get.mockReturnValue('test-secret');
      mockJwtService.sign.mockReturnValue('token');

      // 执行
      await service.register(registerDto);

      // 验证密码已加密
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      const createCall = createSpy.mock.calls[0][0];
      expect(createCall.data.password).toBe(hashedPassword);
      expect(createCall.data.password).not.toBe(registerDto.password);
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      username: 'testuser',
      password: 'Test@123456',
    };

    const mockUser = {
      id: 'user-id-123',
      username: 'testuser',
      password: '$2b$10$hashedpassword',
      email: 'test@example.com',
      role: Role.PATIENT,
      fullName: '测试用户',
      status: 'ACTIVE',
    };

    it('应该成功登录并返回 Token', async () => {
      // Mock 数据
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockConfigService.get.mockReturnValue('test-secret');
      mockJwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');
      mockedBcrypt.compare.mockResolvedValue(true as never);

      // 执行
      const result = await service.login(loginDto);

      // 验证
      expect(result).toHaveProperty('accessToken', 'access-token');
      expect(result).toHaveProperty('refreshToken', 'refresh-token');
      expect(result.user).toHaveProperty('username', loginDto.username);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { lastLoginAt: expect.any(Date) },
      });
    });

    it('应该在用户不存在时抛出 UnauthorizedException', async () => {
      // Mock 用户不存在
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // 执行并验证
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('应该在密码错误时抛出 UnauthorizedException', async () => {
      // Mock 用户存在但密码错误
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      // 执行并验证
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('应该在账号被禁用时抛出 UnauthorizedException', async () => {
      // Mock 用户存在但状态为 INACTIVE
      const inactiveUser = { ...mockUser, status: 'INACTIVE' };
      mockPrismaService.user.findUnique.mockResolvedValue(inactiveUser);
      mockedBcrypt.compare.mockResolvedValue(true as never);

      // 执行并验证
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    const mockUser = {
      id: 'user-id-123',
      username: 'testuser',
      email: 'test@example.com',
      role: Role.PATIENT,
      fullName: '测试用户',
      status: 'ACTIVE',
    };

    it('应该成功刷新 Token', async () => {
      // Mock 数据
      const refreshToken = 'valid-refresh-token';
      mockJwtService.verify.mockReturnValue({ sub: mockUser.id });
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockConfigService.get.mockReturnValue('test-secret');
      // 注意：这里需要使用 mockReturnValue 而不是 mockReturnValueOnce，因为 sign 会被调用两次
      mockJwtService.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');

      // 执行
      const result = await service.refreshToken(refreshToken);

      // 验证
      expect(result).toHaveProperty('accessToken', 'new-access-token');
      expect(result).toHaveProperty('refreshToken', 'new-refresh-token');
      expect(mockJwtService.verify).toHaveBeenCalledWith(refreshToken, {
        secret: 'test-secret',
      });
    });

    it('应该在 Refresh Token 无效时抛出 UnauthorizedException', async () => {
      // Mock Token 验证失败
      const invalidToken = 'invalid-refresh-token';
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // 执行并验证
      await expect(service.refreshToken(invalidToken)).rejects.toThrow(UnauthorizedException);
    });

    it('应该在用户不存在时抛出 UnauthorizedException', async () => {
      // Mock Token 有效但用户不存在
      const refreshToken = 'valid-refresh-token';
      mockJwtService.verify.mockReturnValue({ sub: 'non-existent-user-id' });
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // 执行并验证
      await expect(service.refreshToken(refreshToken)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('密码加密和验证', () => {
    // 这些测试使用真实的 bcrypt 实现
    const realBcrypt = jest.requireActual('bcrypt');

    it('应该正确加密密码', async () => {
      const password = 'Test@123456';
      const hashedPassword = await realBcrypt.hash(password, 10);

      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword).toMatch(/^\$2[aby]\$.{56}$/);
    });

    it('应该正确验证密码', async () => {
      const password = 'Test@123456';
      const hashedPassword = await realBcrypt.hash(password, 10);

      const isValid = await realBcrypt.compare(password, hashedPassword);
      expect(isValid).toBe(true);

      const isInvalid = await realBcrypt.compare('WrongPassword', hashedPassword);
      expect(isInvalid).toBe(false);
    });
  });
});
