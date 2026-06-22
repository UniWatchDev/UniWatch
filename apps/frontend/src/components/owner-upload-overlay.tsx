import { useRef, useState } from 'react';
import { Film, Loader2, Upload } from 'lucide-react';

import { MOVIE_FILE_ACCEPT, validateMovieFile } from '@/movies/upload-movie-file';
import { MOVIE_ALLOWED_FORMATS_LABEL } from '@repo/consts/movies';

interface OwnerUploadOverlayProps {
  file: File | null;
  error: string | null;
  uploadPercent: number | null;
  notice: string | null;
  saving: boolean;
  onFileChange: (file: File | null, validationError: string | null) => void;
  onRemove: () => void;
  onUpload: () => void;
}

export function OwnerUploadOverlay({
  file,
  error,
  uploadPercent,
  notice,
  saving,
  onFileChange,
  onRemove,
  onUpload,
}: OwnerUploadOverlayProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleChange = (next: File | null) => {
    if (next === null) {
      onFileChange(null, null);
      return;
    }
    onFileChange(next, validateMovieFile(next));
  };

  const canUpload = file !== null && error === null && !saving;

  return (
    <div className="ready-overlay owner-upload-overlay" aria-live="polite">
      <div className="ready-overlay__backdrop" aria-hidden="true" />
      <div className="ready-overlay__content owner-upload-overlay__content fade-in">
        <Film className="ready-overlay__glyph" aria-hidden="true" />
        <p className="ready-overlay__eyebrow">Upload a movie</p>
        <h2 className="ready-overlay__title">Start the watch party</h2>
        <p className="ready-overlay__hint">
          Choose a video to upload. Processing starts automatically once the upload finishes.
        </p>

        <div
          className={`owner-upload-overlay__dropzone${isDragging ? ' owner-upload-overlay__dropzone--drag' : ''}${file !== null ? ' owner-upload-overlay__dropzone--selected' : ''}${error !== null ? ' owner-upload-overlay__dropzone--error' : ''}`}
          role="button"
          tabIndex={saving ? -1 : 0}
          onClick={() => {
            if (!saving) fileInputRef.current?.click();
          }}
          onKeyDown={(e) => {
            if (saving) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragEnter={(e) => {
            if (saving) return;
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(e) => {
            if (saving) return;
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            if (saving) return;
            e.preventDefault();
            setIsDragging(false);
          }}
          onDrop={(e) => {
            if (saving) return;
            e.preventDefault();
            setIsDragging(false);
            handleChange(e.dataTransfer.files[0] ?? null);
          }}
        >
          {file !== null ? (
            <div className="owner-upload-overlay__file">
              <p className="owner-upload-overlay__file-name">{file.name}</p>
              <p className="owner-upload-overlay__file-meta">
                {(file.size / 1024 / 1024).toFixed(1)} MB · Ready to upload
              </p>
              <div className="owner-upload-overlay__file-actions">
                <button
                  type="button"
                  className="owner-upload-overlay__ghost-btn"
                  disabled={saving}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (saving) return;
                    fileInputRef.current?.click();
                  }}
                >
                  Replace
                </button>
                <button
                  type="button"
                  className="owner-upload-overlay__ghost-btn owner-upload-overlay__ghost-btn--danger"
                  disabled={saving}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (saving) return;
                    onRemove();
                    if (fileInputRef.current !== null) {
                      fileInputRef.current.value = '';
                    }
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div className="owner-upload-overlay__empty">
              <Upload className="owner-upload-overlay__upload-icon" aria-hidden="true" />
              <p className="owner-upload-overlay__empty-title">Drop a video here or browse</p>
              <p className="owner-upload-overlay__empty-meta">
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
          disabled={saving}
          className="owner-upload-overlay__input"
          onChange={(e) => {
            handleChange(e.target.files?.[0] ?? null);
          }}
        />

        {error !== null && (
          <p className="owner-upload-overlay__error" role="alert">{error}</p>
        )}

        {file === null && !saving && (
          <p className="owner-upload-overlay__hint">
            Choose a video above to enable upload.
          </p>
        )}

        <button
          type="button"
          className={`ready-overlay__ready-btn owner-upload-overlay__upload-btn${
            canUpload
              ? ' ready-overlay__ready-btn--pulse'
              : ' owner-upload-overlay__upload-btn--idle'
          }`}
          disabled={saving}
          onClick={() => {
            if (saving) return;
            if (file === null) {
              fileInputRef.current?.click();
              return;
            }
            if (error !== null) return;
            onUpload();
          }}
        >
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Uploading…
            </>
          ) : file === null ? (
            <>
              <Upload className="size-4" aria-hidden="true" />
              Choose a video first
            </>
          ) : (
            <>
              <Upload className="size-4" aria-hidden="true" />
              Upload movie
            </>
          )}
        </button>

        {notice !== null && (
          <p className="owner-upload-overlay__notice">{notice}</p>
        )}
      </div>

      {uploadPercent !== null && (
        <>
          <p className="ready-overlay__pct owner-upload-overlay__pct">{String(uploadPercent)}%</p>
          <div className="ready-overlay__prog-rail" aria-hidden="true">
            <div
              className="ready-overlay__prog-fill"
              style={{ width: `${String(Math.max(2, uploadPercent))}%` }}
            />
          </div>
        </>
      )}
    </div>
  );
}
