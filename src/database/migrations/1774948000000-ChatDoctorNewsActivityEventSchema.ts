import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChatDoctorNewsActivityEventSchema1774948000000 implements MigrationInterface {
  name = 'ChatDoctorNewsActivityEventSchema1774948000000';

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
          RAISE NOTICE 'chat_outbox_events_event_type_enum not found, skipping enum alteration';
        ELSIF NOT EXISTS (
          SELECT 1
          FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = 'chat_outbox_events_event_type_enum'
            AND n.nspname = 'public'
            AND e.enumlabel = 'doctor_news_activity'
        ) THEN
          ALTER TYPE "public"."chat_outbox_events_event_type_enum" ADD VALUE 'doctor_news_activity';
        END IF;
      END
      $$;
    `);
  }

  public async down(): Promise<void> {
    // PostgreSQL does not support removing enum values safely in down migration.
  }
}
