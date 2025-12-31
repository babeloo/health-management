import { EncryptionService } from './encryption.service';

const ENCRYPTED_FIELDS: Record<string, string[]> = {
  User: ['idCardEncrypted'],
  HealthRecord: ['chronicDiseases', 'allergies', 'familyHistory'],
};

function encryptFields(data: any, fields: string[], encryptionService: EncryptionService): any {
  const encrypted = { ...data };

  for (const field of fields) {
    if (encrypted[field] && typeof encrypted[field] === 'string') {
      encrypted[field] = encryptionService.encrypt(encrypted[field]);
    } else if (encrypted[field] && typeof encrypted[field] === 'object') {
      encrypted[field] = encryptionService.encrypt(JSON.stringify(encrypted[field]));
    }
  }

  return encrypted;
}

function decryptFields(data: any, fields: string[], encryptionService: EncryptionService): any {
  if (!data) return data;

  const decrypted = { ...data };

  for (const field of fields) {
    if (decrypted[field] && typeof decrypted[field] === 'string') {
      try {
        const decryptedValue = encryptionService.decrypt(decrypted[field]);
        // Try to parse as JSON for object fields
        try {
          decrypted[field] = JSON.parse(decryptedValue);
        } catch {
          decrypted[field] = decryptedValue;
        }
      } catch (error) {
        // If decryption fails, keep original value (might be unencrypted legacy data)
        console.warn(`Failed to decrypt field ${field}:`, error.message);
      }
    }
  }

  return decrypted;
}

export function createEncryptionMiddleware(encryptionService: EncryptionService) {
  return async (params: any, next: any) => {
    const model = params.model as string;
    const encryptedFields = ENCRYPTED_FIELDS[model];

    if (!encryptedFields) {
      return next(params);
    }

    // Encrypt data before write operations
    if (['create', 'update', 'upsert'].includes(params.action)) {
      if (params.action === 'create' && params.args.data) {
        params.args.data = encryptFields(params.args.data, encryptedFields, encryptionService);
      } else if (params.action === 'update' && params.args.data) {
        params.args.data = encryptFields(params.args.data, encryptedFields, encryptionService);
      } else if (params.action === 'upsert') {
        if (params.args.create) {
          params.args.create = encryptFields(
            params.args.create,
            encryptedFields,
            encryptionService,
          );
        }
        if (params.args.update) {
          params.args.update = encryptFields(
            params.args.update,
            encryptedFields,
            encryptionService,
          );
        }
      }
    }

    const result = await next(params);

    // Decrypt data after read operations
    if (['findUnique', 'findFirst', 'findMany'].includes(params.action)) {
      if (Array.isArray(result)) {
        return result.map((item) => decryptFields(item, encryptedFields, encryptionService));
      }
      if (result) {
        return decryptFields(result, encryptedFields, encryptionService);
      }
    }

    return result;
  };
}
