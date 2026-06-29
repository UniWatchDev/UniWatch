function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Generates a simple SVG placeholder poster from the movie name. */
export function buildMovieThumbnailSvg(movieName: string): Buffer {
  const title = escapeXml(movieName.slice(0, 80));
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#415a77"/>
      <stop offset="45%" style="stop-color:#1b263b"/>
      <stop offset="100%" style="stop-color:#100d08"/>
    </linearGradient>
    <radialGradient id="glow" cx="28%" cy="38%" r="55%">
      <stop offset="0%" style="stop-color:#f59e0b;stop-opacity:0.22"/>
      <stop offset="100%" style="stop-color:#f59e0b;stop-opacity:0"/>
    </radialGradient>
  </defs>
  <rect width="640" height="360" fill="url(#bg)"/>
  <rect width="640" height="360" fill="url(#glow)"/>
  <text x="320" y="190" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="28" font-weight="700">${title}</text>
</svg>`;
  return Buffer.from(svg, 'utf8');
}
