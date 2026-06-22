import { CheckCircle2, Clapperboard, Loader2, Upload } from 'lucide-react';

import { MovieUploadField } from '@/movies/movie-upload-field';
import { MovieUploadProgress } from '@/movies/movie-upload-progress';
import { MOVIE_ALLOWED_FORMATS_LABEL } from '@repo/consts/movies';

type UploadStep = 'select' | 'uploading' | 'processing' | 'done';

function stepIndex(step: UploadStep): number {
  switch (step) {
    case 'select':
      return 0;
    case 'uploading':
      return 1;
    case 'processing':
      return 2;
    case 'done':
      return 3;
  }
}

const STEPS = ['Select file', 'Upload', 'Process', 'Ready'] as const;

export function EditRoomVideoUploadPanel({
  roomHasMovie,
  currentMovieName,
  file,
  fileError,
  saving,
  uploadPercent,
  processingPercent,
  uploadStep,
  onFileChange,
  onRemoveFile,
  onUpload,
  onClearSelection
}: {
  roomHasMovie: boolean;
  currentMovieName: string | null | undefined;
  file: File | null;
  fileError: string | null;
  saving: boolean;
  uploadPercent: number | null;
  processingPercent: number | null;
  uploadStep: UploadStep;
  onFileChange: (file: File | null, validationError: string | null) => void;
  onRemoveFile: () => void;
  onUpload: () => void;
  onClearSelection: () => void;
}) {
  const activeStep = stepIndex(uploadStep);

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-4 gap-2">
        {STEPS.map((label, index) => {
          const isActive = index === activeStep;
          const isComplete = index < activeStep;
          return (
            <div key={label} className="grid gap-1.5 text-center">
              <div
                className="mx-auto flex size-8 items-center justify-center rounded-full border text-xs font-bold"
                style={{
                  borderColor: isComplete || isActive ? 'var(--accent)' : 'var(--border-medium)',
                  background: isComplete ? 'var(--accent)' : isActive ? 'var(--accent-dim)' : 'var(--bg-input)',
                  color: isComplete ? 'var(--primary-foreground, #fff)' : 'var(--text-secondary)'
                }}
              >
                {isComplete ? <CheckCircle2 size={16} /> : index + 1}
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                {label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4">
        <div className="mb-3 flex items-start gap-3">
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[var(--border-medium)] bg-[var(--accent-dim)] text-[var(--accent)]"
            aria-hidden="true"
          >
            {uploadStep === 'processing' ? (
              <Loader2 size={18} className="animate-spin" />
            ) : uploadStep === 'done' ? (
              <CheckCircle2 size={18} />
            ) : uploadStep === 'uploading' ? (
              <Upload size={18} />
            ) : (
              <Clapperboard size={18} />
            )}
          </div>
          <div className="min-w-0">
            <p className="m-0 text-sm font-semibold text-[var(--text-primary)]">
              {roomHasMovie ? 'Replace the room video' : 'Upload a video for this room'}
            </p>
            <p className="mt-1 mb-0 text-xs leading-relaxed text-[var(--text-muted)]">
              {roomHasMovie
                ? `Current movie: ${currentMovieName ?? 'Untitled'}. The room keeps playing it until the new file is ready.`
                : 'Choose a file, upload it directly to storage, then wait while it is prepared for streaming.'}
            </p>
          </div>
        </div>

        {uploadStep === 'select' && (
          <>
            <MovieUploadField
              label="Video file"
              file={file}
              error={fileError ?? undefined}
              disabled={saving}
              onFileChange={onFileChange}
              onRemove={onRemoveFile}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary min-w-[180px] flex-1"
                disabled={saving || file === null}
                onClick={onUpload}
              >
                {roomHasMovie ? 'Replace video file' : 'Upload video file'}
              </button>
              {file !== null && (
                <button type="button" className="btn-ghost min-w-[120px]" onClick={onClearSelection}>
                  Clear file
                </button>
              )}
            </div>
            <p className="mt-3 mb-0 text-xs text-[var(--text-muted)]">
              Supported formats: {MOVIE_ALLOWED_FORMATS_LABEL}. Maximum size: 1 GB.
            </p>
          </>
        )}

        {uploadStep === 'uploading' && uploadPercent !== null && (
          <MovieUploadProgress percent={uploadPercent} label="Uploading video to storage" />
        )}

        {uploadStep === 'processing' && (
          <MovieUploadProgress
            percent={processingPercent ?? 0}
            indeterminate={processingPercent === null}
            label={
              processingPercent !== null
                ? `Preparing video for playback (${String(processingPercent)}%)`
                : 'Preparing video for playback'
            }
          />
        )}

        {uploadStep === 'done' && (
          <p className="m-0 text-sm text-[var(--status-ready-text)]">
            Video is ready. It will switch in the room automatically.
          </p>
        )}
      </div>
    </div>
  );
}
