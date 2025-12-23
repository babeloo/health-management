import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Message, MessageDocument } from './schemas/message.schema';
import { SendMessageDto } from './dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Message.name)
    private messageModel: Model<MessageDocument>,
  ) {}

  async saveMessage(
    senderId: string,
    recipientId: string,
    messageDto: SendMessageDto,
  ): Promise<MessageDocument> {
    const conversationId = this.generateConversationId(senderId, recipientId);

    // eslint-disable-next-line new-cap
    const message = new this.messageModel({
      conversationId,
      senderId,
      recipientId,
      type: messageDto.type,
      content: messageDto.content,
      metadata: messageDto.metadata,
      status: 'sent',
    });

    return message.save();
  }

  async getMessages(conversationId: string, page = 1, limit = 50): Promise<MessageDocument[]> {
    const skip = (page - 1) * limit;
    return this.messageModel
      .find({ conversationId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async markAsRead(messageId: string): Promise<MessageDocument | null> {
    return this.messageModel
      .findByIdAndUpdate(messageId, { status: 'read', readAt: new Date() }, { new: true })
      .exec();
  }

  async getConversations(userId: string): Promise<
    Array<{
      _id: string;
      lastMessage: MessageDocument;
      unreadCount: number;
    }>
  > {
    const messages = await this.messageModel.aggregate([
      {
        $match: {
          $or: [{ senderId: userId }, { recipientId: userId }],
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: '$conversationId',
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [{ $eq: ['$recipientId', userId] }, { $ne: ['$status', 'read'] }],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $sort: { 'lastMessage.createdAt': -1 },
      },
    ]);

    return messages;
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.messageModel.countDocuments({
      recipientId: userId,
      status: { $ne: 'read' },
    });
  }

  private generateConversationId(userId1: string, userId2: string): string {
    // 确保会话ID的一致性（无论谁发起）
    return [userId1, userId2].sort().join('_');
  }
}
