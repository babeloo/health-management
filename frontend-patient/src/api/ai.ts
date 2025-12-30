import { request } from '@/utils/request';
import type { ChatRequest, ChatResponse, EducationArticle } from '@/types/ai';

export const aiApi = {
  // AI 问答
  chat: (data: ChatRequest) => {
    return request<ChatResponse>('/ai/chat', {
      method: 'POST',
      data,
    });
  },

  // 获取对话历史
  getConversationHistory: (conversationId: string) => {
    return request<{ messages: any[] }>(`/ai/conversations/${conversationId}`, {
      method: 'GET',
    });
  },

  // 获取科普文章列表
  getArticles: (params?: { category?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<{ data: EducationArticle[]; total: number }>(`/education/articles?${query}`, {
      method: 'GET',
    });
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
