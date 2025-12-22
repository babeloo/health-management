/* eslint-disable import/no-extraneous-dependencies */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { UserService } from './user.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { UpdateUserDto, QueryUsersDto } from './dto';

describe('UserService', () => {
  let service: UserService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockUser = {
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    phone: '13800138000',
    role: 'PATIENT',
    fullName: '测试用户',
    gender: 'MALE',
    birthDate: new Date('1990-01-01'),
    avatarUrl: 'https://example.com/avatar.jpg',
    status: 'ACTIVE',
    emailVerified: true,
    phoneVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findOne', () => {
    it('应该成功获取用户自己的信息', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findOne('user-123', 'user-123', 'PATIENT');

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: expect.any(Object),
      });
    });

    it('应该允许管理员查看其他用户信息', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findOne('user-123', 'admin-456', 'ADMIN');

      expect(result).toEqual(mockUser);
    });

    it('应该在用户不存在时抛出 NotFoundException', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent', 'user-123', 'PATIENT')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('non-existent', 'user-123', 'PATIENT')).rejects.toThrow(
        '用户不存在',
      );
    });

    it('应该在非管理员尝试查看其他用户信息时抛出 ForbiddenException', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.findOne('user-123', 'other-user', 'PATIENT')).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.findOne('user-123', 'other-user', 'PATIENT')).rejects.toThrow(
        '无权访问该用户信息',
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateUserDto = {
      fullName: '更新后的姓名',
      gender: 'FEMALE',
      birthDate: '1995-05-05',
    };

    it('应该成功更新用户自己的信息', async () => {
      const updatedUser = { ...mockUser, ...updateDto, birthDate: new Date('1995-05-05') };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.update('user-123', updateDto, 'user-123', 'PATIENT');

      expect(result).toEqual(updatedUser);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: expect.objectContaining({
          fullName: '更新后的姓名',
          gender: 'FEMALE',
          birthDate: expect.any(Date),
        }),
        select: expect.any(Object),
      });
    });

    it('应该允许管理员更新其他用户信息', async () => {
      const updatedUser = { ...mockUser, ...updateDto };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.update('user-123', updateDto, 'admin-456', 'ADMIN');

      expect(result).toBeDefined();
      expect(mockPrismaService.user.update).toHaveBeenCalled();
    });

    it('应该在非管理员尝试更新其他用户信息时抛出 ForbiddenException', async () => {
      await expect(service.update('user-123', updateDto, 'other-user', 'PATIENT')).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.update('user-123', updateDto, 'other-user', 'PATIENT')).rejects.toThrow(
        '无权修改该用户信息',
      );
    });

    it('应该在用户不存在时抛出 NotFoundException', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.update('non-existent', updateDto, 'non-existent', 'PATIENT'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.update('non-existent', updateDto, 'non-existent', 'PATIENT'),
      ).rejects.toThrow('用户不存在');
    });

    it('应该正确处理可选字段', async () => {
      const partialUpdateDto: UpdateUserDto = {
        fullName: '仅更新姓名',
      };
      const updatedUser = { ...mockUser, fullName: '仅更新姓名' };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.update('user-123', partialUpdateDto, 'user-123', 'PATIENT');

      expect(result.fullName).toBe('仅更新姓名');
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: expect.objectContaining({
          fullName: '仅更新姓名',
        }),
        select: expect.any(Object),
      });
    });
  });

  describe('findAll', () => {
    const mockUsers = [mockUser, { ...mockUser, id: 'user-456', username: 'testuser2' }];

    const queryDto: QueryUsersDto = {
      page: 1,
      limit: 20,
    };

    it('应该成功获取用户列表（管理员）', async () => {
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.user.count.mockResolvedValue(2);

      const result = await service.findAll(queryDto, 'ADMIN');

      expect(result.data).toEqual(mockUsers);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      });
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 20,
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('应该支持角色筛选', async () => {
      const queryWithRole: QueryUsersDto = { ...queryDto, role: 'PATIENT' };
      mockPrismaService.user.findMany.mockResolvedValue([mockUser]);
      mockPrismaService.user.count.mockResolvedValue(1);

      await service.findAll(queryWithRole, 'ADMIN');

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { role: 'PATIENT' },
        }),
      );
    });

    it('应该支持状态筛选', async () => {
      const queryWithStatus: QueryUsersDto = { ...queryDto, status: 'ACTIVE' };
      mockPrismaService.user.findMany.mockResolvedValue([mockUser]);
      mockPrismaService.user.count.mockResolvedValue(1);

      await service.findAll(queryWithStatus, 'ADMIN');

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'ACTIVE' },
        }),
      );
    });

    it('应该支持关键词搜索', async () => {
      const queryWithSearch: QueryUsersDto = { ...queryDto, search: 'test' };
      mockPrismaService.user.findMany.mockResolvedValue([mockUser]);
      mockPrismaService.user.count.mockResolvedValue(1);

      await service.findAll(queryWithSearch, 'ADMIN');

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { username: { contains: 'test', mode: 'insensitive' } },
              { fullName: { contains: 'test', mode: 'insensitive' } },
            ],
          },
        }),
      );
    });

    it('应该正确计算分页', async () => {
      const queryPage2: QueryUsersDto = { page: 2, limit: 10 };
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.user.count.mockResolvedValue(25);

      const result = await service.findAll(queryPage2, 'ADMIN');

      expect(result.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
      });
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10, // (2-1) * 10
          take: 10,
        }),
      );
    });

    it('应该在非管理员尝试访问用户列表时抛出 ForbiddenException', async () => {
      await expect(service.findAll(queryDto, 'PATIENT')).rejects.toThrow(ForbiddenException);
      await expect(service.findAll(queryDto, 'PATIENT')).rejects.toThrow('无权访问用户列表');
    });
  });

  describe('updateAvatar', () => {
    const avatarUrl = 'https://example.com/new-avatar.jpg';

    it('应该成功更新用户自己的头像', async () => {
      const updatedUser = { ...mockUser, avatarUrl };
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateAvatar('user-123', avatarUrl, 'user-123', 'PATIENT');

      expect(result.avatarUrl).toBe(avatarUrl);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          avatarUrl,
          updatedAt: expect.any(Date),
        },
        select: {
          id: true,
          username: true,
          avatarUrl: true,
          updatedAt: true,
        },
      });
    });

    it('应该允许管理员更新其他用户头像', async () => {
      const updatedUser = { ...mockUser, avatarUrl };
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateAvatar('user-123', avatarUrl, 'admin-456', 'ADMIN');

      expect(result.avatarUrl).toBe(avatarUrl);
    });

    it('应该在非管理员尝试更新其他用户头像时抛出 ForbiddenException', async () => {
      await expect(
        service.updateAvatar('user-123', avatarUrl, 'other-user', 'PATIENT'),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.updateAvatar('user-123', avatarUrl, 'other-user', 'PATIENT'),
      ).rejects.toThrow('无权修改该用户头像');
    });
  });
});
