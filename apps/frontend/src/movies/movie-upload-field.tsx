import { useRef } from 'react';

import { MOVIE_FILE_ACCEPT, validateMovieFile } from '@/movies/upload-movie-file';
import { MOVIE_ALLOWED_FORMATS_LABEL } from '@repo/consts/movies';

export function MovieUploadField({
  label = 'Video file',
  file,
  error,
  onFileChange,
  onRemove,
  disabled,
}: {
  label?: string;
  file: File | null;
  error?: string | undefined;
  onFileChange: (file: File | null, validationError: string | null) => void;
  onRemove?: () => void;
  disabled?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (next: File | null) => {
    if (next === null) {
      onFileChange(null, null);
      return;
    }
    onFileChange(next, validateMovieFile(next));
  };

  return (
    <div>
      <label style={labelStyle}>
        {label}
        <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 4 }}>(optional)</span>
      </label>
      <div
        role="button"
        tabIndex={disabled === true ? -1 : 0}
        onClick={() => { if (!disabled) fileInputRef.current?.click(); }}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        style={{
          marginTop: 6,
          padding: '20px',
          border: '2px dashed var(--border-medium)',
          borderRadius: 10,
          textAlign: 'center',
          transition: 'border-color 200ms ease, background 200ms ease',
          background: file ? 'var(--accent-dim)' : 'transparent',
          borderColor: file ? 'var(--accent)' : error ? '#f87171' : 'var(--border-medium)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.7 : 1,
        }}
      >
        {file ? (
          <div>
            <p style={{ fontSize: 24, margin: '0 0 6px' }}>🎬</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 2px' }}>
              {file.name}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
              {(file.size / 1024 / 1024).toFixed(1)} MB
            </p>
            {onRemove && (
              <button
                type="button"
                className="btn-danger"
                disabled={disabled}
                style={{ marginTop: 12, padding: '8px 14px', fontSize: 13 }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (disabled) return;
                  onRemove();
                  if (fileInputRef.current !== null) {
                    fileInputRef.current.value = '';
                  }
                }}
              >
                Remove
              </button>
            )}
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 24, margin: '0 0 6px' }}>📁</p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 2px' }}>
              Click to upload a video file
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
              {MOVIE_ALLOWED_FORMATS_LABEL}, up to 1 GB
            </p>
          </div>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept={MOVIE_FILE_ACCEPT}
        aria-label="Upload movie file"
        disabled={disabled}
        style={{ display: 'none' }}
        onChange={(e) => {
          handleChange(e.target.files?.[0] ?? null);
        }}
      />
      {error && <p style={{ marginTop: 4, fontSize: 12, color: '#f87171' }}>{error}</p>}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--text-secondary)',
};
