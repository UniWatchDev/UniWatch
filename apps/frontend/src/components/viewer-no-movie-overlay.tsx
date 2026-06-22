import { Clapperboard } from 'lucide-react';

export function ViewerNoMovieOverlay() {
  return (
    <div className="ready-overlay" aria-live="polite">
      <div className="ready-overlay__backdrop" aria-hidden="true" />
      <div className="ready-overlay__content fade-in">
        <Clapperboard className="ready-overlay__glyph" aria-hidden="true" />
        <p className="ready-overlay__eyebrow">No movie yet</p>
        <h2 className="ready-overlay__title">Waiting for the host</h2>
        <p className="ready-overlay__hint">
          Ask the host to upload a video to get started.
        </p>
      </div>
    </div>
  );
}
