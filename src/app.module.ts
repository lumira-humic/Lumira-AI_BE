import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';

import * as configs from './config';
import { validationSchema } from './config/validation.schema';

import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { PatientsModule } from './modules/patients/patients.module';
import { UsersModule } from './modules/users/users.module';
import { MedicalRecordsModule } from './modules/medical-records/medical-records.module';
import { ChatModule } from './modules/chat/chat.module';
import { StatisticsModule } from './modules/statistics/statistics.module';
import { MedGemmaModule } from './modules/medgemma/medgemma.module';
import { AiServiceModule } from './modules/ai-service/ai-service.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: Object.values(configs),
      validationSchema,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),

    // TypeORM Configuration
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        configService.get('database') as Record<string, unknown>,
    }),

    // Feature Modules
    UsersModule,
    PatientsModule,
    AuthModule,
    MedicalRecordsModule,
    ChatModule,
    StatisticsModule,
    MedGemmaModule,
    AiServiceModule,
  ],
  controllers: [],
  providers: [
    // Register JwtAuthGuard as GLOBAL guard
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
