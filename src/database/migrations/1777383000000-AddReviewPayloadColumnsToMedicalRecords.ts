import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReviewPayloadColumnsToMedicalRecords1777383000000 implements MigrationInterface {
  name = 'AddReviewPayloadColumnsToMedicalRecords1777383000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "medical_records" ADD COLUMN IF NOT EXISTS "agreement" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "medical_records" ADD COLUMN IF NOT EXISTS "note" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "medical_records" ADD COLUMN IF NOT EXISTS "heatmap_image" character varying`,
    );
    await queryRunner.query(`
      UPDATE "medical_records"
      SET
        "agreement" = CASE
          WHEN "agreement" IS NOT NULL THEN "agreement"
          WHEN "is_ai_accurate" = true THEN 'agree'
          WHEN "is_ai_accurate" = false THEN 'disagree'
          ELSE NULL
        END,
        "note" = COALESCE("note", "doctor_notes"),
        "heatmap_image" = COALESCE("heatmap_image", "doctor_brush_path")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "medical_records" DROP COLUMN IF EXISTS "heatmap_image"`);
    await queryRunner.query(`ALTER TABLE "medical_records" DROP COLUMN IF EXISTS "note"`);
    await queryRunner.query(`ALTER TABLE "medical_records" DROP COLUMN IF EXISTS "agreement"`);
  }
}
