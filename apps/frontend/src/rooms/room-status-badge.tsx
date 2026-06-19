import type { RoomStatus } from '@repo/schemas/rooms';

import { Badge } from '@/components/ui/badge';
import { ROOM_STATUS_DISPLAY } from '@/rooms/room-status-display';

export function RoomStatusBadge({ status }: { status: RoomStatus }) {
  const cfg = ROOM_STATUS_DISPLAY[status];
  return (
    <Badge variant="outline" className={cfg.className}>
      {cfg.label}
    </Badge>
  );
}
