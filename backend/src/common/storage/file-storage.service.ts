import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * 文件存储服务
 * 使用 MinIO 对象存储实现文件上传、下载和访问
 */
@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);

  private readonly minioClient: Minio.Client;

  private readonly bucketName: string;

  private readonly maxFileSize: number; // 最大文件大小（字节）

  constructor(private readonly configService: ConfigService) {
    // 初始化 MinIO 客户端
    this.minioClient = new Minio.Client({
      endPoint: this.configService.get<string>('MINIO_ENDPOINT', 'localhost'),
      port: this.configService.get<number>('MINIO_PORT', 9000),
      useSSL: this.configService.get<boolean>('MINIO_USE_SSL', false),
      accessKey: this.configService.get<string>('MINIO_ACCESS_KEY', 'admin'),
      secretKey: this.configService.get<string>('MINIO_SECRET_KEY', 'minio123'),
    });

    this.bucketName = this.configService.get<string>('MINIO_BUCKET', 'health-mgmt');
    this.maxFileSize = this.configService.get<number>('MAX_FILE_SIZE', 10 * 1024 * 1024); // 默认 10MB

    // 初始化时确保 bucket 存在
    this.ensureBucketExists();
  }

  /**
   * 确保 bucket 存在，不存在则创建
   */
  private async ensureBucketExists(): Promise<void> {
    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
        this.logger.log(`Bucket "${this.bucketName}" created successfully`);
      } else {
        this.logger.log(`Bucket "${this.bucketName}" already exists`);
      }
    } catch (error) {
      this.logger.error(`Failed to ensure bucket exists: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 上传健康文档
   * @param file 文件 Buffer
   * @param userId 用户 ID
   * @param fileName 原始文件名
   * @returns 文件访问 URL
   */
  async uploadHealthDocument(file: Buffer, userId: string, fileName: string): Promise<string> {
    try {
      // 验证文件大小
      if (file.length > this.maxFileSize) {
        throw new Error(
          `File size exceeds maximum allowed size of ${this.maxFileSize / (1024 * 1024)}MB`,
        );
      }

      // 生成唯一文件名
      const fileExt = path.extname(fileName);
      const uniqueId = crypto.randomBytes(16).toString('hex');
      const timestamp = Date.now();
      const uniqueFileName = `health_docs/${userId}/${timestamp}_${uniqueId}${fileExt}`;

      // 确定 Content-Type
      const contentType = this.getContentType(fileExt);

      // 上传到 MinIO
      await this.minioClient.putObject(this.bucketName, uniqueFileName, file, file.length, {
        'Content-Type': contentType,
        'x-amz-acl': 'private', // 私有访问
      });

      this.logger.log(`File uploaded successfully: ${uniqueFileName}`);

      // 返回带签名的访问 URL（1 小时过期）
      const url = await this.getSignedUrl(uniqueFileName);
      return url;
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 获取带签名的文件访问 URL
   * @param filePath 文件路径
   * @param expirySeconds 过期时间（秒），默认 1 小时
   * @returns 带签名的 URL
   */
  async getSignedUrl(filePath: string, expirySeconds: number = 3600): Promise<string> {
    try {
      const url = await this.minioClient.presignedGetObject(
        this.bucketName,
        filePath,
        expirySeconds,
      );
      return url;
    } catch (error) {
      this.logger.error(`Failed to generate signed URL: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 删除文件
   * @param filePath 文件路径
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      await this.minioClient.removeObject(this.bucketName, filePath);
      this.logger.log(`File deleted successfully: ${filePath}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 根据文件扩展名获取 Content-Type
   * @param fileExt 文件扩展名
   * @returns Content-Type
   */
  private getContentType(fileExt: string): string {
    const contentTypeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };

    return contentTypeMap[fileExt.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * 获取最大文件大小限制
   * @returns 最大文件大小（字节）
   */
  getMaxFileSize(): number {
    return this.maxFileSize;
  }
}
