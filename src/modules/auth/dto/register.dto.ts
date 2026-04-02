import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

/**
 * DTO for patient self-registration from the mobile app.
 *
 * All registrations via this endpoint automatically create a `patient`
 * record — there is no role field.
 */
export class RegisterDto {
  @ApiProperty({
    example: 'Budi Santoso',
    description: 'Full name of the patient',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'budi@mail.com',
    description: 'Email address (will be lowercased)',
  })
  @IsEmail()
  @Transform(({ value }: { value: string }) => value.toLowerCase().trim())
  email: string;

  @ApiProperty({
    example: 'S3cur3P@ss',
    description: 'Password (min 8 characters)',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({
    example: '+6281234567890',
    description: 'Contact phone number',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    example: 'Jl. Merdeka No. 10, Jakarta',
    description: 'Residential address',
  })
  @IsOptional()
  @IsString()
  address?: string;
}
