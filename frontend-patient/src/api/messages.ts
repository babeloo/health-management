import { request } from '@/utils/request';
import type { Conversation, Message, SendMessageDto } from '@/types/message';

export const messagesApi = {
  // 获取会话列表
  getConversations: (userId: string) => {
    return request<{ success: boolean; data: Conversation[] }>(`/chat/conversations/${userId}`, {
      method: 'GET',
    });
  },

  // 获取聊天记录
  getMessages: (conversationId: string, page = 1, limit = 50) => {
    return request<{ success: boolean; data: Message[] }>(
      `/chat/messages/${conversationId}?page=${page}&limit=${limit}`,
      {
        method: 'GET',
      }
    );
  },

  // 标记消息已读
  markAsRead: (messageId: string) => {
    return request<{ success: boolean; data: Message }>(`/chat/messages/${messageId}/read`, {
      method: 'PUT',
    });
  },

  // 获取未读消息数量
  getUnreadCount: (userId: string) => {
    return request<{ success: boolean; data: number }>(`/chat/unread-count/${userId}`, {
      method: 'GET',
    });
  },

  // 上传图片
  uploadImage: (filePath: string) => {
    return new Promise<string>((resolve, reject) => {
      const token = uni.getStorageSync('token');

      uni.uploadFile({
        url: 'http://localhost:3001/api/v1/upload/image',
        filePath,
        name: 'file',
        header: {
          Authorization: token ? `Bearer ${token}` : '',
        },
        success: (res) => {
          if (res.statusCode === 200) {
            const data = JSON.parse(res.data);
            resolve(data.url);
          } else {
            reject(new Error('上传失败'));
          }
        },
        fail: (err) => {
          reject(err);
        },
      });
    });
  },
};
