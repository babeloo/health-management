import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InfluxDB, Point, WriteApi, QueryApi } from '@influxdata/influxdb-client';

/**
 * InfluxDB 查询行接口（标准字段）
 */
interface InfluxRow {
  // InfluxDB 标准字段（下划线是 InfluxDB 协议规范）
  // eslint-disable-next-line no-underscore-dangle
  _time: string;
  // eslint-disable-next-line no-underscore-dangle
  _value?: number;
  // eslint-disable-next-line no-underscore-dangle
  _field?: string;
  // 其他动态字段
  [key: string]: unknown;
}

/**
 * 时序数据点接口
 */
export interface TimeSeriesDataPoint {
  timestamp: Date;
  value: number;
  field?: string;
}

/**
 * 血压时序数据点接口
 */
export interface BloodPressureDataPoint {
  timestamp: Date;
  systolic: number;
  diastolic: number;
  pulse?: number;
}

/**
 * 血糖时序数据点接口
 */
export interface BloodSugarDataPoint {
  timestamp: Date;
  value: number;
  timing: string;
}

/**
 * InfluxDB 服务
 * 提供时序数据写入和查询功能
 */
@Injectable()
export class InfluxService {
  private readonly logger = new Logger(InfluxService.name);

  private readonly client: InfluxDB;

  private readonly writeApi: WriteApi;

  private readonly queryApi: QueryApi;

  private readonly org: string;

  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    // 初始化 InfluxDB 客户端
    const url = this.configService.get<string>('influx.url')!;
    const token = this.configService.get<string>('influx.token')!;
    this.org = this.configService.get<string>('influx.org')!;
    this.bucket = this.configService.get<string>('influx.bucket')!;

    this.client = new InfluxDB({ url, token });
    this.writeApi = this.client.getWriteApi(this.org, this.bucket, 'ms');
    this.queryApi = this.client.getQueryApi(this.org);

