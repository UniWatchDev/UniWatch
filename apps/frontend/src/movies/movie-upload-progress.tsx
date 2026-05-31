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
    <div style={{ marginTop: 8 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 12,
          color: 'var(--text-muted)',
          marginBottom: 6,
        }}
      >
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
        style={{
          height: 8,
          borderRadius: 999,
          background: 'var(--bg-input)',
          overflow: 'hidden',
        }}
      >
        <div
          className={indeterminate ? 'upload-progress-indeterminate' : undefined}
          style={{
            height: '100%',
            width: indeterminate ? '40%' : `${String(percent)}%`,
            background: 'linear-gradient(90deg, var(--accent), #ec4899)',
            transition: indeterminate ? undefined : 'width 200ms ease',
          }}
        />
      </div>
    </div>
  );
}
