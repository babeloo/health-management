import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ChatRequestDto, ArticleQueryDto } from './dto';

/**
 * AI 服务
 * 负责与 Python AI 服务通信
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  private readonly aiServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL', 'http://localhost:8001');
    this.logger.log(`AI Service URL: ${this.aiServiceUrl}`);
  }

  /**
   * AI 聊天
   */
  async chat(userId: string, chatRequest: ChatRequestDto) {
    try {
      const response = await firstValueFrom(
        this.httpService.post<any>(`${this.aiServiceUrl}/api/v1/ai/chat`, {
          message: chatRequest.message,
          conversation_id: chatRequest.conversationId,
          use_rag: chatRequest.useRag ?? true,
          user_id: userId,
        }),
      );

      // 转换响应格式并添加免责声明
      return {
        conversationId: response.data.conversation_id,
        reply: response.data.message,
        disclaimer: '⚠️ 此建议仅供参考，请咨询专业医生。',
        sources: response.data.sources,
      };
    } catch (error: any) {
      this.logger.error(`AI chat failed: ${error.message}`, error.stack);
      throw new HttpException(
        {
          success: false,
          message: 'AI服务暂时不可用，请稍后再试',
          error: error.message,
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * 获取对话历史
   */
  async getConversationHistory(conversationId: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get<any>(`${this.aiServiceUrl}/api/v1/ai/conversations/${conversationId}`),
      );

      return response.data;
    } catch (error: any) {
      this.logger.error(`Get conversation history failed: ${error.message}`, error.stack);
      throw new HttpException(
        {
          success: false,
          message: '获取对话历史失败',
          error: error.message,
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * 获取科普文章列表
   */
  async getArticles(params: ArticleQueryDto) {
    try {
      const queryParams = new URLSearchParams();
      if (params.category) queryParams.append('category', params.category);
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());

      const response = await firstValueFrom(
        this.httpService.get<any>(
          `${this.aiServiceUrl}/api/v1/education/articles?${queryParams.toString()}`,
        ),
      );

      // 转换响应格式
      return {
        data: response.data.items || [],
        total: response.data.total || 0,
      };
    } catch (error: any) {
      this.logger.error(`Get articles failed: ${error.message}`, error.stack);
      throw new HttpException(
        {
          success: false,
          message: '获取文章列表失败',
          error: error.message,
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * 获取文章详情
   */
  async getArticleDetail(articleId: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get<any>(`${this.aiServiceUrl}/api/v1/education/articles/${articleId}`),
      );

      return response.data;
    } catch (error: any) {
      this.logger.error(`Get article detail failed: ${error.message}`, error.stack);
      throw new HttpException(
        {
          success: false,
          message: '获取文章详情失败',
          error: error.message,
        },
        error.response?.status || HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * 收藏文章
   */
  async favoriteArticle(userId: string, articleId: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.post<any>(
          `${this.aiServiceUrl}/api/v1/education/articles/${articleId}/favorite`,
          {
            user_id: userId,
          },
        ),
      );

      return response.data;
    } catch (error: any) {
      this.logger.error(`Favorite article failed: ${error.message}`, error.stack);
      throw new HttpException(
        {
          success: false,
          message: '收藏文章失败',
          error: error.message,
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * 取消收藏文章
   */
  async unfavoriteArticle(userId: string, articleId: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.delete<any>(
          `${this.aiServiceUrl}/api/v1/education/articles/${articleId}/favorite`,
          {
            data: { user_id: userId },
          },
        ),
      );

      return response.data;
    } catch (error: any) {
      this.logger.error(`Unfavorite article failed: ${error.message}`, error.stack);
      throw new HttpException(
        {
          success: false,
          message: '取消收藏失败',
          error: error.message,
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
