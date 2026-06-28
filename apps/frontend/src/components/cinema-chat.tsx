import { useEffect, useRef } from 'react';
import type { ChatMessage } from '@/types/room';
import { renderChatContent } from '@/utils/chat-mentions';
import { Send } from 'lucide-react';

interface CinemaChatProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  draftMessage: string;
  onDraftMessageChange: (value: string) => void;
  friendUserIds?: ReadonlySet<string> | undefined;
  currentUsername?: string | null;
  knownUsernames?: ReadonlySet<string>;
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
  friendUserIds,
  currentUsername = null,
  knownUsernames = new Set<string>(),
  mentionedMessageIds = new Set<string>(),
}: CinemaChatProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const text = draftMessage.trim();
    if (!text) return;
    onSend(text);
    onDraftMessageChange('');
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
                className={`group${isMentioned ? ' cinema-chat__message--mentioned' : ''}`}
              >
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-xs font-bold leading-none${isFriend ? ' friend-sparkle' : ''}`}
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
                <p
                  className="mt-1 text-sm leading-relaxed"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {renderChatContent(msg.content, knownUsernames)}
                </p>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <div
        className="cinema-chat__input-bar flex items-center gap-2 border-t px-3 py-2.5"
        style={{ borderColor: 'var(--border-subtle)', flexShrink: 0 }}
      >
        <input
          className="input flex-1 text-sm"
          style={{ padding: '7px 12px' }}
          type="text"
          placeholder="Say something…"
          value={draftMessage}
          onChange={(e) => { onDraftMessageChange(e.target.value); }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
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
