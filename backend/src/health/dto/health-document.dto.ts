import { ApiProperty } from '@nestjs/swagger';

/**
 * 医疗文档信息
 */
export class HealthDocumentDto {
  @ApiProperty({
    description: '文件访问 URL',
    example: 'https://minio.example.com/health-mgmt/health_docs/user-id/1234567890_abc123.pdf',
  })
  url: string;

  @ApiProperty({
    description: '文件类型（MIME type）',
    example: 'application/pdf',
  })
  type: string;

  @ApiProperty({
    description: '原始文件名',
    example: '体检报告.pdf',
  })
  name: string;

  @ApiProperty({
    description: '文件大小（字节）',
    example: 2048576,
  })
  size: number;

  @ApiProperty({
    description: '上传时间（ISO 8601）',
    example: '2025-12-22T10:00:00Z',
  })
  uploadDate: string;
}

/**
 * 上传文档响应 DTO
 */
export class UploadDocumentResponseDto {
  @ApiProperty({
    description: '操作是否成功',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: '上传的文档信息',
    type: HealthDocumentDto,
  })
  data: HealthDocumentDto;

  @ApiProperty({
    description: '响应时间戳（ISO 8601）',
    example: '2025-12-22T10:00:00Z',
  })
  timestamp: string;
}
