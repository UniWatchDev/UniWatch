/** Parse a raw `Cookie` header into a key/value map. */
export function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};

  return Object.fromEntries(
    header.split(';').map((pair) => {
      const idx = pair.indexOf('=');
      const key = pair.slice(0, idx).trim();
      const val = pair.slice(idx + 1).trim();
      return [key, val];
    })
  );
}
