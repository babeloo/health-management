export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface EducationArticle {
  id: string;
  title: string;
  category: string;
  summary: string;
  content: string;
  coverImage?: string;
  createdAt: string;
  viewCount: number;
  isFavorite?: boolean;
}

export interface ChatRequest {
  message: string;
  conversationId?: string;
}

export interface ChatResponse {
  reply: string;
  conversationId: string;
  disclaimer: string;
}
