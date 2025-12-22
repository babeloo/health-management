import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';

/**
 * Prisma 服务 (Prisma 7)
 * 提供数据库连接和查询功能
 * 使用 PostgreSQL 适配器以支持 Prisma 7 的新架构
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // 创建 PostgreSQL 连接池
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL 环境变量未设置');
    }

    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);

    // 使用适配器初始化 Prisma Client
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
