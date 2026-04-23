import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MedGemmaMessage } from './entities/medgemma-message.entity';
import { MedGemmaSession } from './entities/medgemma-session.entity';
import { MedGemmaController } from './medgemma.controller';
import { MedGemmaService } from './medgemma.service';

/**
 * Module for MedGemma AI medical consultation chatbot.
 * Chat history is persisted in PostgreSQL instead of Redis.
 */
@Module({
  imports: [TypeOrmModule.forFeature([MedGemmaSession, MedGemmaMessage])],
  controllers: [MedGemmaController],
  providers: [MedGemmaService],
  exports: [MedGemmaService],
})
export class MedGemmaModule {}
