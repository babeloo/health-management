import { request } from '@/utils/request';
import type { ChatRequest, ChatResponse, EducationArticle } from '@/types/ai';

export const aiApi = {
  // AI 问答
  chat: async (data: { message: string; conversationId?: string }) => {
    const response = await request<any>('/ai/chat', {
      method: 'POST',
      data: {
        message: data.message,
        conversation_id: data.conversationId,
        use_rag: true,
      },
    });

    // 转换后端响应格式为前端期望格式
    return {
      conversationId: response.conversation_id,
      reply: response.message,
      disclaimer: '⚠️ 此建议仅供参考，请咨询专业医生。',
    };
  },

  // 获取对话历史
  getConversationHistory: (conversationId: string) => {
    return request<{ messages: any[] }>(`/ai/conversations/${conversationId}`, {
      method: 'GET',
    });
  },

  // 获取科普文章列表
  getArticles: async (params?: { category?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams(params as any).toString();
    const response = await request<any>(`/education/articles?${query}`, {
      method: 'GET',
    });

    // 转换后端响应格式
    return {
      data: response.items || [],
      total: response.total || 0,
    };
  },

  // 获取文章详情
  getArticleDetail: (id: string) => {
    return request<EducationArticle>(`/education/articles/${id}`, {
      method: 'GET',
    });
  },

  // 收藏文章
  favoriteArticle: (id: string) => {
    return request<{ success: boolean }>(`/education/articles/${id}/favorite`, {
      method: 'POST',
    });
  },

  // 取消收藏
  unfavoriteArticle: (id: string) => {
    return request<{ success: boolean }>(`/education/articles/${id}/favorite`, {
      method: 'DELETE',
    });
  },
};
