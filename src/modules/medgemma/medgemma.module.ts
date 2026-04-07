import { Module } from '@nestjs/common';

import { MedGemmaService } from './medgemma.service';
import { MedGemmaController } from './medgemma.controller';

/**
 * Module for MedGemma AI medical consultation chatbot.
 */
@Module({
  controllers: [MedGemmaController],
  providers: [MedGemmaService],
  exports: [MedGemmaService],
})
export class MedGemmaModule {}
