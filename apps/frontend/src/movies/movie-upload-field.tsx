import { useRef, useState } from 'react';

import { MOVIE_FILE_ACCEPT, validateMovieFile } from '@/movies/upload-movie-file';
import { MOVIE_ALLOWED_FORMATS_LABEL } from '@repo/consts/movies';

export function MovieUploadField({
  label = 'Video file',
  file,
  error,
  onFileChange,
  onRemove,
  disabled,
  required = false,
}: {
  label?: string;
  file: File | null;
  error?: string | undefined;
  onFileChange: (file: File | null, validationError: string | null) => void;
  onRemove?: () => void;
  disabled?: boolean;
  required?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

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
        {!required ? (
          <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 4 }}>(optional)</span>
        ) : (
          <span style={{ color: '#f87171', marginLeft: 2 }}>*</span>
        )}
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
        onDragEnter={(e) => {
          if (disabled) return;
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(e) => {
          if (disabled) return;
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          if (disabled) return;
          e.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(e) => {
          if (disabled) return;
          e.preventDefault();
          setIsDragging(false);
          handleChange(e.dataTransfer.files[0] ?? null);
        }}
        style={{
          marginTop: 6,
          padding: '18px',
          border: `1px solid ${file ? 'var(--accent)' : isDragging ? 'var(--accent)' : error ? '#f87171' : 'var(--border-medium)'}`,
          borderRadius: 14,
          textAlign: 'center',
          transition: 'border-color 200ms ease, background 200ms ease, transform 200ms ease',
          background: file ? 'var(--accent-dim)' : isDragging ? 'var(--accent-dim)' : 'transparent',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.7 : 1,
          minHeight: 158,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {file ? (
          <div style={{ display: 'grid', gap: 12, width: '100%', maxWidth: 360 }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--accent-dim)',
                  color: 'var(--accent)',
                  fontSize: 24,
                }}
              >
                🎬
              </div>
            </div>
            <div style={{ display: 'grid', gap: 4 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                {file.name}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                {(file.size / 1024 / 1024).toFixed(1)} MB · Selected for upload
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-ghost"
                disabled={disabled}
                style={{ padding: '8px 14px', fontSize: 13 }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (disabled) return;
                  fileInputRef.current?.click();
                }}
              >
                Replace file
              </button>
              {onRemove && (
                <button
                  type="button"
                  className="btn-danger"
                  disabled={disabled}
                  style={{ padding: '8px 14px', fontSize: 13 }}
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
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12, width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--bg-input)',
                  color: 'var(--text-secondary)',
                  fontSize: 24,
                }}
              >
                📁
              </div>
            </div>
            <div style={{ display: 'grid', gap: 4 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Drop a video file here or browse
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                {MOVIE_ALLOWED_FORMATS_LABEL}, up to 1 GB
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 10px',
                  borderRadius: 999,
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-elevated)',
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                }}
              >
                <span>Click to choose</span>
                <span style={{ color: 'var(--text-muted)' }}>or drag and drop</span>
              </span>
            </div>
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
