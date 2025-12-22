/* eslint-disable import/no-extraneous-dependencies */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { Role } from '../../src/auth/enums/role.enum';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

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

    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    // 清理测试数据
    await prismaService.user.deleteMany({
      where: {
        username: {
          startsWith: 'e2e_test_',
        },
      },
    });

    await app.close();
  });

  describe('/auth/register (POST)', () => {
    it('应该成功注册新用户', () => {
      const registerDto = {
        username: `e2e_test_user_${Date.now()}`,
        password: 'Test@123456',
        email: 'e2e_test@example.com',
        phone: '13800138000',
        role: Role.PATIENT,
        fullName: 'E2E 测试用户',
      };

      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registerDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true);
          expect(res.body).toHaveProperty('message', '注册成功');
          expect(res.body.data).toHaveProperty('accessToken');
          expect(res.body.data).toHaveProperty('refreshToken');
          expect(res.body.data).toHaveProperty('tokenType', 'Bearer');
          expect(res.body.data).toHaveProperty('expiresIn', 900);
          expect(res.body.data.user).toHaveProperty('username', registerDto.username);
          expect(res.body.data.user).toHaveProperty('role', registerDto.role);
          expect(res.body.data.user).not.toHaveProperty('password');
        });
    });

    it('应该在用户名已存在时返回 409 错误', async () => {
      // 先创建一个用户
      const username = `e2e_test_duplicate_${Date.now()}`;
      const registerDto = {
        username,
        password: 'Test@123456',
        role: Role.PATIENT,
      };

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registerDto)
        .expect(201);

      // 尝试用相同用户名再次注册
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registerDto)
        .expect(409)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', false);
          expect(res.body).toHaveProperty('message', '用户名已存在');
        });
    });

    it('应该在密码格式不正确时返回 400 错误', () => {
      const registerDto = {
        username: 'e2e_test_weak_password',
        password: '123', // 弱密码
        role: Role.PATIENT,
      };

      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registerDto)
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', false);
          expect(res.body.message).toContain('密码');
        });
    });

    it('应该在缺少必填字段时返回 400 错误', () => {
      const registerDto = {
        username: 'e2e_test_missing_field',
        // 缺少 password 和 role
      };

      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registerDto)
        .expect(400);
    });

    it('应该在邮箱格式不正确时返回 400 错误', () => {
      const registerDto = {
        username: 'e2e_test_invalid_email',
        password: 'Test@123456',
        email: 'invalid-email', // 无效邮箱
        role: Role.PATIENT,
      };

      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registerDto)
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', false);
          expect(res.body.message).toContain('邮箱');
        });
    });
  });

  describe('/auth/login (POST)', () => {
    let testUser: { username: string; password: string };

    beforeAll(async () => {
      // 创建测试用户
      testUser = {
        username: `e2e_test_login_user_${Date.now()}`,
        password: 'Test@123456',
      };

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          ...testUser,
          role: Role.PATIENT,
        })
        .expect(201);
    });

    it('应该成功登录并返回 Token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send(testUser)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true);
          expect(res.body).toHaveProperty('message', '登录成功');
          expect(res.body.data).toHaveProperty('accessToken');
          expect(res.body.data).toHaveProperty('refreshToken');
          expect(res.body.data.user).toHaveProperty('username', testUser.username);
        });
    });

    it('应该在用户名不存在时返回 401 错误', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          username: 'non_existent_user',
          password: 'Test@123456',
        })
        .expect(401)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', false);
          expect(res.body).toHaveProperty('message', '用户名或密码错误');
        });
    });

    it('应该在密码错误时返回 401 错误', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          username: testUser.username,
          password: 'WrongPassword@123',
        })
        .expect(401)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', false);
          expect(res.body).toHaveProperty('message', '用户名或密码错误');
        });
    });

    it('应该更新最后登录时间', async () => {
      // 登录
      await request(app.getHttpServer()).post('/api/v1/auth/login').send(testUser).expect(200);

      // 验证数据库中的 lastLoginAt 已更新
      const user = await prismaService.user.findUnique({
        where: { username: testUser.username },
      });

      expect(user?.lastLoginAt).toBeDefined();
      expect(user?.lastLoginAt).toBeInstanceOf(Date);
    });
  });

  describe('/auth/refresh (POST)', () => {
    let refreshToken: string;

    beforeAll(async () => {
      // 创建测试用户并获取 Refresh Token
      const username = `e2e_test_refresh_user_${Date.now()}`;
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          username,
          password: 'Test@123456',
          role: Role.PATIENT,
        })
        .expect(201);

      refreshToken = response.body.data.refreshToken;
    });

    it('应该成功刷新 Token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true);
          expect(res.body).toHaveProperty('message', 'Token 刷新成功');
          expect(res.body.data).toHaveProperty('accessToken');
          expect(res.body.data).toHaveProperty('refreshToken');
          // 新的 Token 应该与旧的不同
          expect(res.body.data.refreshToken).not.toBe(refreshToken);
        });
    });

    it('应该在 Refresh Token 无效时返回 401 错误', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-refresh-token' })
        .expect(401)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', false);
          expect(res.body).toHaveProperty('message', 'Refresh Token 无效或已过期');
        });
    });
  });

  describe('/auth/me (GET)', () => {
    let accessToken: string;
    let testUser: { username: string; role: string };

    beforeAll(async () => {
      // 创建测试用户并获取 Access Token
      const username = `e2e_test_me_user_${Date.now()}`;
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          username,
          password: 'Test@123456',
          role: Role.PATIENT,
          fullName: 'Me Test User',
        })
        .expect(201);

      accessToken = response.body.data.accessToken;
      testUser = {
        username,
        role: Role.PATIENT,
      };
    });

    it('应该返回当前用户信息', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true);
          expect(res.body.data).toHaveProperty('username', testUser.username);
          expect(res.body.data).toHaveProperty('role', testUser.role);
          expect(res.body.data).not.toHaveProperty('password');
        });
    });

    it('应该在未提供 Token 时返回 401 错误', () => {
      return request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    });

    it('应该在 Token 无效时返回 401 错误', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('完整认证流程 (E2E)', () => {
    it('应该完成完整的注册-登录-刷新-获取用户信息流程', async () => {
      const username = `e2e_test_full_flow_${Date.now()}`;
      const password = 'Test@123456';

      // 1. 注册
      const registerResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          username,
          password,
          role: Role.PATIENT,
          fullName: 'Full Flow Test User',
        })
        .expect(201);

      expect(registerResponse.body.data).toHaveProperty('accessToken');
      expect(registerResponse.body.data).toHaveProperty('refreshToken');

      const firstAccessToken = registerResponse.body.data.accessToken;
      const firstRefreshToken = registerResponse.body.data.refreshToken;

      // 2. 使用 Access Token 获取用户信息
      const meResponse1 = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${firstAccessToken}`)
        .expect(200);

      expect(meResponse1.body.data).toHaveProperty('username', username);

      // 3. 登录
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username, password })
        .expect(200);

      expect(loginResponse.body.data).toHaveProperty('accessToken');
      expect(loginResponse.body.data).toHaveProperty('refreshToken');

      // 4. 刷新 Token
      const refreshResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: firstRefreshToken })
        .expect(200);

      expect(refreshResponse.body.data).toHaveProperty('accessToken');
      expect(refreshResponse.body.data).toHaveProperty('refreshToken');

      const newAccessToken = refreshResponse.body.data.accessToken;

      // 5. 使用新的 Access Token 获取用户信息
      const meResponse2 = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200);

      expect(meResponse2.body.data).toHaveProperty('username', username);
    });
  });
});
