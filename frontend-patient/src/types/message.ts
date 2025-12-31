export type MessageType = 'text' | 'image' | 'voice' | 'video' | 'file';
export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  type: MessageType;
  content: string;
  metadata?: {
    fileName?: string;
    fileSize?: number;
    duration?: number;
  };
  status: MessageStatus;
  readAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar?: string;
  participantRole: 'doctor' | 'health_manager';
  lastMessage?: {
    content: string;
    type: MessageType;
    createdAt: string;
  };
  unreadCount: number;
  isPinned?: boolean;
  updatedAt: string;
}

export interface SendMessageDto {
  recipientId: string;
  type: MessageType;
  content: string;
  metadata?: {
    fileName?: string;
    fileSize?: number;
    duration?: number;
  };
}
