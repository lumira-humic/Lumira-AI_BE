import { ApiProperty } from '@nestjs/swagger';

export class MedGemmaProfilingDto {
  @ApiProperty({
    description: 'Total provider request latency in seconds',
    example: 12.45,
  })
  latency_seconds!: number;

  @ApiProperty({
    description: 'Total generated output tokens from provider (or best-effort estimation)',
    example: 156,
  })
  tokens_generated!: number;

  @ApiProperty({
    description: 'Generation throughput in tokens per second',
    example: 12.53,
  })
  tokens_per_second!: number;
}

/**
 * Response DTO for MedGemma AI consultation result.
 */
export class MedGemmaResponseDto {
  @ApiProperty({
    description: 'Conversation session identifier used for stateless-per-session context',
    example: '90e73057-9959-4acd-a80e-26f1780f81f5',
  })
  session_id!: string;

  @ApiProperty({
    description: 'Resolved role context used to shape AI response style',
    enum: ['doctor', 'patient'],
    example: 'doctor',
  })
  role!: 'doctor' | 'patient';

  @ApiProperty({
    description: 'Conversation title auto-generated from AI response',
    example: 'Kemungkinan utama adalah angina stabil, namun perlu skrining red flags kardiak',
    nullable: true,
  })
  title!: string | null;

  @ApiProperty({
    description: 'AI-generated response text',
    example:
      'Based on the clinical evidence, malignant tumors typically show: irregular borders, heterogeneous echogenicity, hypoechoic structure, increased vascularity on Doppler...',
  })
  response!: string;

  @ApiProperty({
    type: MedGemmaProfilingDto,
    description: 'Inference profiling metrics',
  })
  profiling!: MedGemmaProfilingDto;
}

export class MedGemmaChatMessageDto {
  @ApiProperty({
    example: 'c34172fe-e2f4-43b1-92d2-71813ff7d3bf',
  })
  id!: string;

  @ApiProperty({
    enum: ['user', 'assistant'],
    example: 'assistant',
  })
  sender!: 'user' | 'assistant';

  @ApiProperty({
    enum: ['doctor', 'patient'],
    example: 'patient',
  })
  role!: 'doctor' | 'patient';

  @ApiProperty({
    example: 'Could these symptoms indicate an emergency condition?',
  })
  message!: string;

  @ApiProperty({
    example: '2026-04-23T12:30:00.000Z',
  })
  created_at!: string;
}

export class MedGemmaChatHistoryDto {
  @ApiProperty({
    description: 'Conversation session identifier',
    example: '90e73057-9959-4acd-a80e-26f1780f81f5',
  })
  session_id!: string;

  @ApiProperty({
    isArray: true,
    type: MedGemmaChatMessageDto,
    description: 'Latest 10 messages for this session',
  })
  messages!: MedGemmaChatMessageDto[];
}

export class MedGemmaSessionConversationDto {
  @ApiProperty({
    description: 'Conversation session identifier',
    example: '90e73057-9959-4acd-a80e-26f1780f81f5',
  })
  session_id!: string;

  @ApiProperty({
    enum: ['doctor', 'patient'],
    example: 'patient',
  })
  role!: 'doctor' | 'patient';

  @ApiProperty({
    description: 'Conversation title used to identify this session',
    example: 'Gerd akan kambuh kalo minum kopi',
    nullable: true,
  })
  title!: string | null;

  @ApiProperty({
    example: '2026-04-23T12:00:00.000Z',
  })
  created_at!: string;

  @ApiProperty({
    example: '2026-04-23T12:30:00.000Z',
  })
  updated_at!: string;

  @ApiProperty({
    isArray: true,
    type: MedGemmaChatMessageDto,
    description: 'All persisted messages in this MedGemma session',
  })
  messages!: MedGemmaChatMessageDto[];
}
