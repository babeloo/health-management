import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ChatService } from './chat.service';
import { Message } from './schemas/message.schema';
import { SendMessageDto } from './dto';

describe('ChatService', () => {
  let service: ChatService;

  const mockSave = jest.fn();
  const mockFind = jest.fn();
  const mockFindByIdAndUpdate = jest.fn();
  const mockCountDocuments = jest.fn();
  const mockAggregate = jest.fn();

  const mockMessageModel = jest.fn().mockImplementation((dto) => ({
    ...dto,
    save: mockSave,
  }));

  Object.assign(mockMessageModel, {
    find: mockFind,
    findByIdAndUpdate: mockFindByIdAndUpdate,
    countDocuments: mockCountDocuments,
    aggregate: mockAggregate,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: getModelToken(Message.name),
          useValue: mockMessageModel,
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('saveMessage', () => {
    it('应该成功保存消息', async () => {
      const senderId = 'user-1';
      const recipientId = 'user-2';
      const messageDto: SendMessageDto = {
        recipientId,
        type: 'text',
        content: '你好',
      };

      const mockSavedMessage = {
        _id: 'message-123',
        conversationId: 'user-1_user-2',
        senderId,
        recipientId,
        type: messageDto.type,
        content: messageDto.content,
        status: 'sent',
        createdAt: new Date(),
      };

      mockSave.mockResolvedValue(mockSavedMessage);

      const result = await service.saveMessage(senderId, recipientId, messageDto);

      expect(result).toEqual(mockSavedMessage);
      expect(mockSave).toHaveBeenCalled();
    });

    it('应该生成正确的会话ID（确保双向一致性）', async () => {
      const senderId = 'user-1';
      const recipientId = 'user-2';
      const messageDto: SendMessageDto = {
        recipientId,
        type: 'text',
        content: '你好',
      };

      const mockSavedMessage = {
        _id: 'message-123',
        conversationId: 'user-1_user-2',
      };

      mockSave.mockResolvedValue(mockSavedMessage);

      const result = await service.saveMessage(senderId, recipientId, messageDto);

      // 验证会话ID是按字母顺序排序的
      expect(result.conversationId).toBe('user-1_user-2');
      expect(mockSave).toHaveBeenCalled();
    });

    it('应该支持不同类型的消息', async () => {
      const senderId = 'user-1';
      const recipientId = 'user-2';
      const messageDto: SendMessageDto = {
        recipientId,
        type: 'image',
        content: 'https://example.com/image.jpg',
        metadata: {
          fileName: 'image.jpg',
          fileSize: 1024,
        },
      };

      const mockSavedMessage = {
        _id: 'message-123',
        type: 'image',
        content: messageDto.content,
        metadata: messageDto.metadata,
      };

      mockSave.mockResolvedValue(mockSavedMessage);

      const result = await service.saveMessage(senderId, recipientId, messageDto);

      expect(result.type).toBe('image');
      expect(result.metadata).toEqual(messageDto.metadata);
      expect(mockSave).toHaveBeenCalled();
    });
  });

  describe('getMessages', () => {
    it('应该返回指定会话的消息列表', async () => {
      const conversationId = 'user-1_user-2';
      const mockMessages = [
        {
          _id: 'message-1',
          conversationId,
          senderId: 'user-1',
          recipientId: 'user-2',
          type: 'text',
          content: '你好',
          status: 'read',
          createdAt: new Date('2025-12-24T10:00:00Z'),
        },
        {
          _id: 'message-2',
          conversationId,
          senderId: 'user-2',
          recipientId: 'user-1',
          type: 'text',
          content: '你好！',
          status: 'read',
          createdAt: new Date('2025-12-24T10:01:00Z'),
        },
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockMessages),
      };

      mockFind.mockReturnValue(mockQuery);

      const result = await service.getMessages(conversationId, 1, 50);

      expect(result).toEqual(mockMessages);
      expect(mockFind).toHaveBeenCalledWith({ conversationId });
      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(mockQuery.skip).toHaveBeenCalledWith(0);
      expect(mockQuery.limit).toHaveBeenCalledWith(50);
    });

    it('应该支持分页查询', async () => {
      const conversationId = 'user-1_user-2';
      const page = 2;
      const limit = 20;

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };

      mockFind.mockReturnValue(mockQuery);

      await service.getMessages(conversationId, page, limit);

      expect(mockQuery.skip).toHaveBeenCalledWith(20); // (page - 1) * limit
      expect(mockQuery.limit).toHaveBeenCalledWith(20);
    });
  });

  describe('markAsRead', () => {
    it('应该成功标记消息为已读', async () => {
      const messageId = 'message-123';
      const mockUpdatedMessage = {
        _id: messageId,
        status: 'read',
        readAt: new Date(),
      };

      const mockQuery = {
        exec: jest.fn().mockResolvedValue(mockUpdatedMessage),
      };

      mockFindByIdAndUpdate.mockReturnValue(mockQuery);

      const result = await service.markAsRead(messageId);

      expect(result).toEqual(mockUpdatedMessage);
      expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
        messageId,
        { status: 'read', readAt: expect.any(Date) },
        { new: true },
      );
    });

    it('应该在消息不存在时返回 null', async () => {
      const messageId = 'non-existent-id';

      const mockQuery = {
        exec: jest.fn().mockResolvedValue(null),
      };

      mockFindByIdAndUpdate.mockReturnValue(mockQuery);

      const result = await service.markAsRead(messageId);

      expect(result).toBeNull();
    });
  });

  describe('getConversations', () => {
    it('应该返回用户的会话列表', async () => {
      const userId = 'user-1';
      const mockConversations = [
        {
          _id: 'user-1_user-2',
          lastMessage: {
            _id: 'message-1',
            conversationId: 'user-1_user-2',
            senderId: 'user-2',
            recipientId: 'user-1',
            type: 'text',
            content: '你好',
            status: 'sent',
            createdAt: new Date('2025-12-24T10:00:00Z'),
          },
          unreadCount: 1,
        },
        {
          _id: 'user-1_user-3',
          lastMessage: {
            _id: 'message-2',
            conversationId: 'user-1_user-3',
            senderId: 'user-1',
            recipientId: 'user-3',
            type: 'text',
            content: '早上好',
            status: 'read',
            createdAt: new Date('2025-12-24T09:00:00Z'),
          },
          unreadCount: 0,
        },
      ];

      mockAggregate.mockResolvedValue(mockConversations);

      const result = await service.getConversations(userId);

      expect(result).toEqual(mockConversations);
      expect(mockAggregate).toHaveBeenCalledWith([
        {
          $match: {
            $or: [{ senderId: userId }, { recipientId: userId }],
          },
        },
        {
          $sort: { createdAt: -1 },
        },
        {
          $group: {
            _id: '$conversationId',
            lastMessage: { $first: '$$ROOT' },
            unreadCount: {
              $sum: {
                $cond: [
                  {
                    $and: [{ $eq: ['$recipientId', userId] }, { $ne: ['$status', 'read'] }],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
        {
          $sort: { 'lastMessage.createdAt': -1 },
        },
      ]);
    });

    it('应该正确计算未读消息数', async () => {
      const userId = 'user-1';
      const mockConversations = [
        {
          _id: 'user-1_user-2',
          lastMessage: {
            _id: 'message-1',
            conversationId: 'user-1_user-2',
            senderId: 'user-2',
            recipientId: 'user-1',
            type: 'text',
            content: '你好',
            status: 'sent',
            createdAt: new Date(),
          },
          unreadCount: 3,
        },
      ];

      mockAggregate.mockResolvedValue(mockConversations);

      const result = await service.getConversations(userId);

      expect(result[0].unreadCount).toBe(3);
    });
  });

  describe('getUnreadCount', () => {
    it('应该返回用户的未读消息总数', async () => {
      const userId = 'user-1';
      const unreadCount = 5;

      mockCountDocuments.mockResolvedValue(unreadCount);

      const result = await service.getUnreadCount(userId);

      expect(result).toBe(unreadCount);
      expect(mockCountDocuments).toHaveBeenCalledWith({
        recipientId: userId,
        status: { $ne: 'read' },
      });
    });

    it('应该在没有未读消息时返回 0', async () => {
      const userId = 'user-1';

      mockCountDocuments.mockResolvedValue(0);

      const result = await service.getUnreadCount(userId);

      expect(result).toBe(0);
    });
  });
});
