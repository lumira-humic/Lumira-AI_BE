import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MinLength } from 'class-validator';

/**
 * DTO for user / patient login.
 *
 * Accepts email (case-insensitive) and password.
 */
export class LoginDto {
  @ApiProperty({
    example: 'doctor@lumira.ai',
    description: 'Email address of the user or patient',
  })
  @IsEmail()
  @Transform(({ value }: { value: string }) => value.toLowerCase().trim())
  email: string;

  @ApiProperty({
    example: 'P@ssw0rd!',
    description: 'Account password (min 8 characters)',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;
}
