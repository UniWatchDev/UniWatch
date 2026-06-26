import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

import { API_BASE_URL } from '@repo/consts/api';
import { REALTIME_CLIENT_EVENTS, REALTIME_SERVER_EVENTS } from '@repo/consts/realtime';
import type { DirectMessage } from '@repo/schemas/dm';
import type { FriendPresence } from '@repo/schemas/realtime';

import { useCookieAuth } from '@/auth/use-cookie-auth';
import { PresetAvatar } from '@/components/preset-avatar';
import { apiFetchDmHistory } from '@/friends/friend-api';
import { useFriendContext } from '@/friends/use-friend-context';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

interface DmWindowContentProps {
  targetUserId: string;
  friend: FriendPresence | undefined;
  onClose: () => void;
}

function DmWindowContent({ targetUserId, friend, onClose }: DmWindowContentProps) {
  const { sessionUser } = useCookieAuth();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const myUserId = sessionUser?.userId ?? null;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    let alive = true;

    apiFetchDmHistory(targetUserId)
      .then((history) => {
        if (alive) setMessages(history);
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setLoading(false);
      });

    const socket = io(API_BASE_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on(REALTIME_SERVER_EVENTS.dmReceived, (raw: unknown) => {
      const msg = raw as {
        messageId: string;
        fromUserId: string;
        content: string;
        createdAt: string;
      };
      if (!alive) return;
      setMessages((prev) => [
        ...prev,
        {
          messageId: msg.messageId,
          conversationId: '',
          fromUserId: msg.fromUserId,
          content: msg.content,
          createdAt: msg.createdAt
        }
      ]);
    });

    return () => {
      alive = false;
      socket.disconnect();
      socketRef.current = null;
    };
  }, [targetUserId]);

  const sendMessage = useCallback(() => {
    const text = draft.trim();
    if (text === '' || socketRef.current === null) return;
    socketRef.current.emit(REALTIME_CLIENT_EVENTS.dmSend, {
      targetUserId,
      content: text
    });
    if (myUserId !== null) {
      setMessages((prev) => [
        ...prev,
        {
          messageId: crypto.randomUUID(),
          conversationId: '',
          fromUserId: myUserId,
          content: text,
          createdAt: new Date().toISOString()
        }
      ]);
    }
    setDraft('');
  }, [draft, myUserId, targetUserId]);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 1000,
        width: 340,
        maxHeight: 480,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-medium)'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          flexShrink: 0
        }}
      >
        {friend !== undefined && <PresetAvatar avatarId={friend.avatarId} size={32} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            {friend?.userName ?? 'Direct Message'}
          </p>
        </div>
        <button
          type="button"
          aria-label="Close DM"
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: 20,
            cursor: 'pointer',
            padding: 0,
            lineHeight: 1
          }}
        >
          x
        </button>
      </div>

      <div
        className="soft-scroll"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10
        }}
      >
        {loading && (
          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
            Loading…
          </p>
        )}
        {!loading && messages.length === 0 && (
          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
            No messages yet. Say hello!
          </p>
        )}
        {messages.map((msg) => {
          const isMe = msg.fromUserId === myUserId;
          return (
            <div
              key={msg.messageId}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isMe ? 'flex-end' : 'flex-start'
              }}
            >
              <div
                style={{
                  maxWidth: '80%',
                  padding: '8px 12px',
                  borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  background: isMe ? 'var(--accent)' : 'var(--bg-card)',
                  color: isMe ? '#fff' : 'var(--text-secondary)',
                  fontSize: 13
                }}
              >
                {msg.content}
              </div>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                {formatTime(msg.createdAt)}
              </span>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: '10px 12px',
          borderTop: '1px solid var(--border-subtle)',
          flexShrink: 0
        }}
      >
        <input
          className="input"
          style={{ flex: 1, padding: '7px 12px', fontSize: 13 }}
          placeholder="Message…"
          value={draft}
          onChange={(e) => { setDraft(e.target.value); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
        />
        <button
          type="button"
          className="btn-primary"
          style={{ padding: '7px 14px', fontSize: 13 }}
          onClick={sendMessage}
        >
          Send
        </button>
      </div>
    </div>
  );
}

export function DmWindow() {
  const { dmOpenForUserId, closeDm, friends } = useFriendContext();

  if (dmOpenForUserId === null) return null;

  const friend = friends.find((f) => f.userId === dmOpenForUserId);

  return (
    <DmWindowContent
      key={dmOpenForUserId}
      targetUserId={dmOpenForUserId}
      friend={friend}
      onClose={closeDm}
    />
  );
}
