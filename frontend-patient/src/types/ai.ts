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
  conversation_id?: string;
  use_rag?: boolean;
}

export interface ChatResponse {
  conversation_id: string;
  message: string;
  sources?: Array<{ content: string; score: number }>;
}
