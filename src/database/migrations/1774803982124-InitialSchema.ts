import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1774803982124 implements MigrationInterface {
  name = 'InitialSchema1774803982124';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."chat_messages_sender_type_enum" AS ENUM('doctor', 'patient')`,
    );
    await queryRunner.query(
      `CREATE TABLE "chat_messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "patient_id" uuid NOT NULL, "doctor_id" uuid NOT NULL, "sender_type" "public"."chat_messages_sender_type_enum" NOT NULL, "message" text NOT NULL, "is_read" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_40c55ee0e571e268b0d3cd37d10" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7971b21fbbccd1d5e5a0cceacb" ON "chat_messages" ("is_read") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_32474621b071f82da3127a6af5" ON "chat_messages" ("patient_id", "doctor_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "patients" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "name" character varying NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, "phone" character varying, "address" character varying, CONSTRAINT "UQ_64e2031265399f5690b0beba6a5" UNIQUE ("email"), CONSTRAINT "PK_a7f0b9fcbb3469d5ec0b0aceaa7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."medical_records_validation_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'REVIEWED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "medical_records" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "patient_id" uuid NOT NULL, "validator_id" uuid, "original_image_path" character varying NOT NULL, "validation_status" "public"."medical_records_validation_status_enum" NOT NULL DEFAULT 'PENDING', "ai_diagnosis" character varying, "ai_confidence" double precision, "ai_gradcam_path" character varying, "doctor_diagnosis" character varying, "doctor_notes" character varying, "doctor_brush_path" character varying, "is_ai_accurate" boolean, "uploaded_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()), "validated_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_c200c0b76638124b7ed51424823" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_000a7d3138cce07f568220a320" ON "medical_records" ("validator_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1f6da7541d693448c96c11cc34" ON "medical_records" ("validation_status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_43e2800e756c913a6c7a07cc27" ON "medical_records" ("patient_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "activity_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "user_id" uuid, "action_type" character varying, "description" character varying, "timestamp" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()), CONSTRAINT "PK_f25287b6140c5ba18d38776a796" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('admin', 'doctor')`);
    await queryRunner.query(
      `CREATE TYPE "public"."users_status_enum" AS ENUM('Active', 'Inactive')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "name" character varying NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'doctor', "status" "public"."users_status_enum" NOT NULL DEFAULT 'Active', CONSTRAINT "users_email_key" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_messages" ADD CONSTRAINT "FK_f402cd3849b3dfc50a9dad9a678" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_messages" ADD CONSTRAINT "FK_adc90ff9631a4f567b7d45364c0" FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "medical_records" ADD CONSTRAINT "FK_43e2800e756c913a6c7a07cc271" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "medical_records" ADD CONSTRAINT "FK_000a7d3138cce07f568220a3208" FOREIGN KEY ("validator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity_logs" ADD CONSTRAINT "FK_d54f841fa5478e4734590d44036" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "activity_logs" DROP CONSTRAINT "FK_d54f841fa5478e4734590d44036"`,
    );
    await queryRunner.query(
      `ALTER TABLE "medical_records" DROP CONSTRAINT "FK_000a7d3138cce07f568220a3208"`,
    );
    await queryRunner.query(
      `ALTER TABLE "medical_records" DROP CONSTRAINT "FK_43e2800e756c913a6c7a07cc271"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_messages" DROP CONSTRAINT "FK_adc90ff9631a4f567b7d45364c0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_messages" DROP CONSTRAINT "FK_f402cd3849b3dfc50a9dad9a678"`,
    );
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    await queryRunner.query(`DROP TABLE "activity_logs"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_43e2800e756c913a6c7a07cc27"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_1f6da7541d693448c96c11cc34"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_000a7d3138cce07f568220a320"`);
    await queryRunner.query(`DROP TABLE "medical_records"`);
    await queryRunner.query(`DROP TYPE "public"."medical_records_validation_status_enum"`);
    await queryRunner.query(`DROP TABLE "patients"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_32474621b071f82da3127a6af5"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_7971b21fbbccd1d5e5a0cceacb"`);
    await queryRunner.query(`DROP TABLE "chat_messages"`);
    await queryRunner.query(`DROP TYPE "public"."chat_messages_sender_type_enum"`);
  }
}
