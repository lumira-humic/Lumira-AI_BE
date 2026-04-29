import { DataSource } from 'typeorm';

import { MedGemmaMessage } from '../../modules/medgemma/entities/medgemma-message.entity';
import { MedGemmaSession } from '../../modules/medgemma/entities/medgemma-session.entity';

type SeedSession = {
  id: string;
  role: 'doctor' | 'patient';
  createdAt: string;
  messages: Array<{
    id: string;
    sender: 'user' | 'assistant';
    message: string;
    createdAt: string;
  }>;
};

const MEDGEMMA_SEED_SESSIONS: SeedSession[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    role: 'doctor',
    createdAt: '2026-04-29T01:00:00.000Z',
    messages: [
      {
        id: '11111111-1111-4111-8111-111111111201',
        sender: 'user',
        message:
          'Pasien laki-laki 45 tahun dengan nyeri dada saat aktivitas. Apa differential diagnosis utama?',
        createdAt: '2026-04-29T01:00:00.000Z',
      },
      {
        id: '11111111-1111-4111-8111-111111111202',
        sender: 'assistant',
        message:
          'Pertimbangkan sindrom koroner akut, angina stabil, GERD, dan nyeri muskuloskeletal. Prioritaskan red flags kardiak terlebih dahulu.',
        createdAt: '2026-04-29T01:00:01.000Z',
      },
    ],
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    role: 'patient',
    createdAt: '2026-04-29T02:00:00.000Z',
    messages: [
      {
        id: '22222222-2222-4222-8222-222222222201',
        sender: 'user',
        message: 'Saya batuk pilek sejak 3 hari, apakah perlu antibiotik?',
        createdAt: '2026-04-29T02:00:00.000Z',
      },
      {
        id: '22222222-2222-4222-8222-222222222202',
        sender: 'assistant',
        message:
          'Sebagian besar batuk pilek disebabkan virus dan tidak perlu antibiotik. Istirahat, minum cukup, dan pantau tanda bahaya seperti sesak napas.',
        createdAt: '2026-04-29T02:00:01.000Z',
      },
    ],
  },
];

export async function seedMedGemma(dataSource: DataSource): Promise<void> {
  const sessionRepository = dataSource.getRepository(MedGemmaSession);
  const messageRepository = dataSource.getRepository(MedGemmaMessage);

  for (const sessionSeed of MEDGEMMA_SEED_SESSIONS) {
    const existingSession = await sessionRepository.findOne({
      where: { id: sessionSeed.id },
    });

    if (!existingSession) {
      await sessionRepository.save(
        sessionRepository.create({
          id: sessionSeed.id,
          role: sessionSeed.role,
          created_at: new Date(sessionSeed.createdAt),
          updated_at: new Date(sessionSeed.createdAt),
        }),
      );
      console.log(`[Seed] MedGemma session created -> ${sessionSeed.id}`);
    } else {
      console.log(`[Seed] MedGemma session already exists -> skip (${sessionSeed.id})`);
    }

    for (const messageSeed of sessionSeed.messages) {
      const existingMessage = await messageRepository.findOne({
        where: { id: messageSeed.id },
      });

      if (existingMessage) {
        console.log(`[Seed] MedGemma message already exists -> skip (${messageSeed.id})`);
        continue;
      }

      await messageRepository.save(
        messageRepository.create({
          id: messageSeed.id,
          session_id: sessionSeed.id,
          sender: messageSeed.sender,
          role: sessionSeed.role,
          message: messageSeed.message,
          created_at: new Date(messageSeed.createdAt),
        }),
      );
      console.log(`[Seed] MedGemma message created -> ${messageSeed.id}`);
    }
  }
}
