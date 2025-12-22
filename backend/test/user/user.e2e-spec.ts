/* eslint-disable import/no-extraneous-dependencies */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { Role } from '../../src/auth/enums/role.enum';

describe('UserController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let patientToken: string;
  let patientUserId: string;
  let adminToken: string;
  let adminUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // 应用全局管道（与 main.ts 保持一致）
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // 设置全局前缀（与 main.ts 保持一致）
    app.setGlobalPrefix('api/v1');

    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);

    // 创建测试用户（患者）
    const patientRegisterDto = {
      username: `e2e_patient_${Date.now()}`,
      password: 'Test@123456',
      email: 'e2e_patient@example.com',
      phone: '13800138001',
      role: Role.PATIENT,
      fullName: 'E2E 患者用户',
    };

    const patientResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(patientRegisterDto);

    patientToken = patientResponse.body.data.accessToken;
    patientUserId = patientResponse.body.data.user.id;

    // 创建测试用户（管理员）
    const adminRegisterDto = {
      username: `e2e_admin_${Date.now()}`,
      password: 'Test@123456',
      email: 'e2e_admin@example.com',
      phone: '13800138002',
      role: Role.ADMIN,
      fullName: 'E2E 管理员用户',
    };

    const adminResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(adminRegisterDto);

    adminToken = adminResponse.body.data.accessToken;
    adminUserId = adminResponse.body.data.user.id;
  });

  afterAll(async () => {
    // 清理测试数据
    await prismaService.user.deleteMany({
      where: {
        username: {
          startsWith: 'e2e_',
        },
      },
    });

    await app.close();
  });

  describe('/users/:id (GET)', () => {
    it('应该成功获取用户自己的信息', () =>
      request(app.getHttpServer())
        .get(`/api/v1/users/${patientUserId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true);
          expect(res.body.data).toHaveProperty('id', patientUserId);
          expect(res.body.data).toHaveProperty('username');
          expect(res.body.data).not.toHaveProperty('password');
        }));

    it('应该允许管理员查看其他用户信息', () =>
      request(app.getHttpServer())
        .get(`/api/v1/users/${patientUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true);
          expect(res.body.data).toHaveProperty('id', patientUserId);
        }));

    it('应该在未认证时返回 401 错误', () =>
      request(app.getHttpServer()).get(`/api/v1/users/${patientUserId}`).expect(401));

    it('应该在非管理员尝试查看其他用户信息时返回 403 错误', () =>
      request(app.getHttpServer())
        .get(`/api/v1/users/${adminUserId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(403));

    it('应该在用户不存在时返回 404 错误', () =>
      request(app.getHttpServer())
        .get('/api/v1/users/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404));
  });

  describe('/users/:id (PUT)', () => {
    it('应该成功更新用户自己的信息', () => {
      const updateDto = {
        fullName: '更新后的姓名',
        gender: 'MALE',
        birthDate: '1990-01-01',
      };

      return request(app.getHttpServer())
        .put(`/api/v1/users/${patientUserId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send(updateDto)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true);
          expect(res.body).toHaveProperty('message', '用户信息更新成功');
          expect(res.body.data).toHaveProperty('fullName', '更新后的姓名');
          expect(res.body.data).toHaveProperty('gender', 'MALE');
        });
    });

    it('应该允许管理员更新其他用户信息', () => {
      const updateDto = {
        fullName: '管理员更新的姓名',
      };

      return request(app.getHttpServer())
        .put(`/api/v1/users/${patientUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateDto)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true);
          expect(res.body.data).toHaveProperty('fullName', '管理员更新的姓名');
        });
    });

    it('应该在非管理员尝试更新其他用户信息时返回 403 错误', () => {
      const updateDto = {
        fullName: '非法更新',
      };

      return request(app.getHttpServer())
        .put(`/api/v1/users/${adminUserId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send(updateDto)
        .expect(403);
    });

    it('应该在数据验证失败时返回 400 错误', () => {
      const invalidDto = {
        gender: 'INVALID_GENDER', // 无效的性别值
      };

      return request(app.getHttpServer())
        .put(`/api/v1/users/${patientUserId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send(invalidDto)
        .expect(400);
    });
  });

  describe('/users (GET)', () => {
    it('应该成功获取用户列表（管理员）', () =>
      request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true);
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body).toHaveProperty('pagination');
          expect(res.body.pagination).toHaveProperty('page');
          expect(res.body.pagination).toHaveProperty('limit');
          expect(res.body.pagination).toHaveProperty('total');
          expect(res.body.pagination).toHaveProperty('totalPages');
        }));

    it('应该支持分页参数', () =>
      request(app.getHttpServer())
        .get('/api/v1/users?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.pagination).toHaveProperty('page', 1);
          expect(res.body.pagination).toHaveProperty('limit', 10);
        }));

    it('应该支持角色筛选', () =>
      request(app.getHttpServer())
        .get('/api/v1/users?role=PATIENT')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true);
          // 验证返回的用户都是 PATIENT 角色
          if (res.body.data.length > 0) {
            res.body.data.forEach((user: { role: string }) => {
              expect(user.role).toBe('PATIENT');
            });
          }
        }));

    it('应该支持关键词搜索', () =>
      request(app.getHttpServer())
        .get('/api/v1/users?search=e2e')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true);
        }));

    it('应该在非管理员尝试访问用户列表时返回 403 错误', () =>
      request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(403));
  });

  describe('/users/:id/avatar (POST)', () => {
    // 创建一个简单的测试图片 buffer（1x1 PNG）
    const createTestImageBuffer = () => {
      // 1x1 透明 PNG 图片的 base64 编码
      const base64Image =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      return Buffer.from(base64Image, 'base64');
    };

    it('应该成功上传用户自己的头像', () => {
      const imageBuffer = createTestImageBuffer();

      return request(app.getHttpServer())
        .post(`/api/v1/users/${patientUserId}/avatar`)
        .set('Authorization', `Bearer ${patientToken}`)
        .attach('file', imageBuffer, 'avatar.png')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true);
          expect(res.body).toHaveProperty('message', '头像上传成功');
          expect(res.body.data).toHaveProperty('avatarUrl');
          expect(res.body.data.avatarUrl).toContain('http');
        });
    });

    it('应该允许管理员上传其他用户的头像', () => {
      const imageBuffer = createTestImageBuffer();

      return request(app.getHttpServer())
        .post(`/api/v1/users/${patientUserId}/avatar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', imageBuffer, 'avatar.png')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true);
          expect(res.body.data).toHaveProperty('avatarUrl');
        });
    });

    it('应该在非管理员尝试上传其他用户头像时返回 403 错误', () => {
      const imageBuffer = createTestImageBuffer();

      return request(app.getHttpServer())
        .post(`/api/v1/users/${adminUserId}/avatar`)
        .set('Authorization', `Bearer ${patientToken}`)
        .attach('file', imageBuffer, 'avatar.png')
        .expect(403);
    });

    it('应该在未认证时返回 401 错误', () => {
      const imageBuffer = createTestImageBuffer();

      return request(app.getHttpServer())
        .post(`/api/v1/users/${patientUserId}/avatar`)
        .attach('file', imageBuffer, 'avatar.png')
        .expect(401);
    });

    it('应该在文件大小超过限制时返回 400 错误', () => {
      // 创建一个超过 5MB 的 buffer
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB

      return request(app.getHttpServer())
        .post(`/api/v1/users/${patientUserId}/avatar`)
        .set('Authorization', `Bearer ${patientToken}`)
        .attach('file', largeBuffer, 'large-avatar.png')
        .expect(400);
    });

    it('应该在文件类型不支持时返回 400 错误', () => {
      const textBuffer = Buffer.from('This is a text file');

      return request(app.getHttpServer())
        .post(`/api/v1/users/${patientUserId}/avatar`)
        .set('Authorization', `Bearer ${patientToken}`)
        .attach('file', textBuffer, 'avatar.txt')
        .expect(400);
    });
  });

  describe('完整用户注册到信息更新流程 (E2E)', () => {
    it('应该完成完整的用户生命周期流程', async () => {
      // 1. 注册新用户
      const registerDto = {
        username: `e2e_lifecycle_${Date.now()}`,
        password: 'Test@123456',
        email: 'e2e_lifecycle@example.com',
        phone: '13800138999',
        role: Role.PATIENT,
        fullName: 'E2E 生命周期测试',
      };

      const registerResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registerDto)
        .expect(201);

      expect(registerResponse.body).toHaveProperty('success', true);
      const { accessToken } = registerResponse.body.data;
      const { id: userId } = registerResponse.body.data.user;

      // 2. 使用 Token 获取用户信息
      const getUserResponse = await request(app.getHttpServer())
        .get(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(getUserResponse.body.data).toHaveProperty('username', registerDto.username);
      expect(getUserResponse.body.data).toHaveProperty('fullName', registerDto.fullName);

      // 3. 更新用户信息
      const updateDto = {
        fullName: '更新后的完整姓名',
        gender: 'FEMALE',
        birthDate: '1995-05-05',
      };

      const updateResponse = await request(app.getHttpServer())
        .put(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateDto)
        .expect(200);

      expect(updateResponse.body.data).toHaveProperty('fullName', '更新后的完整姓名');
      expect(updateResponse.body.data).toHaveProperty('gender', 'FEMALE');

      // 4. 验证更新后的信息
      const verifyResponse = await request(app.getHttpServer())
        .get(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(verifyResponse.body.data).toHaveProperty('fullName', '更新后的完整姓名');
      expect(verifyResponse.body.data).toHaveProperty('gender', 'FEMALE');

      // 5. 上传头像
      const imageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64',
      );

      const avatarResponse = await request(app.getHttpServer())
        .post(`/api/v1/users/${userId}/avatar`)
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', imageBuffer, 'avatar.png')
        .expect(200);

      expect(avatarResponse.body).toHaveProperty('success', true);
      expect(avatarResponse.body).toHaveProperty('message', '头像上传成功');
      expect(avatarResponse.body.data).toHaveProperty('avatarUrl');

      // 6. 验证头像已更新
      const finalVerifyResponse = await request(app.getHttpServer())
        .get(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(finalVerifyResponse.body.data).toHaveProperty('avatarUrl');
      expect(finalVerifyResponse.body.data.avatarUrl).toContain('http');
    });
  });
});
