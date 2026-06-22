import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

import { API_BASE_URL } from '@repo/consts/api';
import { REALTIME_CLIENT_EVENTS, REALTIME_SERVER_EVENTS } from '@repo/consts/realtime';
import {
  joinRoomPayloadSchema,
  videoProgressEventSchema,
  videoReadyEventSchema,
  videoFailedEventSchema
} from '@repo/schemas/realtime';

/** Listen for ffmpeg transcode progress while on edit-room (no full room socket). */
export function useVideoProgressSocket(
  roomId: string | undefined,
  videoId: string | null,
  enabled: boolean
): { percent: number | null; status: 'idle' | 'processing' | 'ready' | 'failed' } {
  const [percent, setPercent] = useState<number | null>(null);
  const [status, setStatus] = useState<'idle' | 'processing' | 'ready' | 'failed'>('idle');
  const videoIdRef = useRef(videoId);

  useEffect(() => {
    videoIdRef.current = videoId;
  }, [videoId]);

  useEffect(() => {
    if (!enabled || roomId === undefined || roomId.length === 0 || videoId === null) {
      return;
    }

    const socket = io(API_BASE_URL, {
      withCredentials: true,
      transports: ['websocket']
    });

    const onProgress = (data: unknown): void => {
      const parsed = videoProgressEventSchema.safeParse(data);
      if (!parsed.success || parsed.data.roomId !== roomId) return;
      if (parsed.data.videoId !== videoIdRef.current) return;
      setStatus('processing');
      setPercent(parsed.data.percent);
      if (parsed.data.percent >= 100) {
        setStatus('ready');
      }
    };

    const onReady = (data: unknown): void => {
      const parsed = videoReadyEventSchema.safeParse(data);
      if (!parsed.success || parsed.data.roomId !== roomId) return;
      if (parsed.data.videoId !== videoIdRef.current) return;
      setPercent(100);
      setStatus('ready');
    };

    const onFailed = (data: unknown): void => {
      const parsed = videoFailedEventSchema.safeParse(data);
      if (!parsed.success || parsed.data.roomId !== roomId) return;
      if (parsed.data.videoId !== videoIdRef.current) return;
      setStatus('failed');
      setPercent(null);
    };

    socket.on(REALTIME_SERVER_EVENTS.connectionAck, () => {
      socket.emit(REALTIME_CLIENT_EVENTS.join, joinRoomPayloadSchema.parse({ roomId }));
    });
    socket.on(REALTIME_SERVER_EVENTS.videoProgress, onProgress);
    socket.on(REALTIME_SERVER_EVENTS.videoReady, onReady);
    socket.on(REALTIME_SERVER_EVENTS.videoFailed, onFailed);

    return () => {
      socket.disconnect();
    };
  }, [roomId, videoId, enabled]);

  return { percent, status };
}
