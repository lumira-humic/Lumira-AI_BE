import { Column, Entity, Index } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';

import { DevicePlatform } from '../enums/device-platform.enum';

@Entity('device_tokens')
@Index(['actorType', 'actorId'])
@Index(['fcmToken'], { unique: true })
export class DeviceToken extends BaseEntity {
  @Column({ name: 'actor_type', type: 'varchar', length: 16 })
  actorType!: 'user' | 'patient';

  @Column({ name: 'actor_id', type: 'varchar', length: 32 })
  actorId!: string;

  @Column({ name: 'fcm_token', type: 'text', unique: true })
  fcmToken!: string;

  @Column({ type: 'enum', enum: DevicePlatform })
  platform!: DevicePlatform;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'last_seen_at', type: 'timestamptz', default: () => "timezone('utc', now())" })
  lastSeenAt!: Date;
}
