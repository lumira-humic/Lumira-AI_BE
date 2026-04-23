import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Drops and recreates all core tables to switch from UUID primary keys
 * to human-readable prefixed varchar IDs (DOC-XXXXXX, ADM-XXXXXX, etc.).
 *
 * This migration intentionally truncates all existing data — it is designed
 * for use in the development/staging environment where data can be re-seeded.
 */
export class PrefixedIdSchema1774910000000 implements MigrationInterface {
  name = 'PrefixedIdSchema1774910000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Drop existing tables (order matters for FK constraints) ──────────────
    await queryRunner.query(`DROP TABLE IF EXISTS "medgemma_messages" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "medgemma_sessions" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "activity_logs" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_messages" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "medical_records" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "patients" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE`);

    // ── Drop stale enums ─────────────────────────────────────────────────────
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."chat_messages_sender_type_enum" CASCADE`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."medical_records_validation_status_enum" CASCADE`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."users_role_enum" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."users_status_enum" CASCADE`);

    // ── Recreate enums ───────────────────────────────────────────────────────
    await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('admin', 'doctor')`);
    await queryRunner.query(
      `CREATE TYPE "public"."users_status_enum" AS ENUM('Active', 'Inactive')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."medical_records_validation_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'REVIEWED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."chat_messages_sender_type_enum" AS ENUM('doctor', 'patient')`,
    );

    // ── users ────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"         varchar(32)  NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "name"       character varying NOT NULL,
        "email"      character varying NOT NULL,
        "password"   character varying NOT NULL,
        "role"       "public"."users_role_enum"   NOT NULL DEFAULT 'doctor',
        "status"     "public"."users_status_enum" NOT NULL DEFAULT 'Active',
        CONSTRAINT "users_email_key" UNIQUE ("email"),
        CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
      )
    `);

    // ── patients ─────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "patients" (
        "id"         varchar(32)  NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "name"       character varying NOT NULL,
        "email"      character varying NOT NULL,
        "password"   character varying NOT NULL,
        "phone"      character varying,
        "address"    character varying,
        CONSTRAINT "UQ_64e2031265399f5690b0beba6a5" UNIQUE ("email"),
        CONSTRAINT "PK_a7f0b9fcbb3469d5ec0b0aceaa7" PRIMARY KEY ("id")
      )
    `);

    // ── medical_records ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "medical_records" (
        "id"                varchar(32)  NOT NULL,
        "created_at"        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at"        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at"        TIMESTAMP WITH TIME ZONE,
        "patient_id"        varchar(32)  NOT NULL,
        "validator_id"      varchar(32),
        "original_image_path" character varying NOT NULL,
        "validation_status" "public"."medical_records_validation_status_enum" NOT NULL DEFAULT 'PENDING',
        "ai_diagnosis"      character varying,
        "ai_confidence"     double precision,
        "ai_gradcam_path"   character varying,
        "doctor_diagnosis"  character varying,
        "doctor_notes"      character varying,
        "doctor_brush_path" character varying,
        "is_ai_accurate"    boolean,
        "uploaded_at"       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
        "validated_at"      TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_c200c0b76638124b7ed51424823" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_43e2800e756c913a6c7a07cc27" ON "medical_records" ("patient_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1f6da7541d693448c96c11cc34" ON "medical_records" ("validation_status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_000a7d3138cce07f568220a320" ON "medical_records" ("validator_id")`,
    );

    // ── activity_logs ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "activity_logs" (
        "id"          varchar(32)  NOT NULL,
        "created_at"  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at"  TIMESTAMP WITH TIME ZONE,
        "user_id"     varchar(32),
        "action_type" character varying,
        "description" character varying,
        "timestamp"   TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
        CONSTRAINT "PK_f25287b6140c5ba18d38776a796" PRIMARY KEY ("id")
      )
    `);

    // ── chat_messages ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "chat_messages" (
        "id"          varchar(32)  NOT NULL,
        "created_at"  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at"  TIMESTAMP WITH TIME ZONE,
        "patient_id"  varchar(32)  NOT NULL,
        "doctor_id"   varchar(32)  NOT NULL,
        "sender_type" "public"."chat_messages_sender_type_enum" NOT NULL,
        "message"     text         NOT NULL,
        "is_read"     boolean      NOT NULL DEFAULT false,
        CONSTRAINT "PK_40c55ee0e571e268b0d3cd37d10" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_7971b21fbbccd1d5e5a0cceacb" ON "chat_messages" ("is_read")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_32474621b071f82da3127a6af5" ON "chat_messages" ("patient_id", "doctor_id")`,
    );

    // ── medgemma_sessions ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "medgemma_sessions" (
        "id"         uuid        NOT NULL,
        "role"       varchar(16) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
        CONSTRAINT "PK_medgemma_sessions" PRIMARY KEY ("id")
      )
    `);

    // ── medgemma_messages ────────────────────────────────────────────────────
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

    // ── Foreign key constraints ──────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "medical_records"
        ADD CONSTRAINT "FK_43e2800e756c913a6c7a07cc271"
        FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "medical_records"
        ADD CONSTRAINT "FK_000a7d3138cce07f568220a3208"
        FOREIGN KEY ("validator_id") REFERENCES "users"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "activity_logs"
        ADD CONSTRAINT "FK_d54f841fa5478e4734590d44036"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "chat_messages"
        ADD CONSTRAINT "FK_f402cd3849b3dfc50a9dad9a678"
        FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "chat_messages"
        ADD CONSTRAINT "FK_adc90ff9631a4f567b7d45364c0"
        FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "medgemma_messages"
        ADD CONSTRAINT "FK_medgemma_messages_session"
        FOREIGN KEY ("session_id") REFERENCES "medgemma_sessions"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "medgemma_messages" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "medgemma_sessions" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "activity_logs" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_messages" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "medical_records" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "patients" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."chat_messages_sender_type_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."medical_records_validation_status_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."users_role_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."users_status_enum"`);
  }
}
