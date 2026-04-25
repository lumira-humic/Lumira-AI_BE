import { Module, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-ioredis-yet';
import Redis from 'ioredis';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { ActivityLog } from '../activities/entities/activity-log.entity';
import { User } from './entities/user.entity';

const logger = new Logger('UsersModule:Redis');

@Module({
  imports: [
    // Entity registration
    TypeOrmModule.forFeature([User, ActivityLog]),

    // Redis cache for user list
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
  ],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
