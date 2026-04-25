import { MigrationInterface, QueryRunner } from 'typeorm';

export class MedGemmaSessionsSchema1774900000000 implements MigrationInterface {
  name = 'MedGemmaSessionsSchema1774900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "medgemma_sessions" (
        "id"         uuid         NOT NULL,
        "role"       varchar(16)  NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
        CONSTRAINT "PK_medgemma_sessions" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "medgemma_messages" (
        "id"         uuid        NOT NULL,
        "session_id" uuid        NOT NULL,
        "sender"     varchar(16) NOT NULL,
        "role"       varchar(16) NOT NULL,
        "message"    text        NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
        CONSTRAINT "PK_medgemma_messages" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_medgemma_messages_session_created"
        ON "medgemma_messages" ("session_id", "created_at")
    `);

    await queryRunner.query(`
      ALTER TABLE "medgemma_messages"
        ADD CONSTRAINT "FK_medgemma_messages_session"
        FOREIGN KEY ("session_id")
        REFERENCES "medgemma_sessions"("id")
        ON DELETE CASCADE
        ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "medgemma_messages" DROP CONSTRAINT "FK_medgemma_messages_session"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_medgemma_messages_session_created"`);
    await queryRunner.query(`DROP TABLE "medgemma_messages"`);
    await queryRunner.query(`DROP TABLE "medgemma_sessions"`);
  }
}
