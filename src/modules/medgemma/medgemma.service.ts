import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';

import { ErrorCode } from '../../common/enums/error-code.enum';
import { AppException } from '../../common/exceptions/base.exception';

import {
  MedGemmaChatHistoryDto,
  MedGemmaChatMessageDto,
  MedGemmaResponseDto,
} from './dto/medgemma-response.dto';
import { MedGemmaConsultDto } from './dto/medgemma-consult.dto';
import { MedGemmaMessage } from './entities/medgemma-message.entity';
import { MedGemmaSession } from './entities/medgemma-session.entity';

type MedGemmaRole = 'doctor' | 'patient';

const HISTORY_WINDOW_SIZE = 10;
const DEFAULT_PROVIDER_TIMEOUT_MS = 30000;

type ProviderMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type ProviderRequestBody = {
  model: string;
  messages: ProviderMessage[];
  image?: string;
};

type ProfilingMetrics = {
  latency_seconds: number;
  tokens_generated: number;
  tokens_per_second: number;
};

/**
 * Service for MedGemma AI consultation.
 * Chat history is now persisted in PostgreSQL (medgemma_sessions / medgemma_messages)
 * instead of the previous Redis cache layer.
 */
@Injectable()
export class MedGemmaService {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(MedGemmaSession)
    private readonly sessionRepo: Repository<MedGemmaSession>,
    @InjectRepository(MedGemmaMessage)
    private readonly messageRepo: Repository<MedGemmaMessage>,
  ) {}

  /**
   * Process user query through MedGemma AI.
   */
  async consult(
    dto: MedGemmaConsultDto,
    role: MedGemmaRole,
    _image?: unknown,
  ): Promise<MedGemmaResponseDto> {
    const request = dto as {
      session_id?: string;
      prompt: string;
      image?: string;
    };

    const sessionId =
      typeof request.session_id === 'string' && request.session_id.trim().length > 0
        ? request.session_id
        : randomUUID();

    // Upsert the session row
    await this.upsertSession(sessionId, role);

    // Fetch last N messages for context window
    const history = await this.getRecentMessages(sessionId, HISTORY_WINDOW_SIZE);

    const aiResult: { response: string; profiling: ProfilingMetrics } = await this.requestProvider(
      request.prompt,
      role,
      sessionId,
      history,
      request.image,
    );

    // Persist the new user + assistant messages
    const now = new Date();
    await this.messageRepo.save([
      this.messageRepo.create({
        id: randomUUID(),
        session_id: sessionId,
        sender: 'user',
        role,
        message: request.prompt,
        created_at: now,
      }),
      this.messageRepo.create({
        id: randomUUID(),
        session_id: sessionId,
        sender: 'assistant',
        role,
        message: aiResult.response,
        created_at: new Date(now.getTime() + 1), // guarantee ordering
      }),
    ]);

    return {
      session_id: sessionId,
      role,
      response: aiResult.response,
      profiling: {
        latency_seconds: Number(aiResult.profiling.latency_seconds),
        tokens_generated: Number(aiResult.profiling.tokens_generated),
        tokens_per_second: Number(aiResult.profiling.tokens_per_second),
      },
    };
  }

  async getChatHistory(sessionId: string): Promise<MedGemmaChatHistoryDto> {
    const messages = await this.getRecentMessages(sessionId, HISTORY_WINDOW_SIZE);

    return {
      session_id: sessionId,
      messages: messages.map((m) => this.toChatMessageDto(m)),
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async upsertSession(sessionId: string, role: MedGemmaRole): Promise<void> {
    const existing = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!existing) {
      await this.sessionRepo.save(this.sessionRepo.create({ id: sessionId, role }));
    }
  }

  private async getRecentMessages(sessionId: string, limit: number): Promise<MedGemmaMessage[]> {
    return this.messageRepo.find({
      where: { session_id: sessionId },
      order: { created_at: 'ASC' },
      take: limit,
    });
  }

  private toChatMessageDto(message: MedGemmaMessage): MedGemmaChatMessageDto {
    return {
      id: message.id,
      sender: message.sender as 'user' | 'assistant',
      role: message.role as MedGemmaRole,
      message: message.message,
      created_at: message.created_at.toISOString(),
    };
  }

  private async requestProvider(
    prompt: string,
    role: MedGemmaRole,
    sessionId: string,
    history: MedGemmaMessage[],
    image?: string,
  ): Promise<{ response: string; profiling: ProfilingMetrics }> {
    const baseUrl = this.configService.get<string>('medgemma.providerBaseUrl', '');
    const apiKey = this.configService.get<string>('medgemma.providerApiKey', '');
    const model = this.configService.get<string>('medgemma.providerModel', 'medgemma');
    const timeoutMs = this.configService.get<number>(
      'medgemma.providerTimeoutMs',
      DEFAULT_PROVIDER_TIMEOUT_MS,
    );

    if (!baseUrl || !apiKey) {
      throw new AppException(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'MedGemma provider is not configured. Set MEDGEMMA_PROVIDER_BASE_URL and MEDGEMMA_PROVIDER_API_KEY',
        503,
      );
    }

    const systemPrompt = this.buildSystemPrompt(role);
    const historyMessages: ProviderMessage[] = history.map((m) => ({
      role: m.sender === 'assistant' ? 'assistant' : 'user',
      content: m.message,
    }));

    const body: ProviderRequestBody = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...historyMessages,
        { role: 'user', content: prompt },
      ],
      ...(image ? { image } : {}),
    };

    const startedAt = Date.now();
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-Session-Id': sessionId,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new AppException(
        ErrorCode.INTERNAL_SERVER_ERROR,
        `MedGemma provider request failed (${response.status}): ${errorText || 'No details'}`,
        502,
      );
    }

    const data: unknown = await response.json();
    const latencySeconds = this.toPrecision((Date.now() - startedAt) / 1000, 2);
    const output = this.extractResponseText(data);

    if (!output) {
      throw new AppException(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'MedGemma provider returned empty response',
        502,
      );
    }

    const tokensGenerated = this.extractGeneratedTokens(data, output);

    return {
      response: output,
      profiling: {
        latency_seconds: latencySeconds,
        tokens_generated: tokensGenerated,
        tokens_per_second: this.toPrecision(tokensGenerated / Math.max(latencySeconds, 0.001), 2),
      },
    };
  }

  private buildSystemPrompt(role: MedGemmaRole): string {
    if (role === 'doctor') {
      return [
        'You are MedGemma clinical assistant for licensed doctors.',
        'Respond with technical medical language, differential diagnosis framing, and concise clinical reasoning.',
        'Do not claim certainty and include caution for clinical validation when needed.',
      ].join(' ');
    }

    return [
      'You are MedGemma patient-facing assistant.',
      'Use consultative and empathetic language in Indonesian, easy to understand by patients.',
      'Do not replace doctors; highlight warning signs requiring direct medical attention.',
    ].join(' ');
  }

  private extractResponseText(payload: unknown): string {
    const data = payload as Record<string, unknown>;

    if (typeof data.response === 'string') {
      return data.response;
    }

    if (typeof data.output_text === 'string') {
      return data.output_text;
    }

    const nestedData = data.data as Record<string, unknown> | undefined;
    if (nestedData && typeof nestedData.response === 'string') {
      return nestedData.response;
    }

    const choices = data.choices as Array<Record<string, unknown>> | undefined;
    const message = choices?.[0]?.message as Record<string, unknown> | undefined;
    const content = message?.content;

    if (typeof content === 'string') {
      return content;
    }

    if (Array.isArray(content)) {
      return content
        .map((item) => {
          const part = item as Record<string, unknown>;
          return typeof part.text === 'string' ? part.text : '';
        })
        .join('')
        .trim();
    }

    return '';
  }

  private extractGeneratedTokens(payload: unknown, output: string): number {
    const data = payload as Record<string, unknown>;
    const usage = data.usage as Record<string, unknown> | undefined;

    const usageOutputTokens = this.toNonNegativeInteger(usage?.output_tokens);
    if (usageOutputTokens !== null) return usageOutputTokens;

    const usageCompletionTokens = this.toNonNegativeInteger(usage?.completion_tokens);
    if (usageCompletionTokens !== null) return usageCompletionTokens;

    const nestedData = data.data as Record<string, unknown> | undefined;
    const nestedUsage = nestedData?.usage as Record<string, unknown> | undefined;

    const nestedOutputTokens = this.toNonNegativeInteger(nestedUsage?.output_tokens);
    if (nestedOutputTokens !== null) return nestedOutputTokens;

    const nestedCompletionTokens = this.toNonNegativeInteger(nestedUsage?.completion_tokens);
    if (nestedCompletionTokens !== null) return nestedCompletionTokens;

    // Best-effort: ~1 token per 4 characters
    return Math.max(1, Math.ceil(output.length / 4));
  }

  private toNonNegativeInteger(value: unknown): number | null {
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    const rounded = Math.floor(value);
    return rounded >= 0 ? rounded : null;
  }

  private toPrecision(value: number, fractionDigits: number): number {
    return Number(value.toFixed(fractionDigits));
  }
}
