import { ApiProperty } from '@nestjs/swagger';

import { ChatMessageDto } from './chat-message.dto';

export class ChatHistoryGroupDto {
  @ApiProperty({ example: '2026-04-24' })
  date!: string;

  @ApiProperty({ example: 'Today' })
  dateLabel!: string;

  @ApiProperty({ type: ChatMessageDto, isArray: true })
  messages!: ChatMessageDto[];

  static fromEntries(entries: Array<[string, ChatMessageDto[]]>): ChatHistoryGroupDto[] {
    const today = this.toUtcDateKey(new Date());

    return entries.map(([date, messages]) => {
      const dto = new ChatHistoryGroupDto();
      dto.date = date;
      dto.dateLabel = date === today ? 'Today' : date;
      dto.messages = messages;
      return dto;
    });
  }

  private static toUtcDateKey(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
