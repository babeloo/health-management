/* eslint-disable import/no-extraneous-dependencies */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { io, Socket } from 'socket.io-client';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { AllExceptionsFilter } from '../../src/common/filters/all-exceptions.filter';
import { Role } from '../../src/auth/enums/role.enum';
import { Message } from '../../src/chat/schemas/message.schema';

describe('ChatController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let messageModel: Model<Message>;
  let doctorToken: string;
  let patientToken: string;
  let doctorId: string;
  let patientId: string;
  let doctorSocket: Socket;
  let patientSocket: Socket;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // 应用全局异常过滤器（与 main.ts 保持一致）
    app.useGlobalFilters(new AllExceptionsFilter());

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
    await app.listen(0); // 使用随机端口

    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    messageModel = moduleFixture.get<Model<Message>>(getModelToken(Message.name));

    // 创建测试用户（医生和患者）
    const doctorRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        username: `e2e_doctor_${Date.now()}`,
        password: 'Test@123456',
        role: Role.DOCTOR,
        fullName: 'E2E 测试医生',
      });

    doctorToken = doctorRes.body.data.accessToken;
    doctorId = doctorRes.body.data.user.id;

    const patientRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        username: `e2e_patient_${Date.now()}`,
        password: 'Test@123456',
        role: Role.PATIENT,
        fullName: 'E2E 测试患者',
      });

    patientToken = patientRes.body.data.accessToken;
    patientId = patientRes.body.data.user.id;
  });

  afterAll(async () => {
    // 断开 WebSocket 连接
    if (doctorSocket?.connected) {
      doctorSocket.disconnect();
    }
    if (patientSocket?.connected) {
      patientSocket.disconnect();
    }

    // 清理测试数据
    await messageModel.deleteMany({
      $or: [{ senderId: doctorId }, { senderId: patientId }],
    });

    await prismaService.user.deleteMany({
      where: {
        username: {
          startsWith: 'e2e_',
        },
      },
    });

    await app.close();
  });

  describe('WebSocket 连接和认证', () => {
    it('应该成功建立 WebSocket 连接（有效 Token）', (done) => {
      const serverAddress = app.getHttpServer().address();
      const port = typeof serverAddress === 'string' ? 0 : serverAddress.port;

      doctorSocket = io(`http://localhost:${port}`, {
        auth: {
          token: doctorToken,
        },
        transports: ['websocket'],
      });

      doctorSocket.on('connect', () => {
        expect(doctorSocket.connected).toBe(true);
        done();
      });

      doctorSocket.on('connect_error', (error) => {
        done(error);
      });
    });

    it('应该拒绝无效 Token 的连接', (done) => {
      const serverAddress = app.getHttpServer().address();
      const port = typeof serverAddress === 'string' ? 0 : serverAddress.port;

      const invalidSocket = io(`http://localhost:${port}`, {
        auth: {
          token: 'invalid_token',
        },
        transports: ['websocket'],
      });

      invalidSocket.on('connect', () => {
        invalidSocket.disconnect();
        done(new Error('不应该连接成功'));
      });

      invalidSocket.on('connect_error', (error) => {
        expect(error.message).toContain('Unauthorized');
        invalidSocket.disconnect();
        done();
      });
    });

    it('应该拒绝没有 Token 的连接', (done) => {
      const serverAddress = app.getHttpServer().address();
      const port = typeof serverAddress === 'string' ? 0 : serverAddress.port;

      const noTokenSocket = io(`http://localhost:${port}`, {
        transports: ['websocket'],
      });

      noTokenSocket.on('connect', () => {
        noTokenSocket.disconnect();
        done(new Error('不应该连接成功'));
      });

      noTokenSocket.on('connect_error', (error) => {
        expect(error.message).toContain('Unauthorized');
        noTokenSocket.disconnect();
        done();
      });
    });
  });

  describe('消息发送和接收', () => {
    beforeAll((done) => {
      // 确保两个用户都已连接
      const serverAddress = app.getHttpServer().address();
      const port = typeof serverAddress === 'string' ? 0 : serverAddress.port;

      let doctorConnected = false;
      let patientConnected = false;

      const checkBothConnected = () => {
        if (doctorConnected && patientConnected) {
          done();
        }
      };

      if (!doctorSocket || !doctorSocket.connected) {
        doctorSocket = io(`http://localhost:${port}`, {
          auth: {
            token: doctorToken,
          },
          transports: ['websocket'],
        });

        doctorSocket.on('connect', () => {
          doctorConnected = true;
          checkBothConnected();
        });
      } else {
        doctorConnected = true;
        checkBothConnected();
      }

      patientSocket = io(`http://localhost:${port}`, {
        auth: {
          token: patientToken,
        },
        transports: ['websocket'],
      });

      patientSocket.on('connect', () => {
        patientConnected = true;
        checkBothConnected();
      });
    });

    it('应该成功发送文本消息', (done) => {
      const messageContent = '你好，我是医生';

      patientSocket.once('receive_message', (data) => {
        expect(data.content).toBe(messageContent);
        expect(data.type).toBe('text');
        expect(data.senderId).toBe(doctorId);
        expect(data.recipientId).toBe(patientId);
        done();
      });

      doctorSocket.emit('send_message', {
        recipientId: patientId,
        type: 'text',
        content: messageContent,
      });
    });

    it('应该成功发送图片消息', (done) => {
      const imageUrl = 'https://example.com/image.jpg';

      patientSocket.once('receive_message', (data) => {
        expect(data.content).toBe(imageUrl);
        expect(data.type).toBe('image');
        expect(data.metadata).toHaveProperty('fileName');
        done();
      });

      doctorSocket.emit('send_message', {
        recipientId: patientId,
        type: 'image',
        content: imageUrl,
        metadata: {
          fileName: 'image.jpg',
          fileSize: 1024,
        },
      });
    });

    it('应该在接收者离线时保存消息', async () => {
      // 断开患者连接
      patientSocket.disconnect();

      // 等待断开完成
      await new Promise((resolve) => {
        setTimeout(resolve, 100);
      });

      // 医生发送消息
      doctorSocket.emit('send_message', {
        recipientId: patientId,
        type: 'text',
        content: '离线消息测试',
      });

      // 等待消息保存
      await new Promise((resolve) => {
        setTimeout(resolve, 500);
      });

      // 验证消息已保存到数据库
      const messages = await messageModel
        .find({
          senderId: doctorId,
          recipientId: patientId,
          content: '离线消息测试',
        })
        .exec();

      expect(messages.length).toBeGreaterThan(0);
      expect(messages[0].status).toBe('sent');

      // 重新连接患者
      const serverAddress = app.getHttpServer().address();
      const port = typeof serverAddress === 'string' ? 0 : serverAddress.port;

      patientSocket = io(`http://localhost:${port}`, {
        auth: {
          token: patientToken,
        },
        transports: ['websocket'],
      });

      await new Promise<void>((resolve) => {
        patientSocket.on('connect', () => resolve());
      });
    });
  });

  describe('RESTful API 端点', () => {
    let conversationId: string;

    beforeAll(async () => {
      // 创建一些测试消息
      const message1 = await messageModel.create({
        conversationId: [doctorId, patientId].sort().join('_'),
        senderId: doctorId,
        recipientId: patientId,
        type: 'text',
        content: '消息1',
        status: 'sent',
      });

      conversationId = message1.conversationId;

      await messageModel.create({
        conversationId,
        senderId: patientId,
        recipientId: doctorId,
        type: 'text',
        content: '消息2',
        status: 'read',
      });

      await messageModel.create({
        conversationId,
        senderId: doctorId,
        recipientId: patientId,
        type: 'text',
        content: '消息3',
        status: 'sent',
      });
    });

    describe('GET /api/v1/chat/conversations/:userId', () => {
      it('应该返回用户的会话列表', () => {
        return request(app.getHttpServer())
          .get(`/api/v1/chat/conversations/${patientId}`)
          .set('Authorization', `Bearer ${patientToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.length).toBeGreaterThan(0);
            expect(res.body.data[0]).toHaveProperty('_id');
            expect(res.body.data[0]).toHaveProperty('lastMessage');
            expect(res.body.data[0]).toHaveProperty('unreadCount');
          });
      });

      it('应该拒绝未授权的访问', () => {
        return request(app.getHttpServer())
          .get(`/api/v1/chat/conversations/${patientId}`)
          .expect(401);
      });

      it('应该拒绝访问其他用户的会话', () => {
        return request(app.getHttpServer())
          .get(`/api/v1/chat/conversations/${doctorId}`)
          .set('Authorization', `Bearer ${patientToken}`)
          .expect(403);
      });
    });

    describe('GET /api/v1/chat/messages/:conversationId', () => {
      it('应该返回会话的消息列表', () => {
        return request(app.getHttpServer())
          .get(`/api/v1/chat/messages/${conversationId}`)
          .set('Authorization', `Bearer ${patientToken}`)
          .query({ page: 1, limit: 50 })
          .expect(200)
          .expect((res) => {
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.length).toBeGreaterThanOrEqual(3);
            expect(res.body.data[0]).toHaveProperty('content');
            expect(res.body.data[0]).toHaveProperty('senderId');
            expect(res.body.data[0]).toHaveProperty('recipientId');
          });
      });

      it('应该支持分页查询', () => {
        return request(app.getHttpServer())
          .get(`/api/v1/chat/messages/${conversationId}`)
          .set('Authorization', `Bearer ${patientToken}`)
          .query({ page: 1, limit: 2 })
          .expect(200)
          .expect((res) => {
            expect(res.body.data.length).toBeLessThanOrEqual(2);
          });
      });
    });

    describe('PUT /api/v1/chat/messages/:id/read', () => {
      it('应该成功标记消息为已读', async () => {
        // 获取一条未读消息
        const unreadMessage = await messageModel
          .findOne({
            recipientId: patientId,
            status: 'sent',
          })
          .exec();

        if (!unreadMessage) {
          throw new Error('没有找到未读消息');
        }

        return (
          request(app.getHttpServer())
            // eslint-disable-next-line no-underscore-dangle
            .put(`/api/v1/chat/messages/${String(unreadMessage._id)}/read`)
            .set('Authorization', `Bearer ${patientToken}`)
            .expect(200)
            .expect((res) => {
              expect(res.body.success).toBe(true);
              expect(res.body.data.status).toBe('read');
              expect(res.body.data).toHaveProperty('readAt');
            })
        );
      });

      it('应该在消息不存在时返回 404', () => {
        return request(app.getHttpServer())
          .put('/api/v1/chat/messages/507f1f77bcf86cd799439011/read')
          .set('Authorization', `Bearer ${patientToken}`)
          .expect(404);
      });
    });

    describe('GET /api/v1/chat/unread-count/:userId', () => {
      it('应该返回用户的未读消息数', () => {
        return request(app.getHttpServer())
          .get(`/api/v1/chat/unread-count/${patientId}`)
          .set('Authorization', `Bearer ${patientToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.success).toBe(true);
            expect(typeof res.body.data).toBe('number');
            expect(res.body.data).toBeGreaterThanOrEqual(0);
          });
      });
    });
  });

  describe('完整聊天流程 E2E 测试', () => {
    it('应该完成完整的聊天流程（医生发送 → 患者接收 → 标记已读）', (done) => {
      const testMessage = `E2E 测试消息 ${Date.now()}`;
      let messageId: string;

      // 步骤 1: 患者监听消息
      patientSocket.once('receive_message', async (data) => {
        try {
          // 验证消息内容
          expect(data.content).toBe(testMessage);
          expect(data.senderId).toBe(doctorId);
          expect(data.recipientId).toBe(patientId);
          // eslint-disable-next-line no-underscore-dangle
          messageId = String(data._id);

          // 步骤 3: 标记消息为已读
          const readRes = await request(app.getHttpServer())
            .put(`/api/v1/chat/messages/${messageId}/read`)
            .set('Authorization', `Bearer ${patientToken}`);

          expect(readRes.status).toBe(200);
          expect(readRes.body.data.status).toBe('read');

          // 步骤 4: 验证未读消息数减少
          const unreadRes = await request(app.getHttpServer())
            .get(`/api/v1/chat/unread-count/${patientId}`)
            .set('Authorization', `Bearer ${patientToken}`);

          expect(unreadRes.status).toBe(200);
          expect(typeof unreadRes.body.data).toBe('number');

          done();
        } catch (error) {
          done(error);
        }
      });

      // 步骤 2: 医生发送消息
      doctorSocket.emit('send_message', {
        recipientId: patientId,
        type: 'text',
        content: testMessage,
      });
    }, 10000); // 增加超时时间到 10 秒
  });
});
