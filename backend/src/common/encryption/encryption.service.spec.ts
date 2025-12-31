import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;
  const mockEncryptionKey = Buffer.from('a'.repeat(32)).toString('base64');

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(mockEncryptionKey),
          },
        },
      ],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('encrypt', () => {
    it('should encrypt plaintext successfully', () => {
      const plaintext = '123456789012345678';
      const encrypted = service.encrypt(plaintext);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted.split(':')).toHaveLength(3);
    });

    it('should produce different ciphertext for same plaintext', () => {
      const plaintext = '123456789012345678';
      const encrypted1 = service.encrypt(plaintext);
      const encrypted2 = service.encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should handle empty string', () => {
      const encrypted = service.encrypt('');
      expect(encrypted).toBeDefined();
      expect(encrypted.split(':')).toHaveLength(3);
    });

    it('should handle special characters', () => {
      const plaintext = '测试数据!@#$%^&*()';
      const encrypted = service.encrypt(plaintext);
      expect(encrypted).toBeDefined();
    });
  });

  describe('decrypt', () => {
    it('should decrypt ciphertext successfully', () => {
      const plaintext = '123456789012345678';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle special characters', () => {
      const plaintext = '测试数据!@#$%^&*()';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should throw error for invalid ciphertext format', () => {
      expect(() => service.decrypt('invalid')).toThrow('Failed to decrypt data');
    });

    it('should throw error for corrupted ciphertext', () => {
      const plaintext = '123456789012345678';
      const encrypted = service.encrypt(plaintext);
      const corrupted = encrypted.replace(/.$/, 'x');

      expect(() => service.decrypt(corrupted)).toThrow('Failed to decrypt data');
    });

    it('should throw error for missing parts', () => {
      expect(() => service.decrypt('part1:part2')).toThrow('Failed to decrypt data');
    });
  });

  describe('encrypt/decrypt round trip', () => {
    it('should handle long text', () => {
      const plaintext = 'a'.repeat(1000);
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle JSON data', () => {
      const data = { name: '张三', idCard: '123456789012345678' };
      const plaintext = JSON.stringify(data);
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(JSON.parse(decrypted)).toEqual(data);
    });
  });

  describe('constructor', () => {
    it('should throw error if ENCRYPTION_KEY is not configured', async () => {
      await expect(
        Test.createTestingModule({
          providers: [
            EncryptionService,
            {
              provide: ConfigService,
              useValue: {
                get: jest.fn().mockReturnValue(undefined),
              },
            },
          ],
        }).compile(),
      ).rejects.toThrow('ENCRYPTION_KEY is not configured');
    });

    it('should throw error if ENCRYPTION_KEY has invalid length', async () => {
      const invalidKey = Buffer.from('short').toString('base64');
      await expect(
        Test.createTestingModule({
          providers: [
            EncryptionService,
            {
              provide: ConfigService,
              useValue: {
                get: jest.fn().mockReturnValue(invalidKey),
              },
            },
          ],
        }).compile(),
      ).rejects.toThrow('ENCRYPTION_KEY must be 32 bytes');
    });
  });
});
