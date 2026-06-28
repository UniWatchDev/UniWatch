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

function isKnownUsername(username: string, knownUsernames: ReadonlySet<string>): boolean {
  for (const known of knownUsernames) {
    if (known.localeCompare(username, undefined, { sensitivity: 'accent' }) === 0) {
      return true;
    }
  }
  return false;
}

export function renderChatContent(
  content: string,
  knownUsernames: ReadonlySet<string>
): ReactNode[] {
  return parseMentionTokens(content).map((segment, index) => {
    if (segment.type === 'text') {
      return segment.value;
    }
    if (!isKnownUsername(segment.username, knownUsernames)) {
      return segment.value;
    }
    return (
      <span key={`mention-${String(index)}`} className="cinema-chat__mention">
        {segment.value}
      </span>
    );
  });
}
