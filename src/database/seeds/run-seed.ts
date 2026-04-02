import * as path from 'path';

import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';

import { seedAdminUser } from './admin-user.seed';

dotenv.config({
  path: path.resolve(process.cwd(), `.env.${process.env.NODE_ENV || 'development'}`),
});

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  entities: [path.join(__dirname, '..', '..', '**', '*.entity{.ts,.js}')],
  synchronize: false,
});

async function runSeeds(): Promise<void> {
  try {
    await dataSource.initialize();
    console.log('[Seed] Database connection established.');

    await seedAdminUser(dataSource);

    console.log('[Seed] All seeds executed successfully.');
  } catch (error) {
    console.error('[Seed] Error during seeding:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('[Seed] Database connection closed.');
  }
}

void runSeeds();
