import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserService } from './user.service';
import { UpdateUserDto, QueryUsersDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators';
import { CurrentUser as CurrentUserType } from '../auth/interfaces/user.interface';

/**
 * 用户控制器
 * 处理用户相关的 HTTP 请求
 */
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * 获取用户信息
   * GET /api/v1/users/:id
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string, @CurrentUser() currentUser: CurrentUserType) {
    const user = await this.userService.findOne(id, currentUser.id, currentUser.role);
    return {
      success: true,
      data: user,
    };
  }

  /**
   * 更新用户信息
   * PUT /api/v1/users/:id
   */
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() currentUser: CurrentUserType,
  ) {
    const user = await this.userService.update(id, updateUserDto, currentUser.id, currentUser.role);
    return {
      success: true,
      data: user,
      message: '用户信息更新成功',
    };
  }

  /**
   * 获取用户列表（分页）
   * GET /api/v1/users
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query() queryUsersDto: QueryUsersDto,
    @CurrentUser() currentUser: CurrentUserType,
  ) {
    const result = await this.userService.findAll(queryUsersDto, currentUser.role);
    return {
      success: true,
      ...result,
    };
  }

  /**
   * 上传用户头像
   * POST /api/v1/users/:id/avatar
   */
  @Post(':id/avatar')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @CurrentUser() currentUser: CurrentUserType,
  ) {
    // TODO: 实现文件上传到 MinIO
    // 暂时返回本地文件路径
    const avatarUrl = `/uploads/avatars/${id}/${file.originalname}`;

    const user = await this.userService.updateAvatar(
      id,
      avatarUrl,
      currentUser.id,
      currentUser.role,
    );

    return {
      success: true,
      data: user,
      message: '头像上传成功',
    };
  }
}
