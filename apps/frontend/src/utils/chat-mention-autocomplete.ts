export type ChatMentionCandidate = {
  userId: string;
  username: string;
  name: string;
  color: string;
};

export function getActiveMentionQuery(
  draft: string,
  cursor: number
): { start: number; query: string } | null {
  const safeCursor = Math.max(0, Math.min(cursor, draft.length));
  const beforeCursor = draft.slice(0, safeCursor);
  const atIndex = beforeCursor.lastIndexOf('@');
  if (atIndex === -1) {
    return null;
  }

  if (atIndex > 0 && !/\s/.test(draft.charAt(atIndex - 1))) {
    return null;
  }

  const query = beforeCursor.slice(atIndex + 1);
  if (/\s/.test(query)) {
    return null;
  }

  return { start: atIndex, query };
}

export function filterMentionCandidates(
  candidates: readonly ChatMentionCandidate[],
  query: string
): ChatMentionCandidate[] {
  const normalized = query.trim().toLowerCase();
  if (normalized.length === 0) {
    return [...candidates];
  }

  return candidates.filter((candidate) => {
    const username = candidate.username.toLowerCase();
    const name = candidate.name.toLowerCase();
    return username.startsWith(normalized) || name.startsWith(normalized);
  });
}

export function insertMention(
  draft: string,
  start: number,
  cursor: number,
  username: string
): string {
  const before = draft.slice(0, start);
  const after = draft.slice(cursor);
  return `${before}@${username} ${after}`;
}

export function mentionInsertCursor(start: number, username: string): number {
  return start + username.length + 2;
}
