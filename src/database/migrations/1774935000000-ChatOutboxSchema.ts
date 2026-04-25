import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChatOutboxSchema1774935000000 implements MigrationInterface {
  name = 'ChatOutboxSchema1774935000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = 'chat_outbox_events_event_type_enum'
            AND n.nspname = 'public'
        ) THEN
          CREATE TYPE "public"."chat_outbox_events_event_type_enum" AS ENUM(
            'room_upsert',
            'message_sync',
            'room_messages_read',
            'room_first_contact',
            'fcm_send'
          );
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = 'chat_outbox_events_status_enum'
            AND n.nspname = 'public'
        ) THEN
          CREATE TYPE "public"."chat_outbox_events_status_enum" AS ENUM(
            'pending',
            'processing',
            'retry',
            'succeeded',
            'dead'
          );
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "chat_outbox_events" (
        "id" varchar(32) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "event_type" "public"."chat_outbox_events_event_type_enum" NOT NULL,
        "status" "public"."chat_outbox_events_status_enum" NOT NULL DEFAULT 'pending',
        "payload" jsonb NOT NULL,
        "attempt_count" integer NOT NULL DEFAULT 0,
        "max_attempts" integer NOT NULL DEFAULT 8,
        "next_attempt_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "processed_at" TIMESTAMP WITH TIME ZONE,
        "last_error" text,
        CONSTRAINT "PK_chat_outbox_events" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_chat_outbox_status_next_attempt" ON "chat_outbox_events" ("status", "next_attempt_at")`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_chat_outbox_type_status" ON "chat_outbox_events" ("event_type", "status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_chat_outbox_type_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_chat_outbox_status_next_attempt"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_outbox_events"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."chat_outbox_events_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."chat_outbox_events_event_type_enum"`);
  }
}
