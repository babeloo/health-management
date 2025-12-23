import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations/:userId')
  async getConversations(
    @Param('userId') userId: string,
    @Request() req: { user: { sub: string; role: string } },
  ) {
    // 权限检查：用户只能查看自己的会话
    if (req.user.sub !== userId && req.user.role !== 'admin') {
      return {
        success: false,
        error: {
          code: HttpStatus.FORBIDDEN,
          message: '无权访问此用户的会话列表',
          timestamp: new Date().toISOString(),
        },
      };
    }

    const conversations = await this.chatService.getConversations(userId);

    return {
      success: true,
      data: conversations,
    };
  }

  @Get('messages/:conversationId')
  async getMessages(
    @Param('conversationId') conversationId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    const messages = await this.chatService.getMessages(conversationId, page, limit);

    return {
      success: true,
      data: {
        items: messages,
        page,
        limit,
        total: messages.length,
      },
    };
  }

  @Put('messages/:id/read')
  async markAsRead(@Param('id') messageId: string) {
    const message = await this.chatService.markAsRead(messageId);

    if (!message) {
      return {
        success: false,
        error: {
          code: HttpStatus.NOT_FOUND,
          message: '消息不存在',
          timestamp: new Date().toISOString(),
        },
      };
    }

    return {
      success: true,
      data: message,
    };
  }

  @Get('unread-count/:userId')
  async getUnreadCount(
    @Param('userId') userId: string,
    @Request() req: { user: { sub: string; role: string } },
  ) {
    // 权限检查：用户只能查看自己的未读数
    if (req.user.sub !== userId && req.user.role !== 'admin') {
      return {
        success: false,
        error: {
          code: HttpStatus.FORBIDDEN,
          message: '无权访问此用户的未读消息数',
          timestamp: new Date().toISOString(),
        },
      };
    }

    const count = await this.chatService.getUnreadCount(userId);

    return {
      success: true,
      data: { count },
    };
  }
}
