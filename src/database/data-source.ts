import * as path from 'path';

import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';

dotenv.config({
  path: path.resolve(process.cwd(), `.env.${process.env.NODE_ENV || 'development'}`),
});

/**
 * Standalone TypeORM DataSource used by the CLI for migration commands.
 *
 * Loads environment variables from `.env.[NODE_ENV]` (defaults to `.env.development`).
 *
 * Usage:
 * ```bash
 * npx ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:generate src/database/migrations/InitialSchema -d src/database/data-source.ts
 * npx ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:run -d src/database/data-source.ts
 * ```
 */
export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || process.env.DATABASE_POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || process.env.DATABASE_POSTGRES_USER || 'postgres',
  password: process.env.DB_PASSWORD || process.env.DATABASE_POSTGRES_PASSWORD || '',
  database: process.env.DB_NAME || process.env.DATABASE_POSTGRES_DATABASE || 'lumira_ai_db',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  entities: [path.join(__dirname, '..', '**', '*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, 'migrations', '*{.ts,.js}')],
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
});
