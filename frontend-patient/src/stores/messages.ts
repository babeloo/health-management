import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Conversation, Message } from '@/types/message';
import { messagesApi } from '@/api/messages';
import { socketService } from '@/utils/socket';

export const useMessagesStore = defineStore('messages', () => {
  const conversations = ref<Conversation[]>([]);
  const currentMessages = ref<Message[]>([]);
  const currentConversationId = ref<string>('');
  const unreadCount = ref<number>(0);

  const totalUnreadCount = computed(() => {
    return conversations.value.reduce((sum, conv) => sum + conv.unreadCount, 0);
  });

  // 加载会话列表
  const loadConversations = async (userId: string) => {
    try {
      const res = await messagesApi.getConversations(userId);
      conversations.value = res.data;
    } catch (error) {
      console.error('加载会话列表失败:', error);
      uni.showToast({ title: '加载失败', icon: 'none' });
    }
  };

  // 加载聊天记录
  const loadMessages = async (conversationId: string, page = 1) => {
    try {
      const res = await messagesApi.getMessages(conversationId, page);
      if (page === 1) {
        currentMessages.value = res.data.reverse();
      } else {
        currentMessages.value = [...res.data.reverse(), ...currentMessages.value];
      }
      currentConversationId.value = conversationId;
    } catch (error) {
      console.error('加载消息失败:', error);
      uni.showToast({ title: '加载失败', icon: 'none' });
    }
  };

  // 添加新消息
  const addMessage = (message: Message) => {
    if (message.conversationId === currentConversationId.value) {
      currentMessages.value.push(message);
    }

    // 更新会话列表
    const conv = conversations.value.find(
      (c) => c.id === message.conversationId
    );
    if (conv) {
      conv.lastMessage = {
        content: message.content,
        type: message.type,
        createdAt: message.createdAt,
      };
      conv.unreadCount += 1;
      conv.updatedAt = message.createdAt;
    }
  };

  // 标记消息已读
  const markMessagesAsRead = async (conversationId: string) => {
    const unreadMessages = currentMessages.value.filter(
      (m) => m.conversationId === conversationId && m.status !== 'read'
    );

    for (const message of unreadMessages) {
      try {
        await messagesApi.markAsRead(message.id);
        message.status = 'read';
      } catch (error) {
        console.error('标记已读失败:', error);
      }
    }

    // 更新会话未读数
    const conv = conversations.value.find((c) => c.id === conversationId);
    if (conv) {
      conv.unreadCount = 0;
    }
  };

  // 加载未读数量
  const loadUnreadCount = async (userId: string) => {
    try {
      const res = await messagesApi.getUnreadCount(userId);
      unreadCount.value = res.data;
    } catch (error) {
      console.error('加载未读数失败:', error);
    }
  };

  // 清空当前消息
  const clearCurrentMessages = () => {
    currentMessages.value = [];
    currentConversationId.value = '';
  };

  return {
    conversations,
    currentMessages,
    currentConversationId,
    unreadCount,
    totalUnreadCount,
    loadConversations,
    loadMessages,
    addMessage,
    markMessagesAsRead,
    loadUnreadCount,
    clearCurrentMessages,
  };
});
