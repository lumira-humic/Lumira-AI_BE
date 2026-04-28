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
  role: 'user' | 'model';
  content: string;
};

type ProviderRequestBody = {
  user: 'Doctor' | 'Patient';
  user_prompt: string;
  chat_history?: ProviderMessage[];
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
  async consult(dto: MedGemmaConsultDto, role: MedGemmaRole): Promise<MedGemmaResponseDto> {
    const sessionId =
      typeof dto.session_id === 'string' && dto.session_id.trim().length > 0
        ? dto.session_id
        : randomUUID();
    const userPrompt = this.resolveUserPrompt(dto);

    await this.upsertSession(sessionId, role);

    const history = await this.getRecentMessages(sessionId, HISTORY_WINDOW_SIZE);

    const aiResult: { response: string; profiling: ProfilingMetrics } = await this.requestProvider(
      userPrompt,
      role,
      sessionId,
      history,
      dto.image,
    );

    const now = new Date();
    await this.messageRepo.save([
      this.messageRepo.create({
        id: randomUUID(),
        session_id: sessionId,
        sender: 'user',
        role,
        message: userPrompt,
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

  async getChatHistory(sessionId: string, role: MedGemmaRole): Promise<MedGemmaChatHistoryDto> {
    await this.assertSessionRole(sessionId, role);
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
      return;
    }

    if (existing.role !== role) {
      throw new AppException(
        ErrorCode.FORBIDDEN,
        'Session role does not match authenticated actor role',
        403,
      );
    }

    existing.updated_at = new Date();
    await this.sessionRepo.save(existing);
  }

  private async getRecentMessages(sessionId: string, limit: number): Promise<MedGemmaMessage[]> {
    const messages = await this.messageRepo.find({
      where: { session_id: sessionId },
      order: { created_at: 'DESC' },
      take: limit,
    });

    return messages.reverse();
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
    const timeoutMs = this.configService.get<number>(
      'medgemma.providerTimeoutMs',
      DEFAULT_PROVIDER_TIMEOUT_MS,
    );

    if (!baseUrl) {
      throw new AppException(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'MedGemma provider is not configured. Set MEDGEMMA_PROVIDER_BASE_URL',
        503,
      );
    }

    const historyMessages: ProviderMessage[] = history.map((m) => ({
      role: m.sender === 'assistant' ? 'model' : 'user',
      content: m.message,
    }));

    const body: ProviderRequestBody = {
      user: this.toProviderUser(role),
      user_prompt: prompt,
      ...(historyMessages.length > 0 ? { chat_history: historyMessages } : {}),
      ...(image ? { image } : {}),
    };

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Session-Id': sessionId,
    };

    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const startedAt = Date.now();
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers,
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

    const profiling = this.extractProfiling(data, output, latencySeconds);

    return {
      response: output,
      profiling,
    };
  }

  private resolveUserPrompt(dto: MedGemmaConsultDto): string {
    const prompt = dto.user_prompt?.trim() || dto.prompt?.trim();

    if (!prompt) {
      throw new AppException(ErrorCode.VALIDATION_ERROR, "Field 'user_prompt' wajib diisi.", 400);
    }

    return prompt;
  }

  private toProviderUser(role: MedGemmaRole): 'Doctor' | 'Patient' {
    return role === 'doctor' ? 'Doctor' : 'Patient';
  }

  private async assertSessionRole(sessionId: string, role: MedGemmaRole): Promise<void> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });

    if (!session) return;

    if (session.role !== role) {
      throw new AppException(
        ErrorCode.FORBIDDEN,
        'Session role does not match authenticated actor role',
        403,
      );
    }
  }

  private extractResponseText(payload: unknown): string {
    const data = payload as Record<string, unknown>;

    if (typeof data.response === 'string') {
      return data.response;
    }

    if (typeof data.consultation_result === 'string') {
      return data.consultation_result;
    }

    if (typeof data.output_text === 'string') {
      return data.output_text;
    }

    const nestedData = data.data as Record<string, unknown> | undefined;
    if (nestedData && typeof nestedData.response === 'string') {
      return nestedData.response;
    }

    if (nestedData && typeof nestedData.consultation_result === 'string') {
      return nestedData.consultation_result;
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

  private extractProfiling(
    payload: unknown,
    output: string,
    measuredLatencySeconds: number,
  ): ProfilingMetrics {
    const data = payload as Record<string, unknown>;
    const nestedData = data.data as Record<string, unknown> | undefined;
    const profiling =
      (nestedData?.profiling as Record<string, unknown> | undefined) ??
      (data.profiling as Record<string, unknown> | undefined);

    const latencySeconds =
      this.toPositiveNumber(profiling?.latency_seconds) ?? measuredLatencySeconds;
    const tokensGenerated =
      this.toNonNegativeInteger(profiling?.tokens_generated) ??
      this.extractGeneratedTokens(payload, output);
    const tokensPerSecond =
      this.toPositiveNumber(profiling?.tokens_per_second) ??
      this.toPrecision(tokensGenerated / Math.max(latencySeconds, 0.001), 2);

    return {
      latency_seconds: latencySeconds,
      tokens_generated: tokensGenerated,
      tokens_per_second: tokensPerSecond,
    };
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

  private toPositiveNumber(value: unknown): number | null {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
    return Number(value);
  }

  private toPrecision(value: number, fractionDigits: number): number {
    return Number(value.toFixed(fractionDigits));
  }
}
