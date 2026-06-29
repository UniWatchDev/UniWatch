export function MovieUploadProgress({
  percent,
  label = 'Uploading video…',
  indeterminate = false,
}: {
  percent: number;
  label?: string;
  indeterminate?: boolean;
}) {
  return (
    <div className="movie-upload-progress">
      <div className="movie-upload-progress__header">
        <span>{label}</span>
        {!indeterminate && <span>{percent}%</span>}
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={indeterminate ? undefined : percent}
        aria-busy={indeterminate}
        aria-label={label}
        className="movie-upload-progress__track"
      >
        <div
          className={indeterminate ? 'movie-upload-progress__fill upload-progress-indeterminate' : 'movie-upload-progress__fill'}
          style={indeterminate ? undefined : { width: `${String(percent)}%` }}
        />
      </div>
    </div>
  );
}
