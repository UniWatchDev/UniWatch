import { useEffect, useRef } from 'react';
import type { ChatMessage } from '@/types/room';
import { Send } from 'lucide-react';

interface CinemaChatProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  draftMessage: string;
  onDraftMessageChange: (value: string) => void;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function CinemaChat({ messages, onSend, draftMessage, onDraftMessageChange }: CinemaChatProps) {
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
    <div className="flex h-full flex-col">
      {/* Message list */}
      <div
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
                {msg.content}
              </p>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      {/* Input bar */}
      <div
        className="flex items-center gap-2 border-t px-3 py-2.5"
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
