import { Module } from '@nestjs/common';

import { AiServiceService } from './ai-service.service';
import { AiServiceController } from './ai-service.controller';

/**
 * Module for AI prediction service.
 */
@Module({
  controllers: [AiServiceController],
  providers: [AiServiceService],
  exports: [AiServiceService],
})
export class AiServiceModule {}
