/**
 * Supported durable side effects in chat domain.
 */
export enum ChatOutboxEventType {
  ROOM_UPSERT = 'room_upsert',
  MESSAGE_SYNC = 'message_sync',
  ROOM_MESSAGES_READ = 'room_messages_read',
  ROOM_FIRST_CONTACT = 'room_first_contact',
  FCM_SEND = 'fcm_send',
}
