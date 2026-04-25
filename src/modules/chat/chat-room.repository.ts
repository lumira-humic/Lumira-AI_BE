import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ChatRoom } from './entities/chat-room.entity';

@Injectable()
export class ChatRoomRepository extends Repository<ChatRoom> {
  constructor(
    @InjectRepository(ChatRoom)
    private repository: Repository<ChatRoom>,
  ) {
    super(repository.target, repository.manager, repository.queryRunner);
  }

  async findByMedicalRecordId(medicalRecordId: string): Promise<ChatRoom | null> {
    return this.findOne({ where: { medicalRecordId } });
  }

  async findLatestByParticipants(patientId: string, doctorId: string): Promise<ChatRoom | null> {
    return this.createQueryBuilder('room')
      .where('room.patientId = :patientId', { patientId })
      .andWhere('room.doctorId = :doctorId', { doctorId })
      .orderBy('room.createdAt', 'DESC')
      .getOne();
  }

  async listByActorWithParticipants(
    actorType: 'user' | 'patient',
    actorId: string,
  ): Promise<ChatRoom[]> {
    const qb = this.createQueryBuilder('room')
      .leftJoinAndSelect('room.patient', 'patient')
      .leftJoinAndSelect('room.doctor', 'doctor');

    if (actorType === 'patient') {
      qb.where('room.patientId = :actorId', { actorId });
    } else {
      qb.where('room.doctorId = :actorId', { actorId });
    }

    return qb.orderBy('room.updatedAt', 'DESC').getMany();
  }
}
