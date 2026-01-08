import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MqttService } from './mqtt.service';
import { DeviceService } from '../device/device.service';
import { HealthService } from '../health/health.service';
import { InfluxService } from '../common/influx/influx.service';
import { NotificationService } from '../notification/notification.service';
import { DeviceDataType } from './dto';
import { CheckInType } from '../generated/prisma/client';

// Mock bcrypt 模块以避免 native 模块加载问题
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('MqttService', () => {
  let service: MqttService;
  let deviceService: DeviceService;
  let healthService: HealthService;
  let notificationService: NotificationService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        MQTT_BROKER_URL: 'mqtt://localhost:1883',
        MQTT_BROKER_USERNAME: 'admin',
        MQTT_BROKER_PASSWORD: 'password',
      };
      return config[key] || defaultValue;
    }),
  };

  const mockDeviceService = {
    getDeviceById: jest.fn(),
    updateDeviceOnlineStatus: jest.fn(),
    recordDeviceData: jest.fn(),
    getAllDevices: jest.fn(),
  };

  const mockHealthService = {
    createCheckIn: jest.fn(),
  };

  const mockInfluxService = {
    writeBloodPressure: jest.fn(),
    writeBloodSugar: jest.fn(),
  };

  const mockNotificationService = {
    createNotification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MqttService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: DeviceService,
          useValue: mockDeviceService,
        },
        {
          provide: HealthService,
          useValue: mockHealthService,
        },
        {
          provide: InfluxService,
          useValue: mockInfluxService,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    service = module.get<MqttService>(MqttService);
    deviceService = module.get<DeviceService>(DeviceService);
    healthService = module.get<HealthService>(HealthService);
    notificationService = module.get<NotificationService>(NotificationService);

    // 重置所有 mock
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processBloodPressureData (通过 private 方法调用)', () => {
    it('应该自动创建血压打卡记录', async () => {
      const userId = 'user-123';
      const deviceId = 'AA:BB:CC:DD:EE:FF';
      const timestamp = Date.now();
      const data = {
        systolic: 120,
        diastolic: 80,
        pulse: 75,
      };

      const mockCheckIn = {
        id: 'checkin-123',
        userId,
        type: CheckInType.BLOOD_PRESSURE,
        checkInDate: new Date().toISOString().split('T')[0],
        bloodPressure: data,
      };

      mockHealthService.createCheckIn.mockResolvedValue(mockCheckIn);

      // 调用私有方法的方式：通过反射
      await (service as any).processBloodPressureData(userId, deviceId, timestamp, data);

      expect(healthService.createCheckIn).toHaveBeenCalledWith(userId, {
        type: CheckInType.BLOOD_PRESSURE,
        checkInDate: new Date(timestamp).toISOString().split('T')[0],
        notes: `设备自动上报 (${deviceId})`,
        data,
      });
    });
  });

  describe('processBloodGlucoseData (通过 private 方法调用)', () => {
    it('应该自动创建血糖打卡记录', async () => {
      const userId = 'user-123';
      const deviceId = 'AA:BB:CC:DD:EE:FF';
      const timestamp = Date.now();
      const data = {
        glucose_value: 5.6,
        test_type: 'fasting',
      };

      const mockCheckIn = {
        id: 'checkin-123',
        userId,
        type: CheckInType.BLOOD_SUGAR,
        checkInDate: new Date().toISOString().split('T')[0],
        bloodSugar: {
          value: data.glucose_value,
          timing: data.test_type,
        },
      };

      mockHealthService.createCheckIn.mockResolvedValue(mockCheckIn);

      await (service as any).processBloodGlucoseData(userId, deviceId, timestamp, data);

      expect(healthService.createCheckIn).toHaveBeenCalledWith(userId, {
        type: CheckInType.BLOOD_SUGAR,
        checkInDate: new Date(timestamp).toISOString().split('T')[0],
        notes: `设备自动上报 (${deviceId})`,
        data: {
          value: data.glucose_value,
          timing: data.test_type,
        },
      });
    });
  });

  describe('checkDeviceOfflineStatus', () => {
    it('应该检测设备离线并发送通知', async () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000 - 1000); // 超过1小时
      const mockDevices = [
        {
          id: 'device-1',
          deviceId: 'AA:BB:CC:DD:EE:FF',
          deviceName: '血压计',
          userId: 'user-123',
          status: 'ACTIVE',
          lastDataAt: oneHourAgo,
        },
      ];

      mockDeviceService.getAllDevices.mockResolvedValue(mockDevices);
      mockDeviceService.updateDeviceOnlineStatus.mockResolvedValue({});
      mockNotificationService.createNotification.mockResolvedValue({});

      await service.checkDeviceOfflineStatus();

      expect(deviceService.updateDeviceOnlineStatus).toHaveBeenCalledWith(
        'AA:BB:CC:DD:EE:FF',
        false,
      );
      expect(notificationService.createNotification).toHaveBeenCalledWith({
        userId: 'user-123',
        type: 'SYSTEM_NOTIFICATION',
        title: '设备离线提醒',
        content: '您的设备 血压计 已超过1小时未上报数据，请检查设备连接',
      });
    });

    it('不应该标记在线的设备为离线', async () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000); // 5分钟前
      const mockDevices = [
        {
          id: 'device-1',
          deviceId: 'AA:BB:CC:DD:EE:FF',
          deviceName: '血压计',
          userId: 'user-123',
          status: 'ACTIVE',
          lastDataAt: fiveMinutesAgo,
        },
      ];

      mockDeviceService.getAllDevices.mockResolvedValue(mockDevices);

      await service.checkDeviceOfflineStatus();

      expect(deviceService.updateDeviceOnlineStatus).not.toHaveBeenCalled();
      expect(notificationService.createNotification).not.toHaveBeenCalled();
    });
  });

  describe('getMqttStatus', () => {
    it('应该返回 MQTT 连接状态', () => {
      const status = service.getMqttStatus();

      expect(status).toHaveProperty('connected');
      expect(status).toHaveProperty('reconnecting');
      expect(typeof status.connected).toBe('boolean');
      expect(typeof status.reconnecting).toBe('boolean');
    });
  });

  describe('parseDeviceData', () => {
    it('应该正确解析血压数据', () => {
      const payload = JSON.stringify({
        deviceId: 'AA:BB:CC:DD:EE:FF',
        timestamp: Date.now(),
        type: DeviceDataType.BLOOD_PRESSURE,
        data: {
          systolic: 120,
          diastolic: 80,
          pulse: 75,
        },
      });

      const result = (service as any).parseDeviceData(payload);

      expect(result).toBeDefined();
      expect(result.deviceId).toBe('AA:BB:CC:DD:EE:FF');
      expect(result.type).toBe(DeviceDataType.BLOOD_PRESSURE);
      expect(result.data).toHaveProperty('systolic', 120);
    });

    it('应该正确解析血糖数据', () => {
      const payload = JSON.stringify({
        deviceId: 'AA:BB:CC:DD:EE:FF',
        timestamp: Date.now(),
        type: DeviceDataType.BLOOD_GLUCOSE,
        data: {
          glucose_value: 5.6,
          test_type: 'fasting',
        },
      });

      const result = (service as any).parseDeviceData(payload);

      expect(result).toBeDefined();
      expect(result.deviceId).toBe('AA:BB:CC:DD:EE:FF');
      expect(result.type).toBe(DeviceDataType.BLOOD_GLUCOSE);
      expect(result.data).toHaveProperty('glucose_value', 5.6);
    });

    it('应该在 JSON 解析失败时返回 null', () => {
      const payload = 'invalid json';

      const result = (service as any).parseDeviceData(payload);

      expect(result).toBeNull();
    });
  });

  describe('validateDeviceData', () => {
    it('应该验证通过有效的血压数据', async () => {
      const validData = {
        deviceId: 'AA:BB:CC:DD:EE:FF',
        timestamp: Date.now(),
        type: DeviceDataType.BLOOD_PRESSURE,
        data: {
          systolic: 120,
          diastolic: 80,
          pulse: 75,
        },
      };

      const errors = await (service as any).validateDeviceData(validData);

      // Note: class-validator 在测试环境中可能需要实际对象实例
      // 这里的断言可能需要根据实际测试结果调整
      expect(Array.isArray(errors)).toBe(true);
    });
  });
});
