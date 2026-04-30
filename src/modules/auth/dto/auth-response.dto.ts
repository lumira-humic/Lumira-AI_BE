import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';

import { PatientResponseDto } from '../../patients/dto/patient-response.dto';
import { UserResponseDto } from '../../users/dto/user-response.dto';

/**
 * Response DTO returned after successful login or registration.
 *
 * Tokens are delivered in the response body (no cookies) as required
 * by the mobile-first architecture.
 *
 * `@ApiExtraModels` forces Swagger to register both union-member schemas
 * so the `oneOf` `$ref` pointers resolve correctly.
 */
@ApiExtraModels(UserResponseDto, PatientResponseDto)
export class AuthResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Short-lived access token (15 min)',
  })
  accessToken!: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Long-lived refresh token (7 days)',
  })
  refreshToken!: string;

  @ApiProperty({
    description: 'Profile data of the authenticated actor',
    oneOf: [{ $ref: getSchemaPath(UserResponseDto) }, { $ref: getSchemaPath(PatientResponseDto) }],
  })
  user!: UserResponseDto | PatientResponseDto;

  @ApiProperty({
    example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
    description:
      'Firebase custom token where uid equals actor id (null when Firebase integration is disabled)',
    nullable: true,
  })
  firebaseCustomToken!: string | null;
}

/**
 * Response DTO returned after a successful token refresh.
 */
export class AccessTokenResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Newly issued access token',
  })
  accessToken!: string;

  @ApiProperty({
    example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
    description:
      'Firebase custom token where uid equals actor id (null when Firebase integration is disabled)',
    nullable: true,
  })
  firebaseCustomToken!: string | null;
}
