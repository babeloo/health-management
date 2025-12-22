import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { UpdateUserDto, QueryUsersDto } from './dto';

/**
 * 用户服务
 * 处理用户信息的 CRUD 操作
 */
@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取用户信息
   */
  async findOne(id: string, requestUserId: string, requestUserRole: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        fullName: true,
        gender: true,
        birthDate: true,
        avatarUrl: true,
        status: true,
        emailVerified: true,
        phoneVerified: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 权限检查：只能查看自己的信息，或者管理员可以查看所有用户
    if (user.id !== requestUserId && requestUserRole !== 'ADMIN') {
      throw new ForbiddenException('无权访问该用户信息');
    }

    return user;
  }

  /**
   * 更新用户信息
   */
  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    requestUserId: string,
    requestUserRole: string,
  ) {
    // 权限检查：只能更新自己的信息，或者管理员可以更新所有用户
    if (id !== requestUserId && requestUserRole !== 'ADMIN') {
      throw new ForbiddenException('无权修改该用户信息');
    }

    // 检查用户是否存在
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException('用户不存在');
    }

    // 更新用户信息
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        fullName: updateUserDto.fullName,
        gender: updateUserDto.gender as 'MALE' | 'FEMALE' | 'OTHER' | undefined,
        birthDate: updateUserDto.birthDate ? new Date(updateUserDto.birthDate) : undefined,
        avatarUrl: updateUserDto.avatarUrl,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        fullName: true,
        gender: true,
        birthDate: true,
        avatarUrl: true,
        status: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  /**
   * 获取用户列表（分页）
   */
  async findAll(queryUsersDto: QueryUsersDto, requestUserRole: string) {
    // 权限检查：只有管理员可以查看用户列表
    if (requestUserRole !== 'ADMIN') {
      throw new ForbiddenException('无权访问用户列表');
    }

    const { page = 1, limit = 20, role, status, search } = queryUsersDto;
    const skip = (page - 1) * limit;

    // 构建查询条件
    const where: Record<string, unknown> = {};

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 查询用户列表和总数
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          username: true,
          email: true,
          phone: true,
          role: true,
          fullName: true,
          gender: true,
          avatarUrl: true,
          status: true,
          createdAt: true,
          lastLoginAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 更新用户头像
   */
  async updateAvatar(
    userId: string,
    avatarUrl: string,
    requestUserId: string,
    requestUserRole: string,
  ) {
    // 权限检查：只能更新自己的头像，或者管理员可以更新所有用户
    if (userId !== requestUserId && requestUserRole !== 'ADMIN') {
      throw new ForbiddenException('无权修改该用户头像');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        avatarUrl,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }
}
