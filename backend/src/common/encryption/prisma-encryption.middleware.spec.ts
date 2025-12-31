import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from './encryption.service';
import { createEncryptionMiddleware } from './prisma-encryption.middleware';

describe('Prisma Encryption Middleware', () => {
  let encryptionService: EncryptionService;
  let middleware: any;
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

    encryptionService = module.get<EncryptionService>(EncryptionService);
    middleware = createEncryptionMiddleware(encryptionService);
  });

  describe('User model - idCardEncrypted field', () => {
    it('should encrypt idCardEncrypted on create', async () => {
      const idCard = '123456789012345678';
      const params = {
        model: 'User',
        action: 'create',
        args: {
          data: {
            username: 'test',
            idCardEncrypted: idCard,
          },
        },
      };

      const next = jest.fn().mockResolvedValue({ id: '1' });
      await middleware(params, next);

      expect(params.args.data.idCardEncrypted).not.toBe(idCard);
      expect(params.args.data.idCardEncrypted.split(':')).toHaveLength(3);
    });

    it('should encrypt idCardEncrypted on update', async () => {
      const idCard = '123456789012345678';
      const params = {
        model: 'User',
        action: 'update',
        args: {
          where: { id: '1' },
          data: {
            idCardEncrypted: idCard,
          },
        },
      };

      const next = jest.fn().mockResolvedValue({ id: '1' });
      await middleware(params, next);

      expect(params.args.data.idCardEncrypted).not.toBe(idCard);
    });

    it('should decrypt idCardEncrypted on findUnique', async () => {
      const idCard = 'test-id-card-123';
      const encrypted = encryptionService.encrypt(idCard);

      const params = {
        model: 'User',
        action: 'findUnique',
        args: { where: { id: '1' } },
      };

      const next = jest.fn().mockResolvedValue({ id: '1', idCardEncrypted: encrypted });
      const result = await middleware(params, next);

      expect(result.idCardEncrypted).toBe(idCard);
    });

    it('should decrypt idCardEncrypted on findMany', async () => {
      const idCard1 = 'test-id-card-001';
      const idCard2 = 'test-id-card-002';
      const encrypted1 = encryptionService.encrypt(idCard1);
      const encrypted2 = encryptionService.encrypt(idCard2);

      const params = {
        model: 'User',
        action: 'findMany',
        args: {},
      };

      const next = jest.fn().mockResolvedValue([
        { id: '1', idCardEncrypted: encrypted1 },
        { id: '2', idCardEncrypted: encrypted2 },
      ]);
      const result = await middleware(params, next);

      expect(result[0].idCardEncrypted).toBe(idCard1);
      expect(result[1].idCardEncrypted).toBe(idCard2);
    });
  });

  describe('HealthRecord model - JSON fields', () => {
    it('should encrypt chronicDiseases on create', async () => {
      const diseases = { hypertension: true, diabetes: false };
      const params = {
        model: 'HealthRecord',
        action: 'create',
        args: {
          data: {
            userId: '1',
            chronicDiseases: diseases,
          },
        },
      };

      const next = jest.fn().mockResolvedValue({ id: '1' });
      await middleware(params, next);

      expect(typeof params.args.data.chronicDiseases).toBe('string');
      expect(params.args.data.chronicDiseases).not.toBe(JSON.stringify(diseases));
    });

    it('should decrypt chronicDiseases on findUnique', async () => {
      const diseases = { hypertension: true, diabetes: false };
      const encrypted = encryptionService.encrypt(JSON.stringify(diseases));

      const params = {
        model: 'HealthRecord',
        action: 'findUnique',
        args: { where: { id: '1' } },
      };

      const next = jest.fn().mockResolvedValue({ id: '1', chronicDiseases: encrypted });
      const result = await middleware(params, next);

      expect(result.chronicDiseases).toEqual(diseases);
    });

    it('should handle multiple encrypted fields', async () => {
      const diseases = { hypertension: true };
      const allergies = { penicillin: true };
      const family = { father: 'diabetes' };

      const params = {
        model: 'HealthRecord',
        action: 'create',
        args: {
          data: {
            userId: '1',
            chronicDiseases: diseases,
            allergies,
            familyHistory: family,
          },
        },
      };

      const next = jest.fn().mockResolvedValue({ id: '1' });
      await middleware(params, next);

      expect(typeof params.args.data.chronicDiseases).toBe('string');
      expect(typeof params.args.data.allergies).toBe('string');
      expect(typeof params.args.data.familyHistory).toBe('string');
    });
  });

  describe('upsert operation', () => {
    it('should encrypt both create and update data', async () => {
      const idCard1 = '123456789012345678';
      const idCard2 = '987654321098765432';

      const params = {
        model: 'User',
        action: 'upsert',
        args: {
          where: { id: '1' },
          create: { username: 'test', idCardEncrypted: idCard1 },
          update: { idCardEncrypted: idCard2 },
        },
      };

      const next = jest.fn().mockResolvedValue({ id: '1' });
      await middleware(params, next);

      expect(params.args.create.idCardEncrypted).not.toBe(idCard1);
      expect(params.args.update.idCardEncrypted).not.toBe(idCard2);
    });
  });

  describe('non-encrypted models', () => {
    it('should not modify data for models without encrypted fields', async () => {
      const params = {
        model: 'CheckIn',
        action: 'create',
        args: {
          data: {
            userId: '1',
            type: 'BLOOD_PRESSURE',
            data: { systolic: 120 },
          },
        },
      };

      const originalData = { ...params.args.data };
      const next = jest.fn().mockResolvedValue({ id: '1' });
      await middleware(params, next);

      expect(params.args.data).toEqual(originalData);
    });
  });

  describe('error handling', () => {
    it('should handle decryption failure gracefully', async () => {
      const params = {
        model: 'User',
        action: 'findUnique',
        args: { where: { id: '1' } },
      };

      const next = jest.fn().mockResolvedValue({ id: '1', idCardEncrypted: 'invalid:data:here' });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = await middleware(params, next);

      expect(result.idCardEncrypted).toBe('invalid:data:here');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle null values', async () => {
      const params = {
        model: 'User',
        action: 'create',
        args: {
          data: {
            username: 'test',
            idCardEncrypted: null,
          },
        },
      };

      const next = jest.fn().mockResolvedValue({ id: '1' });
      await middleware(params, next);

      expect(params.args.data.idCardEncrypted).toBeNull();
    });

    it('should handle undefined values', async () => {
      const params = {
        model: 'User',
        action: 'create',
        args: {
          data: {
            username: 'test',
          } as any,
        },
      };

      const next = jest.fn().mockResolvedValue({ id: '1' });
      await middleware(params, next);

      expect((params.args.data as any).idCardEncrypted).toBeUndefined();
    });
  });
});
