import { useEffect, useRef, useState } from 'react';

import { ArrowDown, Send } from 'lucide-react';

import type { ChatMessage } from '@/types/room';

interface CinemaChatProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  draftMessage: string;
  onDraftMessageChange: (value: string) => void;
  currentUserId: string | null;
  members?: { id: string; name: string }[];
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getMentionQuery(text: string): string | null {
  const match = /@(\w*)$/.exec(text);
  return match !== null ? (match[1] ?? '') : null;
}

/** Splits a message into plain text and highlighted `@mention` spans. */
function renderMessageContent(content: string): React.ReactNode {
  return content.split(/(@\w+)/g).map((part, index) =>
    /^@\w+$/.test(part) ? (
      <span key={`${String(index)}-${part}`} className="chat-mention">
        {part}
      </span>
    ) : (
      part
    )
  );
}

export function CinemaChat({
  messages,
  onSend,
  draftMessage,
  onDraftMessageChange,
  currentUserId,
  members = [],
}: CinemaChatProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  // lastSeenCount is state so it can be read during render without a ref.
  // It is updated only from event handlers (scroll, button click).
  const [lastSeenCount, setLastSeenCount] = useState(0);

  // @mention autocomplete
  const mentionQuery = getMentionQuery(draftMessage);
  const showMention = mentionQuery !== null;
  const mentionMatches = showMention
    ? members.filter((m) =>
        m.id !== currentUserId &&
        m.name.toLowerCase().startsWith(mentionQuery.toLowerCase())
      )
    : [];

  // Track scroll position via event handler (no ref reads during render).
  useEffect(() => {
    const el = listRef.current;
    if (el === null) return;
    const onScroll = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 32;
      setIsAtBottom(atBottom);
      if (atBottom) setLastSeenCount(messages.length);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => { el.removeEventListener('scroll', onScroll); };
  }, [messages.length]);

  // Auto-scroll to bottom when new messages arrive and user is already at bottom.
  useEffect(() => {
    if (messages.length === 0 || !isAtBottom) return;
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAtBottom]);

  // Unread count derived from state — no ref access, no setState in effect.
  const unreadCount = isAtBottom ? 0 : Math.max(0, messages.length - lastSeenCount);

  const scrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
    setIsAtBottom(true);
    setLastSeenCount(messages.length);
  };

  const handleSend = () => {
    const text = draftMessage.trim();
    if (!text) return;
    onSend(text);
    onDraftMessageChange('');
    scrollToBottom();
  };

  const completeMention = (name: string) => {
    const replaced = draftMessage.replace(/@\w*$/, `@${name} `);
    onDraftMessageChange(replaced);
    inputRef.current?.focus();
  };

  return (
    <div className="flex h-full flex-col" style={{ position: 'relative' }}>
      {/* Message list */}
      <div
        ref={listRef}
        className="soft-scroll flex-1 overflow-y-auto px-3 py-3"
        style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        {messages.length === 0 ? (
          <p
            className="mt-8 text-center text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            No messages yet. Say something!
          </p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="group">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-bold leading-none" style={{ color: msg.color }}>
                  {msg.userName}
                </span>
                <span
                  className="text-[10px] opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {formatTime(msg.timestamp)}
                </span>
              </div>
              <p
                className="mt-1 text-sm leading-relaxed"
                style={{ color: 'var(--text-secondary)' }}
              >
                {renderMessageContent(msg.content)}
              </p>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      {/* Scroll-to-bottom pill */}
      {!isAtBottom && (
        <button
          type="button"
          className="cinema-chat__scroll-btn"
          onClick={scrollToBottom}
          aria-label="Scroll to latest messages"
        >
          <ArrowDown size={12} />
          {unreadCount > 0 && (
            <span className="cinema-chat__unread">{unreadCount > 99 ? '99+' : String(unreadCount)}</span>
          )}
        </button>
      )}

      {/* @mention autocomplete */}
      {showMention && mentionMatches.length > 0 && (
        <div className="cinema-chat__mention-popover" role="listbox" aria-label="Mention suggestions">
          {mentionMatches.map((m) => (
            <button
              key={m.id}
              type="button"
              role="option"
              aria-selected="false"
              className="cinema-chat__mention-opt"
              onMouseDown={(e) => {
                e.preventDefault(); // prevent input blur
                completeMention(m.name);
              }}
            >
              <span className="cinema-chat__mention-name">@{m.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div
        className="flex items-center gap-2 border-t px-3 py-2.5"
        style={{ borderColor: 'var(--border-subtle)', flexShrink: 0 }}
      >
        <input
          ref={inputRef}
          className="input flex-1 text-sm"
          style={{ padding: '7px 12px' }}
          type="text"
          placeholder="Say something…"
          value={draftMessage}
          onChange={(e) => { onDraftMessageChange(e.target.value); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSend();
            }
            if (e.key === 'Escape' && showMention) {
              e.preventDefault();
              onDraftMessageChange(draftMessage.replace(/@\w*$/, ''));
            }
          }}
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="button"
          onClick={handleSend}
          className="cinema-chat__send"
        >
          <Send size={13} />
        </button>
      </div>
    </div>
  );
}
