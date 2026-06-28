import type { ReactNode } from 'react';

export type ChatContentSegment =
  | { type: 'text'; value: string }
  | { type: 'mention'; value: string; username: string };

const MENTION_PATTERN = /@([a-zA-Z0-9_-]+)/g;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function parseMentionTokens(content: string): ChatContentSegment[] {
  const segments: ChatContentSegment[] = [];
  let lastIndex = 0;

  for (const match of content.matchAll(MENTION_PATTERN)) {
    const start = match.index;
    if (start > lastIndex) {
      segments.push({ type: 'text', value: content.slice(lastIndex, start) });
    }
    const username = match[1] ?? '';
    segments.push({ type: 'mention', value: match[0], username });
    lastIndex = start + match[0].length;
  }

  if (lastIndex < content.length) {
    segments.push({ type: 'text', value: content.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: 'text', value: content }];
}

export function messageMentionsUsername(content: string, username: string): boolean {
  if (username.length === 0) {
    return false;
  }
  const pattern = new RegExp(`@${escapeRegExp(username)}\\b`, 'i');
  return pattern.test(content);
}

function resolveUsernameColor(
  username: string,
  usernameColors: ReadonlyMap<string, string>
): string | undefined {
  return usernameColors.get(username.toLowerCase());
}

function isKnownUsername(username: string, usernameColors: ReadonlyMap<string, string>): boolean {
  return resolveUsernameColor(username, usernameColors) !== undefined;
}

export function buildUsernameColorMap(
  entries: ReadonlyArray<{ username: string; color: string }>
): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of entries) {
    map.set(entry.username.toLowerCase(), entry.color);
  }
  return map;
}

export function renderChatContent(
  content: string,
  usernameColors: ReadonlyMap<string, string>
): ReactNode[] {
  return parseMentionTokens(content).map((segment, index) => {
    if (segment.type === 'text') {
      return segment.value;
    }
    if (!isKnownUsername(segment.username, usernameColors)) {
      return segment.value;
    }
    const color = resolveUsernameColor(segment.username, usernameColors) ?? 'var(--accent)';
    return (
      <span
        key={`mention-${String(index)}`}
        className="cinema-chat__mention"
        style={{ color }}
      >
        {segment.value}
      </span>
    );
  });
}
