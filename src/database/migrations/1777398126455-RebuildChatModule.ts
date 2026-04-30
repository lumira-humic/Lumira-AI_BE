import { MigrationInterface, QueryRunner } from 'typeorm';

export class RebuildChatModule1777398126455 implements MigrationInterface {
  name = 'RebuildChatModule1777398126455';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_outbox_events"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."chat_outbox_events_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."chat_outbox_events_event_type_enum"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "chat_messages" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."chat_messages_sender_type_enum"`);

    await queryRunner.query(`ALTER TABLE "chat_rooms" DROP CONSTRAINT "FK_chat_rooms_patient"`);
    await queryRunner.query(`ALTER TABLE "chat_rooms" DROP CONSTRAINT "FK_chat_rooms_doctor"`);
    await queryRunner.query(
      `ALTER TABLE "chat_rooms" DROP CONSTRAINT "FK_chat_rooms_medical_record"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_device_tokens_actor"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_chat_rooms_patient_doctor"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_chat_rooms_medical_record"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_52448abf66ece84fb989738c35" ON "device_tokens" ("fcm_token") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2a1f0e2ec28bd29ac7f2cdd07e" ON "device_tokens" ("actor_type", "actor_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_cb4456c0e9ff50a1b1eade6d16" ON "chat_rooms" ("medical_record_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fa0c31bf95f654c7871b586f9e" ON "chat_rooms" ("patient_id", "doctor_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_rooms" ADD CONSTRAINT "FK_63417281e1184dc7fe029c4fe25" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_rooms" ADD CONSTRAINT "FK_176340b4e87c77b569c5c2d6286" FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_rooms" ADD CONSTRAINT "FK_cb4456c0e9ff50a1b1eade6d167" FOREIGN KEY ("medical_record_id") REFERENCES "medical_records"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chat_rooms" DROP CONSTRAINT "FK_cb4456c0e9ff50a1b1eade6d167"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_rooms" DROP CONSTRAINT "FK_176340b4e87c77b569c5c2d6286"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_rooms" DROP CONSTRAINT "FK_63417281e1184dc7fe029c4fe25"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_fa0c31bf95f654c7871b586f9e"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_cb4456c0e9ff50a1b1eade6d16"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_2a1f0e2ec28bd29ac7f2cdd07e"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_52448abf66ece84fb989738c35"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_95cb5bd06883e3c049fbe9de7f"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_chat_rooms_medical_record" ON "chat_rooms" ("medical_record_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_chat_rooms_patient_doctor" ON "chat_rooms" ("doctor_id", "patient_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_device_tokens_actor" ON "device_tokens" ("actor_id", "actor_type") `,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_rooms" ADD CONSTRAINT "FK_chat_rooms_medical_record" FOREIGN KEY ("medical_record_id") REFERENCES "medical_records"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_rooms" ADD CONSTRAINT "FK_chat_rooms_doctor" FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_rooms" ADD CONSTRAINT "FK_chat_rooms_patient" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."chat_messages_sender_type_enum" AS ENUM('doctor', 'patient')`,
    );
    await queryRunner.query(`
        CREATE TABLE "chat_messages" (
            "id" varchar(32) NOT NULL,
            "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            "deleted_at" TIMESTAMP WITH TIME ZONE,
            "patient_id" varchar(32) NOT NULL,
            "doctor_id" varchar(32) NOT NULL,
            "room_id" varchar(32) NOT NULL,
            "sender_id" varchar(32) NOT NULL,
            "receiver_id" varchar(32) NOT NULL,
            "sender_type" "public"."chat_messages_sender_type_enum" NOT NULL,
            "message" text NOT NULL,
            "is_read" boolean NOT NULL DEFAULT false,
            "client_message_id" varchar(128),
            CONSTRAINT "PK_chat_messages" PRIMARY KEY ("id")
        )
    `);

    await queryRunner.query(
      `CREATE TYPE "public"."chat_outbox_events_event_type_enum" AS ENUM('room_upsert','message_sync','room_messages_read','room_first_contact','fcm_send','message_read','doctor_news_activity')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."chat_outbox_events_status_enum" AS ENUM('pending','processing','retry','succeeded','dead')`,
    );
    await queryRunner.query(`
        CREATE TABLE "chat_outbox_events" (
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
  }
}
