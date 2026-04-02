import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as compression from 'compression';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { GlobalExceptionFilter, TransformInterceptor } from './common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3000);
  const env = configService.get<string>('app.env', 'development');

  // Security and Compression Middlewares
  app.use(helmet());
  app.use(compression());

  // CORS Configuration
  const allowedOrigins = configService.get<string[]>('app.corsOrigins', []);
  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
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

  // Swagger Documentation Setup
  if (env !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Lumira AI API')
      .setDescription('API documentation for Lumira AI application')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // Graceful Shutdown
  app.enableShutdownHooks();

  await app.listen(port);
  logger.log(`Application is running on: ${await app.getUrl()}`);
  logger.log(`Swagger docs are available at: ${await app.getUrl()}/api/docs`);
}
void bootstrap();
