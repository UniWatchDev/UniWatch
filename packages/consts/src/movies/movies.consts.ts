export const MOVIES_ENDPOINT = '/api/movies' as const;
export const MOVIE_RESOLVE_ENDPOINT = '/api/movies/resolve' as const;
export const MOVIE_ENDPOINT = '/api/movies/:id' as const;
export const MOVIE_UPLOAD_ENDPOINT = '/api/movies/:id/upload' as const;
export const MOVIE_PRESIGN_UPLOAD_ENDPOINT = '/api/movies/:id/presign-upload' as const;
export const MOVIE_COMPLETE_UPLOAD_ENDPOINT = '/api/movies/:id/complete-upload' as const;
export const MOVIE_STREAM_ENDPOINT = '/api/movies/:id/stream' as const;
export const MOVIE_MEDIA_ENDPOINT = '/api/movies/:id/media' as const;

export const MOVIE_MAX_BYTES = 1_073_741_824;

/** Canonical MIME types accepted for movie uploads (MP4 + QuickTime .MOV + WebM). */
export const MOVIE_ALLOWED_MIMES = ['video/mp4', 'video/quicktime', 'video/webm'] as const;

export type MovieAllowedMime = (typeof MOVIE_ALLOWED_MIMES)[number];

export const MOVIE_MIME_EXTENSIONS: Record<MovieAllowedMime, string> = {
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
  'video/webm': '.webm'
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
  if (lower.endsWith('.webm')) return 'video/webm';
  return null;
}

export function extensionForMovieMime(mime: MovieAllowedMime): string {
  return MOVIE_MIME_EXTENSIONS[mime];
}

export const MOVIE_ALLOWED_FORMATS_LABEL = 'MP4, MOV, or WebM';
