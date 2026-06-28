/** Room routes where the realtime session should stay connected. */
export function isRoomSessionPath(pathname: string, roomId: string): boolean {
  return (
    pathname === `/room/${roomId}` ||
    pathname === `/room/${roomId}/edit` ||
    pathname === `/rooms/${roomId}/edit`
  );
}

export function roomIdFromSessionPath(pathname: string): string | null {
  const roomMatch = pathname.match(/^\/room\/([^/]+)(?:\/edit)?$/);
  if (roomMatch?.[1] !== undefined) {
    return roomMatch[1];
  }

  const legacyEditMatch = pathname.match(/^\/rooms\/([^/]+)\/edit$/);
  return legacyEditMatch?.[1] ?? null;
}
