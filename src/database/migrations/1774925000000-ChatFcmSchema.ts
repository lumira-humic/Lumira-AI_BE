import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChatFcmSchema1774925000000 implements MigrationInterface {
  name = 'ChatFcmSchema1774925000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = 'device_tokens_platform_enum'
            AND n.nspname = 'public'
        ) THEN
          CREATE TYPE "public"."device_tokens_platform_enum" AS ENUM('android', 'ios', 'web');
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "chat_rooms" (
        "id" varchar(32) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "patient_id" varchar(32) NOT NULL,
        "doctor_id" varchar(32) NOT NULL,
        "medical_record_id" varchar(32) NOT NULL,
        "first_contact_notified_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_chat_rooms" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_chat_rooms_patient_doctor" ON "chat_rooms" ("patient_id", "doctor_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_chat_rooms_medical_record" ON "chat_rooms" ("medical_record_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "device_tokens" (
        "id" varchar(32) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "actor_type" varchar(16) NOT NULL,
        "actor_id" varchar(32) NOT NULL,
        "fcm_token" text NOT NULL,
        "platform" "public"."device_tokens_platform_enum" NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "last_seen_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
        CONSTRAINT "PK_device_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_device_tokens_fcm_token" UNIQUE ("fcm_token")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_device_tokens_actor" ON "device_tokens" ("actor_type", "actor_id")`,
    );

    await queryRunner.query(
      `ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "room_id" varchar(32)`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "sender_id" varchar(32)`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "receiver_id" varchar(32)`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "client_message_id" varchar(128)`,
    );

    await queryRunner.query(`DELETE FROM "chat_messages"`);

    await queryRunner.query(`
      UPDATE "chat_messages"
      SET "sender_id" = CASE
        WHEN sender_type = 'doctor' THEN doctor_id
        ELSE patient_id
      END
      WHERE sender_id IS NULL
    `);

    await queryRunner.query(`
      UPDATE "chat_messages"
      SET "receiver_id" = CASE
        WHEN sender_type = 'doctor' THEN patient_id
        ELSE doctor_id
      END
      WHERE receiver_id IS NULL
    `);

    await queryRunner.query(`ALTER TABLE "chat_messages" ALTER COLUMN "room_id" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "chat_messages" ALTER COLUMN "sender_id" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "chat_messages" ALTER COLUMN "receiver_id" SET NOT NULL`);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_chat_messages_room_created" ON "chat_messages" ("room_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_chat_messages_room_receiver_is_read" ON "chat_messages" ("room_id", "receiver_id", "is_read")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_chat_messages_room_sender_client" ON "chat_messages" ("room_id", "sender_id", "client_message_id") WHERE client_message_id IS NOT NULL`,
    );

    await queryRunner.query(`
      ALTER TABLE "chat_rooms"
      ADD CONSTRAINT "FK_chat_rooms_patient"
      FOREIGN KEY ("patient_id") REFERENCES "patients"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "chat_rooms"
      ADD CONSTRAINT "FK_chat_rooms_doctor"
      FOREIGN KEY ("doctor_id") REFERENCES "users"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "chat_rooms"
      ADD CONSTRAINT "FK_chat_rooms_medical_record"
      FOREIGN KEY ("medical_record_id") REFERENCES "medical_records"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "chat_messages"
      ADD CONSTRAINT "FK_chat_messages_room"
      FOREIGN KEY ("room_id") REFERENCES "chat_rooms"("id")
      ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chat_messages" DROP CONSTRAINT IF EXISTS "FK_chat_messages_room"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_rooms" DROP CONSTRAINT IF EXISTS "FK_chat_rooms_medical_record"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_rooms" DROP CONSTRAINT IF EXISTS "FK_chat_rooms_doctor"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_rooms" DROP CONSTRAINT IF EXISTS "FK_chat_rooms_patient"`,
    );

    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_chat_messages_room_sender_client"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_chat_messages_room_receiver_is_read"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_chat_messages_room_created"`);

    await queryRunner.query(
      `ALTER TABLE "chat_messages" DROP COLUMN IF EXISTS "client_message_id"`,
    );
    await queryRunner.query(`ALTER TABLE "chat_messages" DROP COLUMN IF EXISTS "receiver_id"`);
    await queryRunner.query(`ALTER TABLE "chat_messages" DROP COLUMN IF EXISTS "sender_id"`);
    await queryRunner.query(`ALTER TABLE "chat_messages" DROP COLUMN IF EXISTS "room_id"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_device_tokens_actor"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "device_tokens"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_chat_rooms_medical_record"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_chat_rooms_patient_doctor"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_rooms"`);

    await queryRunner.query(`DROP TYPE IF EXISTS "public"."device_tokens_platform_enum"`);
  }
}
