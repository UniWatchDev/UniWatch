import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChatMessage } from '@/types/room';
import {
  filterMentionCandidates,
  getActiveMentionQuery,
  insertMention,
  mentionInsertCursor,
  type ChatMentionCandidate,
} from '@/utils/chat-mention-autocomplete';
import { renderChatContent } from '@/utils/chat-mentions';
import { Send } from 'lucide-react';

interface CinemaChatProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  draftMessage: string;
  onDraftMessageChange: (value: string) => void;
  mentionCandidates?: readonly ChatMentionCandidate[];
  friendUserIds?: ReadonlySet<string> | undefined;
  currentUsername?: string | null;
  usernameColors?: ReadonlyMap<string, string>;
  mentionedMessageIds?: ReadonlySet<string>;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function CinemaChat({
  messages,
  onSend,
  draftMessage,
  onDraftMessageChange,
  mentionCandidates = [],
  friendUserIds,
  currentUsername = null,
  usernameColors = new Map<string, string>(),
  mentionedMessageIds = new Set<string>(),
}: CinemaChatProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [mentionCursor, setMentionCursor] = useState(0);
  const [mentionHighlight, setMentionHighlight] = useState(0);

  const activeMention = useMemo(
    () => getActiveMentionQuery(draftMessage, mentionCursor),
    [draftMessage, mentionCursor]
  );

  const filteredMentionCandidates = useMemo(() => {
    if (activeMention === null) {
      return [];
    }
    return filterMentionCandidates(mentionCandidates, activeMention.query);
  }, [activeMention, mentionCandidates]);

  const mentionMenuOpen = activeMention !== null && filteredMentionCandidates.length > 0;

  useEffect(() => {
    setMentionHighlight(0);
  }, [activeMention?.query, filteredMentionCandidates.length]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const syncMentionCursor = () => {
    const cursor = inputRef.current?.selectionStart;
    if (cursor !== null && cursor !== undefined) {
      setMentionCursor(cursor);
    }
  };

  const applyMention = (candidate: ChatMentionCandidate) => {
    if (activeMention === null) {
      return;
    }
    const nextDraft = insertMention(
      draftMessage,
      activeMention.start,
      mentionCursor,
      candidate.username
    );
    onDraftMessageChange(nextDraft);
    const nextCursor = mentionInsertCursor(activeMention.start, candidate.username);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(nextCursor, nextCursor);
      setMentionCursor(nextCursor);
    });
  };

  const handleSend = () => {
    if (mentionMenuOpen) {
      const selected = filteredMentionCandidates[mentionHighlight];
      if (selected !== undefined) {
        applyMention(selected);
      }
      return;
    }
    const text = draftMessage.trim();
    if (!text) return;
    onSend(text);
    onDraftMessageChange('');
    setMentionCursor(0);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (mentionMenuOpen) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setMentionHighlight((index) => (index + 1) % filteredMentionCandidates.length);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setMentionHighlight(
          (index) => (index - 1 + filteredMentionCandidates.length) % filteredMentionCandidates.length
        );
        return;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        const selected = filteredMentionCandidates[mentionHighlight];
        if (selected !== undefined) {
          applyMention(selected);
        }
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        inputRef.current?.blur();
        return;
      }
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="cinema-chat flex h-full flex-col">
      <div
        className="soft-scroll cinema-chat__messages flex-1 overflow-y-auto px-3 py-3"
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
          messages.map((msg) => {
            if (msg.kind === 'system') {
              return (
                <p key={msg.id} className="cinema-chat__system-line">
                  {msg.content}
                </p>
              );
            }

            const isFriend = friendUserIds?.has(msg.userId) ?? false;
            const isMentioned =
              currentUsername != null &&
              currentUsername.length > 0 &&
              mentionedMessageIds.has(msg.id);

            return (
              <div
                key={msg.id}
                className={`cinema-chat__message group${isMentioned ? ' cinema-chat__message--mentioned' : ''}`}
                style={{ '--chat-user-color': msg.color } as React.CSSProperties}
              >
                <div className="cinema-chat__message-header flex items-baseline gap-2">
                  <span
                    className="cinema-chat__author-dot shrink-0"
                    style={{ backgroundColor: msg.color }}
                    aria-hidden="true"
                  />
                  <span
                    className={`cinema-chat__author text-xs font-bold leading-none${isFriend ? ' friend-sparkle' : ''}`}
                    style={{ color: msg.color }}
                  >
                    {msg.userName}{isFriend ? ' ✨' : ''}
                  </span>
                  <span
                    className="text-[10px] opacity-0 transition-opacity group-hover:opacity-100"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
                <p className="cinema-chat__body mt-1 text-sm leading-relaxed">
                  {renderChatContent(msg.content, usernameColors)}
                </p>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <div
        className="cinema-chat__input-bar relative flex items-center gap-2 border-t px-3 py-2.5"
        style={{ borderColor: 'var(--border-subtle)', flexShrink: 0 }}
      >
        {mentionMenuOpen && (
          <div className="cinema-chat__mention-menu" role="listbox" aria-label="Mention a viewer">
            {filteredMentionCandidates.map((candidate, index) => (
              <button
                key={candidate.userId}
                type="button"
                role="option"
                aria-selected={index === mentionHighlight}
                className={`cinema-chat__mention-option${index === mentionHighlight ? ' is-active' : ''}`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  applyMention(candidate);
                }}
              >
                <span
                  className="cinema-chat__mention-option-dot"
                  style={{ backgroundColor: candidate.color }}
                  aria-hidden="true"
                />
                <span className="cinema-chat__mention-option-name">{candidate.name}</span>
                <span className="cinema-chat__mention-option-username">@{candidate.username}</span>
              </button>
            ))}
          </div>
        )}

        <input
          ref={inputRef}
          className="input flex-1 text-sm"
          style={{ padding: '7px 12px' }}
          type="text"
          placeholder="Say something… (@ to mention)"
          value={draftMessage}
          onChange={(event) => {
            onDraftMessageChange(event.target.value);
            setMentionCursor(event.target.selectionStart ?? event.target.value.length);
          }}
          onClick={syncMentionCursor}
          onKeyUp={syncMentionCursor}
          onKeyDown={handleKeyDown}
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
