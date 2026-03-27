import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  name: process.env.APP_NAME || 'Lumira AI API',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || [],
}));

export default appConfig;
