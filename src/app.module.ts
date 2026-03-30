import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';

import { validationSchema } from './config/validation.schema';
import * as configs from './config';

import { UsersModule } from './modules/users/users.module';
import { PatientsModule } from './modules/patients/patients.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';

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
      useFactory: (configService: ConfigService) => configService.get('database')!,
    }),

    // Feature Modules
    UsersModule,
    PatientsModule,
    AuthModule,
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
