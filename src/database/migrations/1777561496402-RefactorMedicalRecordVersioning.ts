import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorMedicalRecordVersioning1778000000000 implements MigrationInterface {
  name = 'RefactorMedicalRecordVersioning1778000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. ADD parent_record_id
    await queryRunner.query(`
      ALTER TABLE "medical_records"
      ADD COLUMN IF NOT EXISTS "parent_record_id" varchar
    `);

    // 2. DROP heatmap_image
    await queryRunner.query(`
      ALTER TABLE "medical_records"
      DROP COLUMN IF EXISTS "heatmap_image"
    `);

    // 3. Normalize validation_status
    // convert APPROVED & REJECTED → REVIEWED
    await queryRunner.query(`
      UPDATE "medical_records"
      SET "validation_status" = 'REVIEWED'
      WHERE "validation_status" IN ('APPROVED', 'REJECTED')
    `);

    // 4. (optional but recommended) drop enum constraint → jadi varchar
    await queryRunner.query(`
      ALTER TABLE "medical_records"
      ALTER COLUMN "validation_status"
      TYPE varchar
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // rollback

    // revert validation_status (optional)
    await queryRunner.query(`
      ALTER TABLE "medical_records"
      ALTER COLUMN "validation_status"
      TYPE varchar
    `);

    // restore heatmap_image
    await queryRunner.query(`
      ALTER TABLE "medical_records"
      ADD COLUMN "heatmap_image" varchar
    `);

    // remove parent_record_id
    await queryRunner.query(`
      ALTER TABLE "medical_records"
      DROP COLUMN IF EXISTS "parent_record_id"
    `);
  }
}
