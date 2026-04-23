import { registerAs } from '@nestjs/config';

export const medgemmaConfig = registerAs('medgemma', () => ({
  providerBaseUrl: process.env.MEDGEMMA_PROVIDER_BASE_URL || '',
  providerApiKey: process.env.MEDGEMMA_PROVIDER_API_KEY || '',
  providerModel: process.env.MEDGEMMA_PROVIDER_MODEL || 'medgemma',
  providerTimeoutMs: parseInt(process.env.MEDGEMMA_PROVIDER_TIMEOUT_MS || '30000', 10),
  sessionTtlSeconds: parseInt(process.env.MEDGEMMA_SESSION_TTL || '86400', 10),
}));

export default medgemmaConfig;
