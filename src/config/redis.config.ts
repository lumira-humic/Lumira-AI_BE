import { registerAs } from '@nestjs/config';

export const redisConfig = registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || '',
  username: process.env.REDIS_USERNAME || 'default',
  ttl: parseInt(process.env.REDIS_TTL || '3600', 10),
}));

export default redisConfig;
