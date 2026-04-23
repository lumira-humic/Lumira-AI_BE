import { PrimaryColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';

/**
 * Abstract base entity shared by all domain entities.
 *
 * Provides a `varchar` primary key (set explicitly by each entity/service),
 * audit timestamps (`createdAt`, `updatedAt`), and soft-delete via `deletedAt`.
 *
 * ID format convention (set before `save()`):
 *   - Admin users  → `ADM-{6 digits}`
 *   - Doctor users → `DOC-{6 digits}`
 *   - Patients     → `PAS-{6 digits}`
 *   - Medical recs → `MED-{6 digits}`
 */
export abstract class BaseEntity {
  /** Unique identifier — must be set explicitly before persisting. */
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  /** Timestamp when the record was created. */
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  /** Timestamp when the record was last updated. */
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  /** Timestamp when the record was soft-deleted (null if active). */
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt!: Date | null;
}
