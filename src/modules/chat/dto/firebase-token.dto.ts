import { ApiProperty } from '@nestjs/swagger';

export class FirebaseTokenDto {
  @ApiProperty({
    description:
      'Firebase custom auth token. Pass to client SDK signInWithCustomToken(). ' +
      'Hard-expires in 1 hour per Firebase contract; mint a new one before that.',
  })
  customToken!: string;

  @ApiProperty({
    description: 'Seconds until the custom token expires (Firebase fixed limit = 3600).',
    example: 3600,
  })
  expiresIn!: number;

  @ApiProperty({
    description: 'Actor ID used as the Firebase Auth UID after signInWithCustomToken().',
    example: 'PAS-123456',
  })
  uid!: string;

  @ApiProperty({ enum: ['user', 'patient'], example: 'patient' })
  actorType!: 'user' | 'patient';
}
