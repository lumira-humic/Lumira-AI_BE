import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Request, Response } from 'express';

import { AppModule } from './app.module';

let server: express.Application | null = null;

async function bootstrapServer(): Promise<express.Application> {
  const expressApp = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
    logger: false,
  });
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
