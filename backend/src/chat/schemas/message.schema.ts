import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'messages' })
export class Message {
  @Prop({ required: true })
  conversationId: string;

  @Prop({ required: true })
  senderId: string;

  @Prop({ required: true })
  recipientId: string;

  @Prop({ required: true, enum: ['text', 'image', 'voice', 'video', 'file'] })
  type: string;

  @Prop({ required: true })
  content: string;

  @Prop({ type: Object })
  metadata?: {
    fileName?: string;
    fileSize?: number;
    duration?: number;
  };

  @Prop({ required: true, enum: ['sent', 'delivered', 'read'], default: 'sent' })
  status: string;

  @Prop({ type: Date })
  readAt?: Date;

  // Mongoose 自动添加的时间戳字段
  createdAt?: Date;

  updatedAt?: Date;
}

export type MessageDocument = Message & Document;

export const MessageSchema = SchemaFactory.createForClass(Message);

// 创建索引
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1, createdAt: -1 });
MessageSchema.index({ recipientId: 1, status: 1 });
