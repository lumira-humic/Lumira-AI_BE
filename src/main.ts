import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import * as express from 'express';
import { mkdirSync } from 'fs';
import helmet from 'helmet';
import { join } from 'path';
import { setupSwagger } from './swagger';

import { AppModule } from './app.module';
import { GlobalExceptionFilter, TransformInterceptor } from './common';

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const compression = require('compression') as typeof import('compression');

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3000);
  const env = configService.get<string>('app.env', 'development');

  // Security and Compression Middlewares
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
      contentSecurityPolicy: false,
    }),
  );
  app.use(compression());

  // CORS Configuration
  const allowedOrigins = configService
    .get<string[]>('app.corsOrigins', [])
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.trim().replace(/\/$/, '');
      const isAllowed = allowedOrigins.length === 0 || allowedOrigins.includes(normalizedOrigin);

      if (isAllowed) {
        return callback(null, true);
      }

      return callback(new Error(`Origin ${origin} not allowed by CORS`), false);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204,
  });

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global Filters and Interceptors
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Local object storage static serving
  const localUploadDir = configService.get<string>('cloudinary.localUploadDir', 'uploads');
  const localBaseUrl =
    configService.get<string>('cloudinary.localBaseUrl', '/uploads') || '/uploads';
  const normalizedBaseUrl = resolveLocalStaticMountPath(localBaseUrl);
  const normalizedUploadDir = localUploadDir || 'uploads';
  const uploadRoot = join(process.cwd(), normalizedUploadDir);
  mkdirSync(uploadRoot, { recursive: true });
  app.use(normalizedBaseUrl, express.static(uploadRoot));

  // Swagger Documentation Setup
  const swaggerEnabled = configService.get<boolean>('app.swaggerEnabled', env !== 'production');
  if (swaggerEnabled) {
    setupSwagger(app);
  }

  // Graceful Shutdown
  app.enableShutdownHooks();

  await app.listen(port, 'localhost');
  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Swagger docs are available at: http://localhost:${port}/api/docs`);
}
void bootstrap();

function resolveLocalStaticMountPath(baseUrl: string): string {
  const normalized = baseUrl?.trim() || '/uploads';

  if (/^https?:\/\//i.test(normalized)) {
    try {
      const parsed = new URL(normalized);
      const pathname = parsed.pathname?.trim() || '/uploads';
      if (pathname === '/') {
        return '/uploads';
      }

      return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
    } catch {
      return '/uploads';
    }
  }

  const withLeadingSlash = normalized.startsWith('/') ? normalized : `/${normalized}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash.slice(0, -1) : withLeadingSlash;
}
