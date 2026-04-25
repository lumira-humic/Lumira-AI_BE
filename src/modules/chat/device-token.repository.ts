import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DeviceToken } from './entities/device-token.entity';

@Injectable()
export class DeviceTokenRepository extends Repository<DeviceToken> {
  constructor(
    @InjectRepository(DeviceToken)
    private repository: Repository<DeviceToken>,
  ) {
    super(repository.target, repository.manager, repository.queryRunner);
  }

  async findActiveByActor(actorType: 'user' | 'patient', actorId: string): Promise<DeviceToken[]> {
    return this.find({
      where: {
        actorType,
        actorId,
        isActive: true,
      },
    });
  }

  async deactivateByToken(fcmToken: string): Promise<void> {
    await this.createQueryBuilder()
      .update(DeviceToken)
      .set({ isActive: false })
      .where('fcmToken = :fcmToken', { fcmToken })
      .execute();
  }

  async findLatestSeenAtByActorIds(
    actorType: 'user' | 'patient',
    actorIds: string[],
  ): Promise<Array<{ actorId: string; lastSeenAt: Date }>> {
    if (actorIds.length === 0) {
      return [];
    }

    const rows = await this.createQueryBuilder('token')
      .select('token.actorId', 'actorId')
      .addSelect('MAX(token.lastSeenAt)', 'lastSeenAt')
      .where('token.actorType = :actorType', { actorType })
      .andWhere('token.actorId IN (:...actorIds)', { actorIds })
      .andWhere('token.isActive = true')
      .groupBy('token.actorId')
      .getRawMany<{ actorId: string; lastSeenAt: string }>();

    return rows.map((item) => ({
      actorId: item.actorId,
      lastSeenAt: new Date(item.lastSeenAt),
    }));
  }
  async updateLastSeenAt(actorType: 'user' | 'patient', actorId: string): Promise<void> {
    await this.createQueryBuilder()
      .update(DeviceToken)
      .set({ lastSeenAt: new Date() })
      .where('actorType = :actorType', { actorType })
      .andWhere('actorId = :actorId', { actorId })
      .andWhere('isActive = true')
      .execute();
  }
}
