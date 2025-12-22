/* eslint-disable import/no-extraneous-dependencies */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { FileStorageService } from './file-storage.service';

// Mock MinIO Client
jest.mock('minio');

describe('FileStorageService', () => {
  let service: FileStorageService;
  let mockMinioClient: jest.Mocked<Minio.Client>;

  const mockConfigService = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    get: jest.fn((key: string, defaultValue?: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const config: Record<string, any> = {
        MINIO_ENDPOINT: 'localhost',
        MINIO_PORT: 9000,
        MINIO_USE_SSL: false,
        MINIO_ACCESS_KEY: 'admin',
        MINIO_SECRET_KEY: 'minio123',
        MINIO_BUCKET: 'health-mgmt',
        MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
      };
      return config[key] !== undefined ? config[key] : defaultValue;
    }),
  };

  beforeEach(async () => {
    // 创建 Mock MinIO Client
    mockMinioClient = {
      bucketExists: jest.fn().mockResolvedValue(true),
      makeBucket: jest.fn().mockResolvedValue(undefined),
      putObject: jest.fn(),
      presignedGetObject: jest.fn(),
      removeObject: jest.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    // Mock MinIO.Client 构造函数
    (Minio.Client as jest.MockedClass<typeof Minio.Client>).mockImplementation(
      () => mockMinioClient,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileStorageService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<FileStorageService>(FileStorageService);

    // 手动调用 onModuleInit 来触发 bucket 初始化
    await service.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('应该成功创建服务实例', () => {
      expect(service).toBeDefined();
    });

    it('应该初始化 MinIO 客户端', () => {
      expect(Minio.Client).toHaveBeenCalledWith({
        endPoint: 'localhost',
        port: 9000,
        useSSL: false,
        accessKey: 'admin',
        secretKey: 'minio123',
      });
    });

    it('应该检查 bucket 是否存在', () => {
      expect(mockMinioClient.bucketExists).toHaveBeenCalledWith('health-mgmt');
    });
  });

  describe('uploadHealthDocument', () => {
    const mockFile = Buffer.from('test file content');
    const userId = 'user-123';
    const fileName = 'test.pdf';

    beforeEach(() => {
      mockMinioClient.bucketExists.mockResolvedValue(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockMinioClient.putObject.mockResolvedValue({} as any);
      mockMinioClient.presignedGetObject.mockResolvedValue('https://minio.example.com/signed-url');
    });

    it('应该成功上传文件并返回签名 URL', async () => {
      const result = await service.uploadHealthDocument(mockFile, userId, fileName);

      expect(mockMinioClient.putObject).toHaveBeenCalled();
      expect(result).toBe('https://minio.example.com/signed-url');
    });

    it('应该生成唯一的文件名', async () => {
      await service.uploadHealthDocument(mockFile, userId, fileName);

      const putObjectCall = mockMinioClient.putObject.mock.calls[0];
      const uploadedFileName = putObjectCall[1] as string;

      expect(uploadedFileName).toMatch(/^health_docs\/user-123\/\d+_[a-f0-9]{32}\.pdf$/);
    });

    it('应该设置正确的 Content-Type', async () => {
      await service.uploadHealthDocument(mockFile, userId, 'test.jpg');

      const putObjectCall = mockMinioClient.putObject.mock.calls[0];
      const metadata = putObjectCall[4] as Record<string, string>;

      expect(metadata['Content-Type']).toBe('image/jpeg');
    });

    it('应该拒绝超过最大大小的文件', async () => {
      const largeFile = Buffer.alloc(11 * 1024 * 1024); // 11MB

      await expect(service.uploadHealthDocument(largeFile, userId, fileName)).rejects.toThrow(
        'File size exceeds maximum allowed size of 10MB',
      );
    });

    it('应该处理上传失败的情况', async () => {
      mockMinioClient.putObject.mockRejectedValue(new Error('Upload failed'));

      await expect(service.uploadHealthDocument(mockFile, userId, fileName)).rejects.toThrow(
        'Upload failed',
      );
    });
  });

  describe('getSignedUrl', () => {
    const filePath = 'health_docs/user-123/test.pdf';

    beforeEach(() => {
      mockMinioClient.presignedGetObject.mockResolvedValue('https://minio.example.com/signed-url');
    });

    it('应该生成带签名的 URL', async () => {
      const result = await service.getSignedUrl(filePath);

      expect(mockMinioClient.presignedGetObject).toHaveBeenCalledWith(
        'health-mgmt',
        filePath,
        3600,
      );
      expect(result).toBe('https://minio.example.com/signed-url');
    });

    it('应该支持自定义过期时间', async () => {
      await service.getSignedUrl(filePath, 7200);

      expect(mockMinioClient.presignedGetObject).toHaveBeenCalledWith(
        'health-mgmt',
        filePath,
        7200,
      );
    });

    it('应该处理生成 URL 失败的情况', async () => {
      mockMinioClient.presignedGetObject.mockRejectedValue(new Error('Failed to generate URL'));

      await expect(service.getSignedUrl(filePath)).rejects.toThrow('Failed to generate URL');
    });
  });

  describe('deleteFile', () => {
    const filePath = 'health_docs/user-123/test.pdf';

    beforeEach(() => {
      mockMinioClient.removeObject.mockResolvedValue();
    });

    it('应该成功删除文件', async () => {
      await service.deleteFile(filePath);

      expect(mockMinioClient.removeObject).toHaveBeenCalledWith('health-mgmt', filePath);
    });

    it('应该处理删除失败的情况', async () => {
      mockMinioClient.removeObject.mockRejectedValue(new Error('Delete failed'));

      await expect(service.deleteFile(filePath)).rejects.toThrow('Delete failed');
    });
  });

  describe('getMaxFileSize', () => {
    it('应该返回最大文件大小', () => {
      const maxSize = service.getMaxFileSize();

      expect(maxSize).toBe(10 * 1024 * 1024);
    });
  });

  describe('getContentType', () => {
    it('应该为常见文件类型返回正确的 Content-Type', async () => {
      const testCases = [
        { ext: '.jpg', expected: 'image/jpeg' },
        { ext: '.jpeg', expected: 'image/jpeg' },
        { ext: '.png', expected: 'image/png' },
        { ext: '.gif', expected: 'image/gif' },
        { ext: '.pdf', expected: 'application/pdf' },
        { ext: '.doc', expected: 'application/msword' },
        {
          ext: '.docx',
          expected: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        },
      ];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockMinioClient.putObject.mockResolvedValue({} as any);
      mockMinioClient.presignedGetObject.mockResolvedValue('https://example.com/url');

      // 串行执行测试以确保 mock 调用顺序正确
      // eslint-disable-next-line no-restricted-syntax
      for (const { ext, expected } of testCases) {
        mockMinioClient.putObject.mockClear();

        // eslint-disable-next-line no-await-in-loop
        await service.uploadHealthDocument(Buffer.from('test'), 'user-123', `test${ext}`);

        const putObjectCall = mockMinioClient.putObject.mock.calls[0];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const metadata = putObjectCall[4] as Record<string, any>;

        expect(metadata['Content-Type']).toBe(expected);
      }
    });

    it('应该为未知文件类型返回默认 Content-Type', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockMinioClient.putObject.mockResolvedValue({} as any);
      mockMinioClient.presignedGetObject.mockResolvedValue('https://example.com/url');

      await service.uploadHealthDocument(Buffer.from('test'), 'user-123', 'test.unknown');

      const putObjectCall = mockMinioClient.putObject.mock.calls[0];
      const metadata = putObjectCall[4] as Record<string, string>;

      expect(metadata['Content-Type']).toBe('application/octet-stream');
    });
  });
});
