import { registerAs } from '@nestjs/config';

export default registerAs('influx', () => ({
  url: process.env.INFLUX_URL || 'http://localhost:8086',
  token: process.env.INFLUX_TOKEN || '',
  org: process.env.INFLUX_ORG || 'vakyi',
  bucket: process.env.INFLUX_BUCKET || 'health_data',
}));
