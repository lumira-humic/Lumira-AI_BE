import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ChatMessage } from './entities/chat-message.entity';

@Injectable()
export class ChatMessageRepository extends Repository<ChatMessage> {
  constructor(
    @InjectRepository(ChatMessage)
    private repository: Repository<ChatMessage>,
  ) {
    super(repository.target, repository.manager, repository.queryRunner);
  }

  async findHistory(
    roomId: string,
    limit: number,
    before?: string,
    after?: string,
  ): Promise<ChatMessage[]> {
    const qb = this.createQueryBuilder('message')
      .leftJoinAndSelect('message.room', 'room')
      .where('message.roomId = :roomId', { roomId })
      .orderBy('message.createdAt', 'DESC')
      .take(limit);

    if (before) {
      qb.andWhere('message.createdAt < :before', { before });
    }

    if (after) {
      qb.andWhere('message.createdAt > :after', { after });
    }

    const rows = await qb.getMany();
    return rows.reverse();
  }

  async countUnreadForActor(roomId: string, receiverId: string): Promise<number> {
    return this.count({ where: { roomId, receiverId, isRead: false } });
  }

  async findByClientMessageId(
    roomId: string,
    senderId: string,
    clientMessageId: string,
  ): Promise<ChatMessage | null> {
    return this.findOne({
      where: {
        roomId,
        senderId,
        clientMessageId,
      },
    });
  }

  async findLatestByRoomIds(roomIds: string[]): Promise<ChatMessage[]> {
    if (roomIds.length === 0) {
      return [];
    }

    return this.createQueryBuilder('message')
      .distinctOn(['message.roomId'])
      .where('message.roomId IN (:...roomIds)', { roomIds })
      .orderBy('message.roomId', 'ASC')
      .addOrderBy('message.createdAt', 'DESC')
      .getMany();
  }

  async countUnreadByRoomIds(
    roomIds: string[],
    receiverId: string,
  ): Promise<Array<{ roomId: string; unreadCount: number }>> {
    if (roomIds.length === 0) {
      return [];
    }

    const rows = await this.createQueryBuilder('message')
      .select('message.roomId', 'roomId')
      .addSelect('COUNT(1)', 'unreadCount')
      .where('message.roomId IN (:...roomIds)', { roomIds })
      .andWhere('message.receiverId = :receiverId', { receiverId })
      .andWhere('message.isRead = false')
      .groupBy('message.roomId')
      .getRawMany<{ roomId: string; unreadCount: string }>();

    return rows.map((item) => ({
      roomId: item.roomId,
      unreadCount: Number(item.unreadCount),
    }));
  }
}
