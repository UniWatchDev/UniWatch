import { useEffect, useRef, useState } from 'react';

import type { ActiveUser } from '@repo/schemas/profile';

import { apiGetActiveUsers } from '@/friends/friend-api';

const POLL_INTERVAL_MS = 3_000;

export function useActiveUsers(socketConnected: boolean): {
  users: ActiveUser[];
  loading: boolean;
  error: string | null;
} {
  const [users, setUsers] = useState<ActiveUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let mounted = true;

    function poll(): void {
      apiGetActiveUsers()
        .then((data) => {
          if (mounted) {
            setUsers(data);
            setLoading(false);
            setError(null);
          }
        })
        .catch((e: unknown) => {
          if (mounted) {
            setError(e instanceof Error ? e.message : 'Failed to load active users');
            setLoading(false);
          }
        });
    }

    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      mounted = false;
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    };
  // Re-run (and immediately re-poll) when the socket connects so self appears right away.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketConnected]);

  return { users, loading, error };
}
