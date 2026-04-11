import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Request, Response } from 'express';

import { AppModule } from './app.module';
import { setupSwagger } from './swagger';

let server: express.Application | null = null;

async function bootstrapServer(): Promise<express.Application> {
  const expressApp = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
    logger: ['error', 'warn', 'log'],
  });
  const configService = app.get(ConfigService);
  const env = configService.get<string>('app.env', 'development');

  const allowedOrigins = configService
    .get<string[]>('app.corsOrigins', [])
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow non-browser requests (e.g. curl, server-to-server).
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

  const swaggerEnabled = configService.get<boolean>('app.swaggerEnabled', env !== 'production');
  if (swaggerEnabled) {
    setupSwagger(app);
  }
  app.enableShutdownHooks();
  await app.init();
  return expressApp;
}

export default async function handler(req: Request, res: Response): Promise<void> {
  if (!server) {
    server = await bootstrapServer();
  }

  const requestHandler = server as unknown as express.RequestHandler;
  return new Promise<void>((resolve) => {
    requestHandler(req, res, () => resolve());
  });
}
