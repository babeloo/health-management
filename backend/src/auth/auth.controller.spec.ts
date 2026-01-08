/* eslint-disable import/no-extraneous-dependencies */
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshTokenDto, AuthResponseDto } from './dto';
import { Role } from './enums/role.enum';
import { JwtAuthGuard } from './guards';

// Mock bcrypt 模块以避免 native 模块加载问题
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refreshToken: jest.fn(),
  };

  const mockAuthResponse: AuthResponseDto = {
    accessToken: 'access-token-123',
    refreshToken: 'refresh-token-456',
    tokenType: 'Bearer',
    expiresIn: 900,
    user: {
      id: 'user-id-123',
      username: 'testuser',
      role: Role.PATIENT,
      fullName: '测试用户',
      email: 'test@example.com',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<AuthController>(AuthController);

    // 重置所有 mock
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('应该成功注册用户并返回标准响应格式', async () => {
      // Mock 数据
      const registerDto: RegisterDto = {
        username: 'testuser',
        password: 'Test@123456',
        email: 'test@example.com',
        phone: '13800138000',
        role: Role.PATIENT,
        fullName: '测试用户',
      };

      mockAuthService.register.mockResolvedValue(mockAuthResponse);

      // 执行
      const result = await controller.register(registerDto);

      // 验证
      expect(result).toEqual({
        success: true,
        data: mockAuthResponse,
        message: '注册成功',
      });
      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
      expect(mockAuthService.register).toHaveBeenCalledTimes(1);
    });

    it('应该传递 AuthService 抛出的异常', async () => {
      // Mock 注册失败
      const registerDto: RegisterDto = {
        username: 'existinguser',
        password: 'Test@123456',
        role: Role.PATIENT,
      };

      const error = new Error('用户名已存在');
      mockAuthService.register.mockRejectedValue(error);

      // 执行并验证
      await expect(controller.register(registerDto)).rejects.toThrow(error);
    });
  });

  describe('login', () => {
    it('应该成功登录并返回标准响应格式', async () => {
      // Mock 数据
      const loginDto: LoginDto = {
        username: 'testuser',
        password: 'Test@123456',
      };

      const mockReq = {
        ip: '127.0.0.1',
        headers: { 'user-agent': 'test-agent' },
      } as any;

      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      // 执行
      const result = await controller.login(loginDto, mockReq);

      // 验证
      expect(result).toEqual({
        success: true,
        data: mockAuthResponse,
        message: '登录成功',
      });
      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto, '127.0.0.1', 'test-agent');
      expect(mockAuthService.login).toHaveBeenCalledTimes(1);
    });

    it('应该传递 AuthService 抛出的异常', async () => {
      // Mock 登录失败
      const loginDto: LoginDto = {
        username: 'testuser',
        password: 'WrongPassword',
      };

      const mockReq = {
        ip: '127.0.0.1',
        headers: { 'user-agent': 'test-agent' },
      } as any;

      const error = new Error('用户名或密码错误');
      mockAuthService.login.mockRejectedValue(error);

      // 执行并验证
      await expect(controller.login(loginDto, mockReq)).rejects.toThrow(error);
    });
  });

  describe('refreshToken', () => {
    it('应该成功刷新 Token 并返回标准响应格式', async () => {
      // Mock 数据
      const refreshTokenDto: RefreshTokenDto = {
        refreshToken: 'valid-refresh-token',
      };

      mockAuthService.refreshToken.mockResolvedValue(mockAuthResponse);

      // 执行
      const result = await controller.refreshToken(refreshTokenDto);

      // 验证
      expect(result).toEqual({
        success: true,
        data: mockAuthResponse,
        message: 'Token 刷新成功',
      });
      expect(mockAuthService.refreshToken).toHaveBeenCalledWith(refreshTokenDto.refreshToken);
      expect(mockAuthService.refreshToken).toHaveBeenCalledTimes(1);
    });

    it('应该传递 AuthService 抛出的异常', async () => {
      // Mock Token 刷新失败
      const refreshTokenDto: RefreshTokenDto = {
        refreshToken: 'invalid-refresh-token',
      };

      const error = new Error('Refresh Token 无效或已过期');
      mockAuthService.refreshToken.mockRejectedValue(error);

      // 执行并验证
      await expect(controller.refreshToken(refreshTokenDto)).rejects.toThrow(error);
    });
  });

  describe('getCurrentUser', () => {
    it('应该返回当前用户信息', async () => {
      // Mock 当前用户
      const currentUser = {
        id: 'user-id-123',
        username: 'testuser',
        role: Role.PATIENT,
        email: 'test@example.com',
        fullName: '测试用户',
      };

      // 执行
      const result = await controller.getCurrentUser(currentUser);

      // 验证
      expect(result).toEqual({
        success: true,
        data: currentUser,
      });
    });

    it('应该受 JwtAuthGuard 保护', () => {
      // 验证 getCurrentUser 方法有 @UseGuards(JwtAuthGuard) 装饰器
      const guards = Reflect.getMetadata('__guards__', controller.getCurrentUser);
      expect(guards).toBeDefined();
      expect(guards.length).toBeGreaterThan(0);
    });
  });

  describe('HTTP 状态码和路由', () => {
    it('register 应该返回 201 Created', async () => {
      const registerDto: RegisterDto = {
        username: 'testuser',
        password: 'Test@123456',
        role: Role.PATIENT,
      };

      mockAuthService.register.mockResolvedValue(mockAuthResponse);
      await controller.register(registerDto);

      // 验证 @HttpCode(HttpStatus.CREATED) 装饰器
      const httpCode = Reflect.getMetadata('__httpCode__', controller.register);
      expect(httpCode).toBe(201);
    });

    it('login 应该返回 200 OK', async () => {
      const loginDto: LoginDto = {
        username: 'testuser',
        password: 'Test@123456',
      };

      const mockReq = {
        ip: '127.0.0.1',
        headers: { 'user-agent': 'test-agent' },
      } as any;

      mockAuthService.login.mockResolvedValue(mockAuthResponse);
      await controller.login(loginDto, mockReq);

      // 验证 @HttpCode(HttpStatus.OK) 装饰器
      const httpCode = Reflect.getMetadata('__httpCode__', controller.login);
      expect(httpCode).toBe(200);
    });

    it('refreshToken 应该返回 200 OK', async () => {
      const refreshTokenDto: RefreshTokenDto = {
        refreshToken: 'valid-refresh-token',
      };

      mockAuthService.refreshToken.mockResolvedValue(mockAuthResponse);
      await controller.refreshToken(refreshTokenDto);

      // 验证 @HttpCode(HttpStatus.OK) 装饰器
      const httpCode = Reflect.getMetadata('__httpCode__', controller.refreshToken);
      expect(httpCode).toBe(200);
    });

    it('应该在 /auth 路径下', () => {
      const path = Reflect.getMetadata('path', AuthController);
      expect(path).toBe('auth');
    });
  });
});
