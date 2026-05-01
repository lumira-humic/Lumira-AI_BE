import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTitleToMedGemmaSessions1777384000000 implements MigrationInterface {
  name = 'AddTitleToMedGemmaSessions1777384000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "medgemma_sessions" ADD COLUMN IF NOT EXISTS "title" varchar(160)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "medgemma_sessions" DROP COLUMN IF EXISTS "title"`);
  }
}
