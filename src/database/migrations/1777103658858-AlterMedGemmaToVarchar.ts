import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterMedGemmaToVarchar1777103658858 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('medgemma_messages');
    if (table) {
      const foreignKey = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('session_id') !== -1,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('medgemma_messages', foreignKey);
      }
    }

    // Alter the column types to varchar(36)
    await queryRunner.query(
      `ALTER TABLE "medgemma_sessions" ALTER COLUMN "id" TYPE varchar(36) USING "id"::text`,
    );
    await queryRunner.query(
      `ALTER TABLE "medgemma_messages" ALTER COLUMN "session_id" TYPE varchar(36) USING "session_id"::text`,
    );
    await queryRunner.query(
      `ALTER TABLE "medgemma_messages" ALTER COLUMN "id" TYPE varchar(36) USING "id"::text`,
    );

    // Re-add the foreign key constraint
    await queryRunner.query(`
          ALTER TABLE "medgemma_messages"
            ADD CONSTRAINT "FK_medgemma_messages_session"
            FOREIGN KEY ("session_id") REFERENCES "medgemma_sessions"("id") ON DELETE CASCADE
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('medgemma_messages');
    if (table) {
      const foreignKey = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('session_id') !== -1,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('medgemma_messages', foreignKey);
      }
    }

    await queryRunner.query(
      `ALTER TABLE "medgemma_messages" ALTER COLUMN "id" TYPE uuid USING "id"::uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "medgemma_messages" ALTER COLUMN "session_id" TYPE uuid USING "session_id"::uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "medgemma_sessions" ALTER COLUMN "id" TYPE uuid USING "id"::uuid`,
    );

    await queryRunner.query(`
          ALTER TABLE "medgemma_messages"
            ADD CONSTRAINT "FK_medgemma_messages_session"
            FOREIGN KEY ("session_id") REFERENCES "medgemma_sessions"("id") ON DELETE CASCADE
        `);
  }
}
