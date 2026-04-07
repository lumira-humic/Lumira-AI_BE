import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

/**
 * Abstract base entity shared by all domain entities.
 *
 * Provides UUID primary key, audit timestamps (`createdAt`, `updatedAt`),
 * and soft-delete support via `deletedAt`.
 */
export abstract class BaseEntity {
  /** Unique identifier (UUID v4, auto-generated). */
  @PrimaryGeneratedColumn('uuid')
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
