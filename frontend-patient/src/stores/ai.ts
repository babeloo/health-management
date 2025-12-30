import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Message } from '@/types/ai';
import { aiApi } from '@/api/ai';

export const useAiStore = defineStore('ai', () => {
  const messages = ref<Message[]>([]);
  const conversationId = ref<string>('');
  const loading = ref(false);

  // 发送消息
  const sendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    messages.value.push(userMessage);

    loading.value = true;
    try {
      const response = await aiApi.chat({
        message: content,
        conversationId: conversationId.value || undefined,
      });

      conversationId.value = response.conversationId;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.reply + '\n\n' + response.disclaimer,
        timestamp: Date.now(),
      };
      messages.value.push(assistantMessage);

      // 缓存对话历史
      uni.setStorageSync('ai_messages', messages.value);
      uni.setStorageSync('ai_conversation_id', conversationId.value);
    } catch (error: any) {
      uni.showToast({
        title: error.message || 'AI 服务异常',
        icon: 'none',
      });
    } finally {
      loading.value = false;
    }
  };

  // 加载历史对话
  const loadHistory = () => {
    const cached = uni.getStorageSync('ai_messages');
    const cachedId = uni.getStorageSync('ai_conversation_id');
    if (cached) {
      messages.value = cached;
    }
    if (cachedId) {
      conversationId.value = cachedId;
    }
  };

  // 清空对话
  const clearMessages = () => {
    messages.value = [];
    conversationId.value = '';
    uni.removeStorageSync('ai_messages');
    uni.removeStorageSync('ai_conversation_id');
  };

  return {
    messages,
    loading,
    sendMessage,
    loadHistory,
    clearMessages,
  };
});
