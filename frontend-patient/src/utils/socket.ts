import { io, Socket } from 'socket.io-client';
import type { Message, SendMessageDto } from '@/types/message';

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;

  connect(token: string) {
    if (this.socket?.connected) return;

    const baseUrl = 'http://localhost:3001';

    this.socket = io(`${baseUrl}/chat`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: this.reconnectDelay,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.socket?.emit('join');
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        uni.showToast({
          title: '连接失败，请检查网络',
          icon: 'none',
        });
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  sendMessage(data: SendMessageDto, callback?: (response: any) => void) {
    if (!this.socket?.connected) {
      uni.showToast({
        title: '连接已断开，请重试',
        icon: 'none',
      });
      return;
    }

    this.socket.emit('send_message', data, callback);
  }

  onNewMessage(callback: (message: Message) => void) {
    this.socket?.on('new_message', callback);
  }

  onMessageSent(callback: (data: any) => void) {
    this.socket?.on('message_sent', callback);
  }

  onUserTyping(callback: (data: { userId: string }) => void) {
    this.socket?.on('user_typing', callback);
  }

  sendTyping(recipientId: string) {
    this.socket?.emit('typing', { recipientId });
  }

  offNewMessage() {
    this.socket?.off('new_message');
  }

  offMessageSent() {
    this.socket?.off('message_sent');
  }

  offUserTyping() {
    this.socket?.off('user_typing');
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();
