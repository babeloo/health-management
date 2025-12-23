import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger } from '@nestjs/common';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { ChatService } from './chat.service';
import { CacheService } from '../common/cache/cache.service';
import { SendMessageDto } from './dto';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly cacheService: CacheService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      // 从 handshake 中提取 token 并验证
      const token =
        client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        client.disconnect();
        return;
      }

      // Token 验证会在 WsJwtGuard 中进行
      this.logger.log(`Client connected: ${client.id}`);
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.user?.sub;
    if (userId) {
      // 清除在线状态
      await this.cacheService.deleteOnlineUser(userId);
      this.logger.log(`Client disconnected: ${client.id}, User: ${userId}`);
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('join')
  async handleJoin(@ConnectedSocket() client: Socket) {
    const userId = client.data.user?.sub;
    if (!userId) {
      throw new WsException('Unauthorized');
    }

    // 加入用户专属房间
    await client.join(`user:${userId}`);

    // 更新在线状态
    await this.cacheService.setOnlineUser(userId);

    this.logger.log(`User ${userId} joined room`);

    return { event: 'joined', data: { userId } };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('send_message')
  async handleSendMessage(@ConnectedSocket() client: Socket, @MessageBody() data: SendMessageDto) {
    const senderId = client.data.user?.sub;
    if (!senderId) {
      throw new WsException('Unauthorized');
    }

    try {
      // 保存消息到数据库
      const message = await this.chatService.saveMessage(senderId, data.recipientId, data);

      // 实时推送给接收者
      this.server.to(`user:${data.recipientId}`).emit('new_message', {
        id: message._id, // eslint-disable-line no-underscore-dangle
        conversationId: message.conversationId,
        senderId: message.senderId,
        recipientId: message.recipientId,
        type: message.type,
        content: message.content,
        metadata: message.metadata,
        status: message.status,
        createdAt: message.createdAt,
      });

      // 返回给发送者
      return {
        event: 'message_sent',
        data: {
          id: message._id, // eslint-disable-line no-underscore-dangle
          conversationId: message.conversationId,
          status: 'sent',
          createdAt: message.createdAt,
        },
      };
    } catch (error) {
      this.logger.error(`Send message error: ${error.message}`);
      throw new WsException('Failed to send message');
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { recipientId: string },
  ) {
    const senderId = client.data.user?.sub;
    if (!senderId) {
      throw new WsException('Unauthorized');
    }

    // 通知接收者发送者正在输入
    this.server.to(`user:${data.recipientId}`).emit('user_typing', {
      userId: senderId,
    });
  }
}
