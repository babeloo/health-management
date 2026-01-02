import { IsString, IsOptional, IsBoolean, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * AI 聊天请求 DTO
 */
export class ChatRequestDto {
  @ApiProperty({ description: '用户消息', example: '我血压有点高怎么办？' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: '会话ID（用于继续对话）', example: 'conv_123' })
  @IsOptional()
  @IsString()
  conversationId?: string;

  @ApiPropertyOptional({ description: '是否使用RAG检索', default: true })
  @IsOptional()
  @IsBoolean()
  useRag?: boolean;
}

/**
 * AI 聊天响应 DTO
 */
export class ChatResponseDto {
  @ApiProperty({ description: '会话ID' })
  conversationId: string;

  @ApiProperty({ description: 'AI回复内容' })
  reply: string;

  @ApiProperty({ description: '免责声明' })
  disclaimer: string;

  @ApiPropertyOptional({ description: 'RAG检索来源' })
  sources?: Array<{ content: string; score: number }>;
}

/**
 * 文章查询参数 DTO
 */
export class ArticleQueryDto {
  @ApiPropertyOptional({ description: '文章分类', example: 'hypertension' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: '页码', example: 1, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: '每页数量', example: 20, default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;
}

/**
 * 文章列表响应 DTO
 */
export class ArticleListResponseDto {
  @ApiProperty({ description: '文章列表' })
  data: any[];

  @ApiProperty({ description: '总数' })
  total: number;
}
