import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO for patient profile data.
 *
 * Excludes sensitive fields like password. Used by the auth module
 * when returning patient data after login, register, or `/me`.
 */
export class PatientResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'Budi Santoso' })
  name!: string;

  @ApiProperty({ example: 'budi@mail.com' })
  email!: string;

  @ApiProperty({ example: '+6281234567890', nullable: true })
  phone!: string | null;

  @ApiProperty({ example: 'Jl. Merdeka No. 10, Jakarta', nullable: true })
  address!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