    this.logger.log(`InfluxDB 客户端已初始化: ${url}, org=${this.org}, bucket=${this.bucket}`);
  }

  /**
   * 写入血压数据到 InfluxDB
   * @param userId 用户 ID
   * @param checkInId 打卡记录 ID
   * @param data 血压数据 { systolic, diastolic, pulse? }
   * @returns Promise<void>
   */
  async writeBloodPressure(
    userId: string,
    checkInId: string,
    data: { systolic: number; diastolic: number; pulse?: number },
  ): Promise<void> {
    try {
      const point = new Point('blood_pressure')
        .tag('user_id', userId)
        .tag('check_in_id', checkInId)
        .intField('systolic', data.systolic)
        .intField('diastolic', data.diastolic)
        .timestamp(new Date());

      // 如果有脉搏数据，添加到 point
      if (data.pulse !== undefined) {
        point.intField('pulse', data.pulse);
      }

      this.writeApi.writePoint(point);
      await this.writeApi.flush();

      this.logger.log(
        `血压数据写入成功: userId=${userId}, checkInId=${checkInId}, data=${JSON.stringify(data)}`,
      );
    } catch (error) {
      // 降级设计：失败时记录日志但不抛出异常
      this.logger.error(
        `血压数据写入失败: userId=${userId}, checkInId=${checkInId}, error=${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * 写入血糖数据到 InfluxDB
   * @param userId 用户 ID
   * @param checkInId 打卡记录 ID
   * @param data 血糖数据 { value, timing }
   * @returns Promise<void>
   */
  async writeBloodSugar(
    userId: string,
    checkInId: string,
    data: { value: number; timing: string },
  ): Promise<void> {
    try {
      const point = new Point('blood_sugar')
        .tag('user_id', userId)
        .tag('check_in_id', checkInId)
        .tag('timing', data.timing)
        .floatField('value', data.value)
        .timestamp(new Date());

      this.writeApi.writePoint(point);
      await this.writeApi.flush();

      this.logger.log(
        `血糖数据写入成功: userId=${userId}, checkInId=${checkInId}, data=${JSON.stringify(data)}`,
      );
    } catch (error) {
      // 降级设计：失败时记录日志但不抛出异常
      this.logger.error(
        `血糖数据写入失败: userId=${userId}, checkInId=${checkInId}, error=${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * 查询血压时序数据
   * @param userId 用户 ID
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns Promise<BloodPressureDataPoint[]>
   */
  async queryBloodPressure(
    userId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<BloodPressureDataPoint[]> {
    const query = `
      from(bucket: "${this.bucket}")
        |> range(start: ${startTime.toISOString()}, stop: ${endTime.toISOString()})
        |> filter(fn: (r) => r["_measurement"] == "blood_pressure")
        |> filter(fn: (r) => r["user_id"] == "${userId}")
        |> filter(fn: (r) => r["_field"] == "systolic" or r["_field"] == "diastolic" or r["_field"] == "pulse")
        |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
    `;

    try {
      const result: BloodPressureDataPoint[] = [];
      const rows = await this.queryApi.collectRows(query);

      rows.forEach((row: InfluxRow) => {
        // eslint-disable-next-line no-underscore-dangle
        result.push({
          // eslint-disable-next-line no-underscore-dangle
          timestamp: new Date(row._time),
          systolic: (row.systolic as number) || 0,
          diastolic: (row.diastolic as number) || 0,
          pulse: row.pulse as number | undefined,
        });
      });

      this.logger.log(`血压数据查询成功: userId=${userId}, 返回 ${result.length} 条记录`);
      return result;
    } catch (error) {
      this.logger.error(`血压数据查询失败: userId=${userId}, error=${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * 查询血糖时序数据
   * @param userId 用户 ID
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns Promise<BloodSugarDataPoint[]>
   */
  async queryBloodSugar(
    userId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<BloodSugarDataPoint[]> {
    const query = `
      from(bucket: "${this.bucket}")
        |> range(start: ${startTime.toISOString()}, stop: ${endTime.toISOString()})
        |> filter(fn: (r) => r["_measurement"] == "blood_sugar")
        |> filter(fn: (r) => r["user_id"] == "${userId}")
        |> filter(fn: (r) => r["_field"] == "value")
    `;

    try {
      const result: BloodSugarDataPoint[] = [];
      const rows = await this.queryApi.collectRows(query);

      rows.forEach((row: InfluxRow) => {
        // eslint-disable-next-line no-underscore-dangle
        result.push({
          // eslint-disable-next-line no-underscore-dangle
          timestamp: new Date(row._time),
          // eslint-disable-next-line no-underscore-dangle
          value: row._value || 0,
          timing: (row.timing as string) || 'unknown',
        });
      });

      this.logger.log(`血糖数据查询成功: userId=${userId}, 返回 ${result.length} 条记录`);
      return result;
    } catch (error) {
      this.logger.error(`血糖数据查询失败: userId=${userId}, error=${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * 聚合查询（平均值、最大值、最小值）
   * @param measurement 测量类型 (blood_pressure, blood_sugar)
   * @param userId 用户 ID
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @param aggregation 聚合类型 (mean, max, min)
   * @returns Promise<TimeSeriesDataPoint[]>
   */
  async queryAggregated(
    measurement: string,
    userId: string,
    startTime: Date,
    endTime: Date,
    aggregation: 'mean' | 'max' | 'min' = 'mean',
  ): Promise<TimeSeriesDataPoint[]> {
    const query = `
      from(bucket: "${this.bucket}")
        |> range(start: ${startTime.toISOString()}, stop: ${endTime.toISOString()})
        |> filter(fn: (r) => r["_measurement"] == "${measurement}")
        |> filter(fn: (r) => r["user_id"] == "${userId}")
        |> aggregateWindow(every: 1d, fn: ${aggregation}, createEmpty: false)
    `;

    try {
      const result: TimeSeriesDataPoint[] = [];
      const rows = await this.queryApi.collectRows(query);

      rows.forEach((row: InfluxRow) => {
        // eslint-disable-next-line no-underscore-dangle
        result.push({
          // eslint-disable-next-line no-underscore-dangle
          timestamp: new Date(row._time),
          // eslint-disable-next-line no-underscore-dangle
          value: row._value || 0,
          // eslint-disable-next-line no-underscore-dangle
          field: row._field,
        });
      });

      this.logger.log(
        `聚合查询成功: measurement=${measurement}, userId=${userId}, aggregation=${aggregation}, 返回 ${result.length} 条记录`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `聚合查询失败: measurement=${measurement}, userId=${userId}, error=${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * 查询用户最近 N 天的血压趋势（按天聚合）
   * @param userId 用户 ID
   * @param days 天数（默认 7 天）
   * @returns Promise<Array<{ time: string; systolic: number; diastolic: number; pulse: number }>>
   */
  async queryBloodPressureTrend(
    userId: string,
    days: number = 7,
  ): Promise<Array<{ time: string; systolic: number; diastolic: number; pulse: number }>> {
    const fluxQuery = `
      from(bucket: "${this.bucket}")
        |> range(start: -${days}d, stop: now())
        |> filter(fn: (r) =>
            r._measurement == "blood_pressure" and
            r.user_id == "${userId}"
        )
        |> aggregateWindow(every: 1d, fn: mean, createEmpty: false)
        |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
        |> keep(columns: ["_time", "systolic", "diastolic", "pulse"])
        |> sort(columns: ["_time"], desc: false)
    `;

    try {
      const rows = await this.queryApi.collectRows(fluxQuery);
      return rows.map((row: InfluxRow) => ({
        // eslint-disable-next-line no-underscore-dangle
        time: row._time,
        systolic: parseFloat(((row.systolic as number) || 0).toFixed(1)),
        diastolic: parseFloat(((row.diastolic as number) || 0).toFixed(1)),
        pulse: Math.round((row.pulse as number) || 0),
      }));
    } catch (error) {
      this.logger.error(`查询血压趋势失败: userId=${userId}, error=${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * 查询用户最近 N 天的血糖平均值（按测量时机分组）
   * @param userId 用户 ID
   * @param days 天数（默认 30 天）
   * @returns Promise<Array<{ timing: string; avgValue: number }>>
   */
  async queryBloodSugarStats(
    userId: string,
    days: number = 30,
  ): Promise<Array<{ timing: string; avgValue: number }>> {
    const fluxQuery = `
      from(bucket: "${this.bucket}")
        |> range(start: -${days}d, stop: now())
        |> filter(fn: (r) =>
            r._measurement == "blood_sugar" and
            r.user_id == "${userId}" and
            r._field == "value"
        )
        |> group(columns: ["timing"])
        |> mean()
        |> rename(columns: {_value: "avg_value"})
        |> keep(columns: ["timing", "avg_value"])
    `;

    try {
      const rows = await this.queryApi.collectRows(fluxQuery);
      return rows.map((row: InfluxRow) => ({
        timing: (row.timing as string) || 'unknown',
        avgValue: parseFloat(((row.avg_value as number) || 0).toFixed(1)),
      }));
    } catch (error) {
      this.logger.error(`查询血糖统计失败: userId=${userId}, error=${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * 查询用户指定时间范围内的血压统计（最大值、最小值、平均值）
   * @param userId 用户 ID
   * @param startTime 开始时间（RFC3339 格式）
   * @param stopTime 结束时间（RFC3339 格式）
   * @returns Promise<Array<{ field: string; mean: number; max: number; min: number; count: number }>>
   */
  async queryBloodPressureAggregation(
    userId: string,
    startTime: string,
    stopTime: string,
  ): Promise<Array<{ field: string; mean: number; max: number; min: number; count: number }>> {
    const fluxQuery = `
      from(bucket: "${this.bucket}")
        |> range(start: ${startTime}, stop: ${stopTime})
        |> filter(fn: (r) =>
            r._measurement == "blood_pressure" and
            r.user_id == "${userId}"
        )
        |> group(columns: ["_field"])
        |> reduce(
            fn: (r, accumulator) => ({
                _field: r._field,
                mean: accumulator.mean + r._value,
                max: if r._value > accumulator.max then r._value else accumulator.max,
                min: if r._value < accumulator.min then r._value else accumulator.min,
                count: accumulator.count + 1.0
            }),
            identity: {_field: "", mean: 0.0, max: 0.0, min: 999.0, count: 0.0}
        )
        |> map(fn: (r) => ({
            r with
            mean: r.mean / r.count
        }))
        |> keep(columns: ["_field", "mean", "max", "min", "count"])
    `;

    try {
      const rows = await this.queryApi.collectRows(fluxQuery);
      return rows.map((row: InfluxRow) => ({
        // eslint-disable-next-line no-underscore-dangle
        field: (row._field as string) || 'unknown',
        mean: parseFloat(((row.mean as number) || 0).toFixed(1)),
        max: parseFloat(((row.max as number) || 0).toFixed(1)),
        min: parseFloat(((row.min as number) || 0).toFixed(1)),
        count: Math.round((row.count as number) || 0),
      }));
    } catch (error) {
      this.logger.error(
        `查询血压聚合数据失败: userId=${userId}, error=${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * 查询用户指定时间范围内的血糖统计（按测量时机分组）
   * @param userId 用户 ID
   * @param startTime 开始时间（RFC3339 格式）
   * @param stopTime 结束时间（RFC3339 格式）
   * @returns Promise<Array<{ timing: string; mean: number; max: number; min: number; count: number }>>
   */
  async queryBloodSugarAggregation(
    userId: string,
    startTime: string,
    stopTime: string,
  ): Promise<Array<{ timing: string; mean: number; max: number; min: number; count: number }>> {
    const fluxQuery = `
      from(bucket: "${this.bucket}")
        |> range(start: ${startTime}, stop: ${stopTime})
        |> filter(fn: (r) =>
            r._measurement == "blood_sugar" and
            r.user_id == "${userId}" and
            r._field == "value"
        )
        |> group(columns: ["timing"])
        |> reduce(
            fn: (r, accumulator) => ({
                timing: r.timing,
                mean: accumulator.mean + r._value,
                max: if r._value > accumulator.max then r._value else accumulator.max,
                min: if r._value < accumulator.min then r._value else accumulator.min,
                count: accumulator.count + 1.0
            }),
            identity: {timing: "", mean: 0.0, max: 0.0, min: 999.0, count: 0.0}
        )
        |> map(fn: (r) => ({
            r with
            mean: r.mean / r.count
        }))
        |> keep(columns: ["timing", "mean", "max", "min", "count"])
    `;

    try {
      const rows = await this.queryApi.collectRows(fluxQuery);
      return rows.map((row: InfluxRow) => ({
        timing: (row.timing as string) || 'unknown',
        mean: parseFloat(((row.mean as number) || 0).toFixed(1)),
        max: parseFloat(((row.max as number) || 0).toFixed(1)),
        min: parseFloat(((row.min as number) || 0).toFixed(1)),
        count: Math.round((row.count as number) || 0),
      }));
    } catch (error) {
      this.logger.error(
        `查询血糖聚合数据失败: userId=${userId}, error=${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * 查询用户最近一次血压数据
   * @param userId 用户 ID
   * @returns Promise<{ time: string; checkInId: string; systolic: number; diastolic: number; pulse: number } | null>
   */
  async queryLatestBloodPressure(userId: string): Promise<{
    time: string;
    checkInId: string;
    systolic: number;
    diastolic: number;
    pulse: number;
  } | null> {
    const fluxQuery = `
      from(bucket: "${this.bucket}")
        |> range(start: -30d)
        |> filter(fn: (r) =>
            r._measurement == "blood_pressure" and
            r.user_id == "${userId}"
        )
        |> last()
        |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
        |> keep(columns: ["_time", "check_in_id", "systolic", "diastolic", "pulse"])
    `;

    try {
      const rows = await this.queryApi.collectRows(fluxQuery);
      if (rows.length === 0) {
        return null;
      }

      const row = rows[0] as InfluxRow;
      return {
        // eslint-disable-next-line no-underscore-dangle
        time: row._time,
        checkInId: (row.check_in_id as string) || '',
        systolic: parseFloat(((row.systolic as number) || 0).toFixed(1)),
        diastolic: parseFloat(((row.diastolic as number) || 0).toFixed(1)),
        pulse: Math.round((row.pulse as number) || 0),
      };
    } catch (error) {
      this.logger.error(
        `查询最新血压数据失败: userId=${userId}, error=${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * 查询用户最近一次血糖数据
   * @param userId 用户 ID
   * @returns Promise<{ time: string; checkInId: string; timing: string; value: number } | null>
   */
  async queryLatestBloodSugar(
    userId: string,
  ): Promise<{ time: string; checkInId: string; timing: string; value: number } | null> {
    const fluxQuery = `
      from(bucket: "${this.bucket}")
        |> range(start: -30d)
        |> filter(fn: (r) =>
            r._measurement == "blood_sugar" and
            r.user_id == "${userId}" and
            r._field == "value"
        )
        |> last()
        |> keep(columns: ["_time", "check_in_id", "timing", "_value"])
        |> rename(columns: {_value: "value"})
    `;

    try {
      const rows = await this.queryApi.collectRows(fluxQuery);
      if (rows.length === 0) {
        return null;
      }

      const row = rows[0] as InfluxRow;
      return {
        // eslint-disable-next-line no-underscore-dangle
        time: row._time,
        checkInId: (row.check_in_id as string) || '',
        timing: (row.timing as string) || 'unknown',
        value: parseFloat(((row.value as number) || 0).toFixed(1)),
      };
    } catch (error) {
      this.logger.error(
        `查询最新血糖数据失败: userId=${userId}, error=${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * 查询用户异常血压数据（收缩压 > 140 或舒张压 > 90）
   * @param userId 用户 ID
   * @param days 天数（默认 30 天）
   * @returns Promise<Array<{ time: string; checkInId: string; systolic: number; diastolic: number; pulse: number }>>
   */
  async queryAbnormalBloodPressure(
    userId: string,
    days: number = 30,
  ): Promise<
    Array<{ time: string; checkInId: string; systolic: number; diastolic: number; pulse: number }>
  > {
    const fluxQuery = `
      from(bucket: "${this.bucket}")
        |> range(start: -${days}d, stop: now())
        |> filter(fn: (r) =>
            r._measurement == "blood_pressure" and
            r.user_id == "${userId}"
        )
        |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
        |> filter(fn: (r) =>
            r.systolic > 140.0 or r.diastolic > 90.0
        )
        |> keep(columns: ["_time", "check_in_id", "systolic", "diastolic", "pulse"])
        |> sort(columns: ["_time"], desc: true)
    `;

    try {
      const rows = await this.queryApi.collectRows(fluxQuery);
      return rows.map((row: InfluxRow) => ({
        // eslint-disable-next-line no-underscore-dangle
        time: row._time,
        checkInId: (row.check_in_id as string) || '',
        systolic: parseFloat(((row.systolic as number) || 0).toFixed(1)),
        diastolic: parseFloat(((row.diastolic as number) || 0).toFixed(1)),
        pulse: Math.round((row.pulse as number) || 0),
      }));
    } catch (error) {
      this.logger.error(
        `查询异常血压数据失败: userId=${userId}, error=${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * 查询用户异常血糖数据
   * @param userId 用户 ID
   * @param days 天数（默认 30 天）
   * @returns Promise<Array<{ time: string; checkInId: string; timing: string; value: number }>>
   */
  async queryAbnormalBloodSugar(
    userId: string,
    days: number = 30,
  ): Promise<Array<{ time: string; checkInId: string; timing: string; value: number }>> {
    const fluxQuery = `
      from(bucket: "${this.bucket}")
        |> range(start: -${days}d, stop: now())
        |> filter(fn: (r) =>
            r._measurement == "blood_sugar" and
            r.user_id == "${userId}" and
            r._field == "value"
        )
        |> filter(fn: (r) =>
            (r.timing == "fasting" and r._value > 7.0) or
            (r.timing == "postprandial" and r._value > 11.1) or
            (r.timing == "random" and r._value > 11.1)
        )
        |> keep(columns: ["_time", "check_in_id", "timing", "_value"])
        |> sort(columns: ["_time"], desc: true)
        |> rename(columns: {_value: "value"})
    `;

    try {
      const rows = await this.queryApi.collectRows(fluxQuery);
      return rows.map((row: InfluxRow) => ({
        // eslint-disable-next-line no-underscore-dangle
        time: row._time,
        checkInId: (row.check_in_id as string) || '',
        timing: (row.timing as string) || 'unknown',
        value: parseFloat(((row.value as number) || 0).toFixed(1)),
      }));
    } catch (error) {
      this.logger.error(
        `查询异常血糖数据失败: userId=${userId}, error=${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * 关闭连接（应用关闭时调用）
   */
  async onModuleDestroy(): Promise<void> {
    try {
      await this.writeApi.close();
      this.logger.log('InfluxDB 客户端已关闭');
    } catch (error) {
      this.logger.error(`关闭 InfluxDB 客户端失败: ${error.message}`, error.stack);
    }
  }
}
