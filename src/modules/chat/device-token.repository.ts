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
}
