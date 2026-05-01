import { CacheModule } from '@nestjs/cache-manager';
import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { redisStore } from 'cache-manager-ioredis-yet';
import Redis from 'ioredis';

import { FirebaseAdminService } from '../chat/firebase-admin.service';
import { Patient } from '../patients/entities/patient.entity';
import { PatientsModule } from '../patients/patients.module';
import { User } from '../users/entities/user.entity';
import { UsersModule } from '../users/users.module';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';

const logger = new Logger('AuthModule:Redis');

/**
 * Authentication module.
 *
 * Wires together JWT/Passport infrastructure, Redis-backed refresh
 * token storage, and the dual-actor (User + Patient) auth flow.
 */
@Module({
  imports: [
    // Passport with JWT as default strategy
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // JWT configuration loaded from ConfigService
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: 900, // 15 minutes in seconds
        },
      }),
    }),

    // Redis cache for refresh tokens
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const host = configService.get<string>('redis.host', 'localhost');
        const port = configService.get<number>('redis.port', 6379);
        const password = configService.get<string>('redis.password', '');
        const username = configService.get<string>('redis.username', 'default');

        const useTls = host.endsWith('.upstash.io');

        const store = await redisStore({
          host,
          port,
          username,
          password,
          ...(useTls ? { tls: {} } : {}),
          maxRetriesPerRequest: 3,
          retryStrategy(times: number) {
            const delay = Math.min(times * 200, 5000);
            logger.warn(`Redis reconnecting... attempt ${times}, next in ${delay}ms`);
            return delay;
          },
          reconnectOnError(err: Error) {
            const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
            return targetErrors.some((e) => err.message.includes(e));
          },
        });

        // Attach error listener to prevent unhandled 'error' events from crashing the process
        const client = (store as unknown as { client: Redis }).client;
        if (client) {
          client.on('error', (err: Error) => {
            logger.error(`Redis connection error: ${err.message}`);
          });
          client.on('reconnecting', (delay: number) => {
            logger.warn(`Redis reconnecting in ${delay}ms...`);
          });
        }

        return { store };
      },
    }),

    // Entity registration
    TypeOrmModule.forFeature([User, Patient]),

    // Feature modules (export repositories)
    UsersModule,
    PatientsModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LocalStrategy, FirebaseAdminService],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
