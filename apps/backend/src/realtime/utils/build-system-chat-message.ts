import type { RealtimeChatMessage } from '@repo/schemas/realtime';

const SYSTEM_USER_ID = 'system';
const SYSTEM_USER_NAME = 'System';
const SYSTEM_COLOR = '#94a3b8';

export function buildSystemChatMessage(roomId: string, content: string): RealtimeChatMessage {
  return {
    id: `system-${roomId}-${String(Date.now())}-${Math.random().toString(36).slice(2, 8)}`,
    roomId,
    userId: SYSTEM_USER_ID,
    userName: SYSTEM_USER_NAME,
    color: SYSTEM_COLOR,
    content,
    timestamp: new Date().toISOString(),
    kind: 'system'
  };
}
