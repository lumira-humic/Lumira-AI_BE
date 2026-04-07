import { Injectable, NotImplementedException } from '@nestjs/common';
import { PredictionResultDto } from './dto';

/**
 * Service for AI prediction requests.
 */
@Injectable()
export class AiServiceService {
  /**
   * Run AI prediction on uploaded ultrasound image.
   */
  predict(_file: unknown): Promise<PredictionResultDto> {
    throw new NotImplementedException('Not implemented yet');
  }
}
