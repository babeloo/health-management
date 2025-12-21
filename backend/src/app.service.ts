import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return '欢迎使用智慧慢病管理系统 API!';
  }
}
