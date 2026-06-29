import { useState } from 'react';
import { Check, Link } from 'lucide-react';

import { buildRoomShareUrl } from '@/rooms/room-share-url';

const COPIED_RESET_MS = 2_000;

export function CopyRoomLinkButton({
  roomId,
  className = 'btn-ghost',
  style,
  compact = false,
}: {
  roomId: string;
  className?: string;
  style?: React.CSSProperties;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    void navigator.clipboard.writeText(buildRoomShareUrl(roomId)).then(() => {
      setCopied(true);
      window.setTimeout(() => {
        setCopied(false);
      }, COPIED_RESET_MS);
    });
  };

  return (
    <button
      type="button"
      className={className}
      style={{ padding: '7px 14px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, ...style }}
      onClick={copyLink}
      title={copied ? 'Link copied' : 'Copy room link'}
      aria-label={copied ? 'Room link copied' : 'Copy room link'}
    >
      {copied ? <Check size={14} aria-hidden="true" /> : <Link size={14} aria-hidden="true" />}
      {!compact && (copied ? 'Copied' : 'Copy link')}
      {compact && copied && <span className="sr-only">Copied</span>}
    </button>
  );
}
