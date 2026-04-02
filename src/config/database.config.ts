import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as path from 'path';

export const databaseConfig = registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'secret',
    database: process.env.DB_NAME || 'lumira_ai_db',
    ssl: process.env.DB_SSL === 'true',
    synchronize: process.env.DB_SYNC === 'true',
    logging: process.env.DB_LOGGING === 'true',
    autoLoadEntities: true,
    entities: [path.join(__dirname, '../**/*.entity{.ts,.js}')],
    migrations: [path.join(__dirname, '../database/migrations/*{.ts,.js}')],
  }),
);

export default databaseConfig;
