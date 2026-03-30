import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for the refresh-token endpoint.
 *
 * The client sends the refresh token in the request body (NOT as a cookie)
 * to comply with the mobile-first architecture requirements.
 */
export class RefreshTokenDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Refresh token obtained during login or registration',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
