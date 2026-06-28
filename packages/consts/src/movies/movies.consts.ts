export const MOVIES_ENDPOINT = '/api/movies' as const;
export const MOVIES_CATALOG_ENDPOINT = '/api/movies/catalog' as const;
export const MOVIE_RESOLVE_ENDPOINT = '/api/movies/resolve' as const;
export const MOVIE_ENDPOINT = '/api/movies/:id' as const;
export const MOVIE_UPLOAD_ENDPOINT = '/api/movies/:id/upload' as const;
export const MOVIE_STREAM_ENDPOINT = '/api/movies/:id/stream' as const;
export const MOVIE_MEDIA_ENDPOINT = '/api/movies/:id/media' as const;

export const MOVIE_MAX_BYTES = 1_073_741_824;

/** Canonical MIME types accepted for movie uploads (MP4 + QuickTime .MOV). */
export const MOVIE_ALLOWED_MIMES = ['video/mp4', 'video/quicktime'] as const;

export type MovieAllowedMime = (typeof MOVIE_ALLOWED_MIMES)[number];

export const MOVIE_MIME_EXTENSIONS: Record<MovieAllowedMime, string> = {
  'video/mp4': '.mp4',
  'video/quicktime': '.mov'
};

export const MOVIE_FILE_ACCEPT = [
  ...MOVIE_ALLOWED_MIMES,
  ...Object.values(MOVIE_MIME_EXTENSIONS)
].join(',');

const MOVIE_ALLOWED_MIME_SET = new Set<string>(MOVIE_ALLOWED_MIMES);

export function isAllowedMovieMime(mime: string): boolean {
  return MOVIE_ALLOWED_MIME_SET.has(mime);
}

export function isAllowedMovieFilename(filename: string): boolean {
  const lower = filename.toLowerCase();
  return Object.values(MOVIE_MIME_EXTENSIONS).some((ext) => lower.endsWith(ext));
}

/** Resolve MIME from browser/file metadata, falling back to extension when type is empty. */
export function resolveMovieMime(mime: string, filename: string): MovieAllowedMime | null {
  if (isAllowedMovieMime(mime)) {
    return mime as MovieAllowedMime;
  }
  const lower = filename.toLowerCase();
  if (lower.endsWith('.mp4')) return 'video/mp4';
  if (lower.endsWith('.mov')) return 'video/quicktime';
  return null;
}

export function extensionForMovieMime(mime: MovieAllowedMime): string {
  return MOVIE_MIME_EXTENSIONS[mime];
}

export const MOVIE_ALLOWED_FORMATS_LABEL = 'MP4 or MOV';
