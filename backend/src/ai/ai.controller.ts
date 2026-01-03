import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  Headers,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UserRole } from '../generated/prisma/client';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatRequestDto, ChatResponseDto, ArticleQueryDto, ArticleListResponseDto } from './dto';

/**
 * 请求用户接口（来自 JWT payload）
 */
interface RequestUser {
  id: string;
  userId: string;
  role: UserRole;
}

/**
 * AI 健康科普控制器
 * 代理转发请求到 Python AI 服务
 */
@ApiTags('AI 健康科普')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiController {
  constructor(private readonly aiService: AiService) {}

  /**
   * AI 健康问答
   */
  @Post('ai/chat')
  @ApiOperation({ summary: 'AI 健康问答' })
  @ApiResponse({
    status: 200,
    description: 'AI 回复成功',
    type: ChatResponseDto,
  })
  async chat(
    @Request() req: ExpressRequest & { user: RequestUser },
    @Body() chatRequest: ChatRequestDto,
    @Headers('authorization') authorization?: string,
  ): Promise<ChatResponseDto> {
    const { userId } = req.user;
    return this.aiService.chat(userId, chatRequest, authorization);
  }

  /**
   * 获取对话历史
   */
  @Get('ai/conversations/:id')
  @ApiOperation({ summary: '获取对话历史' })
  @ApiResponse({
    status: 200,
    description: '获取成功',
  })
  async getConversationHistory(
    @Request() req: ExpressRequest & { user: RequestUser },
    @Param('id') conversationId: string,
    @Headers('authorization') authorization?: string,
  ) {
    return this.aiService.getConversationHistory(conversationId, authorization);
  }

  /**
   * 获取科普文章列表
   */
  @Get('education/articles')
  @ApiOperation({ summary: '获取科普文章列表' })
  @ApiQuery({ name: 'category', required: false, description: '文章分类' })
  @ApiQuery({ name: 'page', required: false, description: '页码', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量', type: Number })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: ArticleListResponseDto,
  })
  async getArticles(
    @Request() req: ExpressRequest & { user: RequestUser },
    @Query() query: ArticleQueryDto,
    @Headers('authorization') authorization?: string,
  ): Promise<ArticleListResponseDto> {
    return this.aiService.getArticles(query, authorization);
  }

  /**
   * 获取文章详情
   */
  @Get('education/articles/:id')
  @ApiOperation({ summary: '获取文章详情' })
  @ApiResponse({
    status: 200,
    description: '获取成功',
  })
  async getArticleDetail(
    @Request() req: ExpressRequest & { user: RequestUser },
    @Param('id') articleId: string,
    @Headers('authorization') authorization?: string,
  ) {
    return this.aiService.getArticleDetail(articleId, authorization);
  }

  /**
   * 收藏文章
   */
  @Post('education/articles/:id/favorite')
  @ApiOperation({ summary: '收藏文章' })
  @ApiResponse({
    status: 200,
    description: '收藏成功',
  })
  async favoriteArticle(
    @Request() req: ExpressRequest & { user: RequestUser },
    @Param('id') articleId: string,
    @Headers('authorization') authorization?: string,
  ) {
    const { userId } = req.user;
    return this.aiService.favoriteArticle(userId, articleId, authorization);
  }

  /**
   * 取消收藏文章
   */
  @Delete('education/articles/:id/favorite')
  @ApiOperation({ summary: '取消收藏文章' })
  @ApiResponse({
    status: 200,
    description: '取消收藏成功',
  })
  async unfavoriteArticle(
    @Request() req: ExpressRequest & { user: RequestUser },
    @Param('id') articleId: string,
    @Headers('authorization') authorization?: string,
  ) {
    const { userId } = req.user;
    return this.aiService.unfavoriteArticle(userId, articleId, authorization);
  }
}
