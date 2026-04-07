import { Injectable, NotImplementedException } from '@nestjs/common';
import { MedGemmaConsultDto, MedGemmaResponseDto } from './dto';

/**
 * Service for MedGemma AI consultation.
 */
@Injectable()
export class MedGemmaService {
  /**
   * Process user query through MedGemma AI.
   */
  consult(_dto: MedGemmaConsultDto, _image?: unknown): Promise<MedGemmaResponseDto> {
    throw new NotImplementedException('Not implemented yet');
  }
}
