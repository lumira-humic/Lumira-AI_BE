import { registerAs } from '@nestjs/config';

// Optional mail config
export const mailConfig = registerAs('mail', () => ({
  host: process.env.MAIL_HOST || 'smtp.mailtrap.io',
  port: parseInt(process.env.MAIL_PORT || '2525', 10),
  user: process.env.MAIL_USER || '',
  password: process.env.MAIL_PASSWORD || '',
  from: process.env.MAIL_FROM || 'noreply@lumira-ai.com',
}));

export default mailConfig;
