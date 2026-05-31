const RELATIVE_TIME_FORMAT = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

export function formatMovieUploadAge(isoDate: string | null | undefined): string | null {
  if (isoDate == null) return null;

  const uploadedAt = new Date(isoDate);
  if (Number.isNaN(uploadedAt.getTime())) return null;

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - uploadedAt.getTime()) / 1000));
  if (elapsedSeconds < 60) {
    return 'Uploaded just now';
  }

  if (elapsedSeconds < 3_600) {
    const minutes = Math.floor(elapsedSeconds / 60);
    return `Uploaded ${RELATIVE_TIME_FORMAT.format(-minutes, 'minute')}`;
  }

  if (elapsedSeconds < 86_400) {
    const hours = Math.floor(elapsedSeconds / 3_600);
    return `Uploaded ${RELATIVE_TIME_FORMAT.format(-hours, 'hour')}`;
  }

  const days = Math.floor(elapsedSeconds / 86_400);
  return `Uploaded ${RELATIVE_TIME_FORMAT.format(-days, 'day')}`;
}
