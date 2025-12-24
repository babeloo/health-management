import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationService } from './notification.service';
import { CreateNotificationDto, QueryNotificationsDto } from './dto';

@ApiTags('通知管理')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  @ApiOperation({ summary: '创建通知（管理员）' })
  async createNotification(@Body() dto: CreateNotificationDto) {
    const notification = await this.notificationService.createNotification(dto);
    return {
      success: true,
      data: notification,
      message: '通知创建成功',
    };
  }

  @Get(':userId')
  @ApiOperation({ summary: '获取用户通知列表' })
  async getNotifications(
    @Param('userId') userId: string,
    @Query() query: QueryNotificationsDto,
    @Request() req: any,
  ) {
    // 权限检查：用户只能查看自己的通知
    if (req.user.userId !== userId && req.user.role !== 'ADMIN') {
      return {
        success: false,
        message: '无权访问其他用户的通知',
      };
    }

    const result = await this.notificationService.getNotifications(userId, query);
    return {
      success: true,
      data: result.data,
      pagination: result.pagination,
    };
  }

  @Get(':userId/unread-count')
  @ApiOperation({ summary: '获取未读通知数量' })
  async getUnreadCount(@Param('userId') userId: string, @Request() req: any) {
    // 权限检查
    if (req.user.userId !== userId && req.user.role !== 'ADMIN') {
      return {
        success: false,
        message: '无权访问其他用户的通知',
      };
    }

    const count = await this.notificationService.getUnreadCount(userId);
    return {
      success: true,
      data: { count },
    };
  }

  @Put(':id/read')
  @ApiOperation({ summary: '标记通知为已读' })
  async markAsRead(@Param('id') id: string, @Request() req: any) {
    const notification = await this.notificationService.markAsRead(id, req.user.userId);
    return {
      success: true,
      data: notification,
      message: '通知已标记为已读',
    };
  }

  @Put(':userId/read-all')
  @ApiOperation({ summary: '标记所有通知为已读' })
  async markAllAsRead(@Param('userId') userId: string, @Request() req: any) {
    // 权限检查
    if (req.user.userId !== userId && req.user.role !== 'ADMIN') {
      return {
        success: false,
        message: '无权操作其他用户的通知',
      };
    }

    const count = await this.notificationService.markAllAsRead(userId);
    return {
      success: true,
      data: { count },
      message: `已标记 ${count} 条通知为已读`,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除通知' })
  async deleteNotification(@Param('id') id: string, @Request() req: any) {
    await this.notificationService.deleteNotification(id, req.user.userId);
    return {
      success: true,
      message: '通知已删除',
    };
  }

  @Delete(':userId/clear-read')
  @ApiOperation({ summary: '清空已读通知' })
  async clearReadNotifications(@Param('userId') userId: string, @Request() req: any) {
    // 权限检查
    if (req.user.userId !== userId && req.user.role !== 'ADMIN') {
      return {
        success: false,
        message: '无权操作其他用户的通知',
      };
    }

    const count = await this.notificationService.clearReadNotifications(userId);
    return {
      success: true,
      data: { count },
      message: `已清空 ${count} 条已读通知`,
    };
  }
}
