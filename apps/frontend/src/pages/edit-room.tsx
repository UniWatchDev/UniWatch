import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { API_BASE_URL } from '@repo/consts/api';
import { createMovieContract, updateMovieContract } from '@repo/contracts/movies';
import { getRoomContract, updateRoomContract, deleteRoomContract } from '@repo/contracts/rooms';
import { getAuthMeContract } from '@repo/contracts/auth';
import type { MovieResponse } from '@repo/schemas/movies';
import type { RoomResponse } from '@repo/schemas/rooms';

import { formatFetchError } from '@/auth/auth-fetch-helpers';
import { attachMovieToRoom } from '@/movies/attach-room-movie';
import { formatMovieUploadAge } from '@/movies/format-movie-upload-age';
import { fetchOwnedMovies } from '@/movies/fetch-owned-movies';
import { resolveMovieForRoom } from '@/movies/prepare-movie-for-room';
import { uploadMovieViaStream, validateMovieFile } from '@/movies/upload-movie-file';
import { useVideoProgressSocket } from '@/movies/use-video-progress-socket';
import { EditRoomSection } from '@/pages/edit-room/edit-room-section';
import { EditRoomVideoUploadPanel } from '@/pages/edit-room/edit-room-video-upload-panel';
import { EditRow, SummaryItem } from '@/pages/edit-room/edit-row';

type EditableField =
  | 'name'
  | 'password'
  | 'movieSelection'
  | 'movieName'
  | 'movieDescription'
  | 'isPrivate';

type UploadStep = 'select' | 'uploading' | 'processing' | 'done';

interface DraftState {
  name: string;
  password: string;
  movieFile: File | null;
  movieName: string;
  movieDescription: string;
  isPrivate: boolean;
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </svg>
  );
}

async function fetchRoom(id: string): Promise<RoomResponse> {
  const path = getRoomContract.path.replace(':id', encodeURIComponent(id));
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: 'application/json' },
    credentials: 'include'
  });
  if (!res.ok) throw new Error(`HTTP ${String(res.status)}`);
  return getRoomContract.responseSchema.parse(await res.json());
}

async function fetchCurrentUserId(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE_URL}${getAuthMeContract.path}`, {
      headers: { Accept: 'application/json' },
      credentials: 'include'
    });
    if (!res.ok) return null;
    const me = getAuthMeContract.responseSchema.parse(await res.json());
    return me.userId;
  } catch {
    return null;
  }
}

export function EditRoom() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [room, setRoom] = useState<RoomResponse | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [movieFileError, setMovieFileError] = useState<string | null>(null);
  const [uploadStep, setUploadStep] = useState<UploadStep>('select');
  const [pendingVideoId, setPendingVideoId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [ownedMovies, setOwnedMovies] = useState<MovieResponse[]>([]);
  const [ownedMoviesLoading, setOwnedMoviesLoading] = useState(false);
  const [ownedMoviesError, setOwnedMoviesError] = useState<string | null>(null);
  const [selectedMovieId, setSelectedMovieId] = useState('');

  const [drafts, setDrafts] = useState<DraftState>({
    name: '',
    password: '',
    movieFile: null,
    movieName: '',
    movieDescription: '',
    isPrivate: false
  });
  const [editing, setEditing] = useState<Record<EditableField, boolean>>({
    name: false,
    password: false,
    movieSelection: false,
    movieName: false,
    movieDescription: false,
    isPrivate: false
  });

  const isOwner = currentUserId !== null && currentUserId === room?.creator;
  const { percent: processingPercent, status: processingStatus } = useVideoProgressSocket(
    id,
    pendingVideoId,
    uploadStep === 'processing'
  );

  useEffect(() => {
    if (uploadStep !== 'processing') return;
    if (processingStatus === 'ready') {
      setUploadStep('done');
      setNoticeMessage('Video is ready and will switch in the room automatically.');
      setPendingVideoId(null);
    }
    if (processingStatus === 'failed') {
      setUploadStep('select');
      setApiError('Video processing failed. Try uploading again.');
      setPendingVideoId(null);
    }
  }, [uploadStep, processingStatus]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    Promise.all([fetchRoom(id), fetchCurrentUserId()])
      .then(([loadedRoom, userId]) => {
        if (cancelled) return;
        setRoom(loadedRoom);
        setCurrentUserId(userId);
        setDrafts({
          name: loadedRoom.name,
          password: '',
          movieFile: null,
          movieName: loadedRoom.movie_name ?? '',
          movieDescription: loadedRoom.movie_description ?? '',
          isPrivate: loadedRoom.room_type === 'private'
        });
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load room');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!loading && room && currentUserId !== null && currentUserId !== room.creator) {
      void navigate(`/room/${room.id}`, { replace: true });
    }
  }, [loading, room, currentUserId, navigate]);

  useEffect(() => {
    if (!isOwner) {
      setOwnedMovies([]);
      setOwnedMoviesError(null);
      setOwnedMoviesLoading(false);
      return;
    }

    let cancelled = false;
    setOwnedMoviesLoading(true);
    setOwnedMoviesError(null);
    void fetchOwnedMovies()
      .then((movies) => {
        if (!cancelled) setOwnedMovies(movies);
      })
      .catch((err: unknown) => {
        if (!cancelled) setOwnedMoviesError(formatFetchError(err));
      })
      .finally(() => {
        if (!cancelled) setOwnedMoviesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOwner]);

  useEffect(() => {
    if (!isOwner) return;
    const readyMovies = ownedMovies.filter((movie) => movie.has_file && movie.upload_status === 'ready');
    const fallbackMovieId = room.movie ?? readyMovies[0]?.id ?? '';
    if (selectedMovieId.length === 0 || !readyMovies.some((movie) => movie.id === selectedMovieId)) {
      setSelectedMovieId(fallbackMovieId);
    }
  }, [isOwner, ownedMovies, room, selectedMovieId]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-[var(--text-muted)]">Loading…</p>
      </div>
    );
  }

  if (loadError || room === null) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
        <p className="text-lg text-[var(--text-secondary)]">{loadError ?? 'Room not found.'}</p>
        <button type="button" className="btn-primary" onClick={() => { void navigate('/rooms'); }}>
          Back to Lobby
        </button>
      </div>
    );
  }

  const readyOwnedMovies = ownedMovies.filter((movie) => movie.has_file && movie.upload_status === 'ready');
  const selectedOwnedMovieAge = formatMovieUploadAge(
    ownedMovies.find((movie) => movie.id === selectedMovieId)?.file_uploaded_at
  );

  const startEdit = (field: EditableField) => {
    setEditing((prev) => ({ ...prev, [field]: true }));
    setApiError(null);
  };

  const cancelEdit = (field: EditableField) => {
    setEditing((prev) => ({ ...prev, [field]: false }));
    setDrafts((prev) => ({
      ...prev,
      name: room.name,
      movieName: room.movie_name ?? '',
      movieDescription: room.movie_description ?? '',
      isPrivate: room.room_type === 'private',
      password: ''
    }));
    if (field === 'movieSelection') {
      setSelectedMovieId(room.movie ?? readyOwnedMovies[0]?.id ?? '');
    }
  };

  const handleVideoUpload = async () => {
    if (!id || drafts.movieFile === null) {
      setMovieFileError('Choose a video file before uploading.');
      return;
    }
    const fileError = validateMovieFile(drafts.movieFile);
    if (fileError) {
      setMovieFileError(fileError);
      return;
    }

    setSaving(true);
    setApiError(null);
    setNoticeMessage(null);
    setUploadPercent(0);
    setUploadStep('uploading');

    try {
      const movieBody = createMovieContract.bodySchema.parse({
        name: drafts.movieName.trim() || drafts.movieFile.name.replace(/\.[^.]+$/, ''),
        language: 'english',
        ...(drafts.movieDescription.trim() && { description: drafts.movieDescription.trim() })
      });
      const movie = await resolveMovieForRoom(movieBody);
      await uploadMovieViaStream(movie.id, drafts.movieFile, id, {
        onProgress: (progress) => {
          setUploadPercent(progress.percent);
        }
      });
      setDrafts((prev) => ({ ...prev, movieFile: null }));
      setUploadPercent(null);
      setPendingVideoId(movie.id);
      setUploadStep('processing');
    } catch (err: unknown) {
      setUploadStep('select');
      setApiError(formatFetchError(err));
    } finally {
      setSaving(false);
      setUploadPercent(null);
    }
  };

  const saveField = async (field: EditableField) => {
    if (!id) return;
    setSaving(true);
    setApiError(null);
    setNoticeMessage(null);
    try {
      const path = updateRoomContract.path.replace(':id', encodeURIComponent(id));
      let patchBody: Record<string, unknown> = {};

      if (field === 'name') patchBody = { name: drafts.name };
      else if (field === 'isPrivate') {
        if (drafts.isPrivate && room.password == null && !drafts.password.trim()) {
          setApiError('A password is required before making a room private.');
          setSaving(false);
          return;
        }
        patchBody = {
          room_type: drafts.isPrivate ? 'private' : 'public',
          ...(drafts.isPrivate && drafts.password.trim() ? { password: drafts.password.trim() } : {})
        };
      } else if (field === 'password') {
        if (!drafts.password.trim()) {
          setApiError('Password cannot be empty for a private room.');
          setSaving(false);
          return;
        }
        patchBody = { password: drafts.password };
      } else if (field === 'movieSelection') {
        if (!selectedMovieId) {
          setApiError('Choose a movie before saving.');
          setSaving(false);
          return;
        }
        const selectedMovie = ownedMovies.find((movie) => movie.id === selectedMovieId);
        if (!selectedMovie) {
          setApiError('Choose one of your owned movies.');
          setSaving(false);
          return;
        }
        const updated = await attachMovieToRoom(id, selectedMovie);
        setRoom(updated);
        setDrafts((prev) => ({
          ...prev,
          movieName: updated.movie_name ?? selectedMovie.name,
          movieDescription: updated.movie_description ?? selectedMovie.description ?? ''
        }));
        setEditing((prev) => ({ ...prev, movieSelection: false }));
        setSaving(false);
        return;
      } else if (field === 'movieName') {
        patchBody = drafts.movieName.trim() ? { movie_name: drafts.movieName.trim() } : {};
      } else {
        patchBody = drafts.movieDescription.trim()
          ? { movie_description: drafts.movieDescription.trim() }
          : {};
      }

      const body = updateRoomContract.bodySchema.parse(patchBody);
      const res = await fetch(`${API_BASE_URL}${path}`, {
        method: updateRoomContract.method,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${String(res.status)}: ${text}`);
      }
      const updated = updateRoomContract.responseSchema.parse(await res.json());
      setRoom(updated);

      if ((field === 'movieName' || field === 'movieDescription') && updated.movie) {
        const moviePath = updateMovieContract.path.replace(':id', encodeURIComponent(updated.movie));
        const moviePatch = updateMovieContract.bodySchema.parse(
          field === 'movieName'
            ? { name: drafts.movieName.trim() }
            : { description: drafts.movieDescription.trim() || undefined }
        );
        await fetch(`${API_BASE_URL}${moviePath}`, {
          method: updateMovieContract.method,
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          credentials: 'include',
          body: JSON.stringify(moviePatch)
        });
      }

      setEditing((prev) => ({ ...prev, [field]: false }));
    } catch (err: unknown) {
      setApiError(formatFetchError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!id) return;
    setDeleting(true);
    setApiError(null);
    try {
      const path = deleteRoomContract.path.replace(':id', encodeURIComponent(id));
      const res = await fetch(`${API_BASE_URL}${path}`, {
        method: deleteRoomContract.method,
        headers: { Accept: 'application/json' },
        credentials: 'include'
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${String(res.status)}: ${text}`);
      }
      void navigate('/rooms');
    } catch (err: unknown) {
      setApiError(formatFetchError(err));
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[var(--bg-primary)] px-4 py-12">
      <div className="card fade-up mx-auto w-full max-w-3xl p-8">
        <div className="mb-7">
          <button
            type="button"
            onClick={() => { void navigate(`/room/${room.id}`); }}
            className="mb-5 inline-flex items-center gap-1.5 border-none bg-transparent p-0 text-[13px] text-[var(--text-muted)]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Back to Room
          </button>
          <h1 className="display m-0 text-2xl font-extrabold text-[var(--text-primary)]">Edit Room</h1>
          <p className="mt-1.5 text-sm text-[var(--text-muted)]">
            Update room details, switch movies, or replace the video file.
          </p>
        </div>

        {apiError && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[13px] text-red-400">
            {apiError}
          </div>
        )}

        {noticeMessage && (
          <div className="mb-4 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent-dim)] px-3.5 py-2.5 text-[13px] text-[var(--text-secondary)]">
            {noticeMessage}
          </div>
        )}

        <div className="mb-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4">
          <p className="m-0 mb-2 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">
            Room summary
          </p>
          <div className="grid grid-cols-2 gap-2">
            <SummaryItem label="Room title" value={room.name} />
            <SummaryItem label="Movie title" value={room.movie_name ?? 'No movie attached'} />
            <SummaryItem label="Video file" value={room.movie ? 'Video attached' : 'No video yet'} />
            <SummaryItem label="Visibility" value={room.room_type === 'private' ? 'Private' : 'Public'} />
          </div>
        </div>

        <div className="grid gap-5">
          <EditRoomSection title="Room details" description="Update the room title, visibility, and password.">
            <EditRow
              label="Room title"
              isEditing={editing.name}
              displayValue={room.name}
              canEdit={isOwner}
              saving={saving}
              onEdit={() => { startEdit('name'); }}
              onSave={() => { void saveField('name'); }}
              onCancel={() => { cancelEdit('name'); }}
            >
              <input
                className="input"
                type="text"
                value={drafts.name}
                onChange={(e) => { setDrafts((prev) => ({ ...prev, name: e.target.value })); }}
                maxLength={60}
                autoFocus
              />
            </EditRow>

            <EditRow
              label="Visibility"
              isEditing={editing.isPrivate}
              displayValue={room.room_type === 'private' ? 'Private' : 'Public'}
              canEdit={isOwner}
              saving={saving}
              onEdit={() => { startEdit('isPrivate'); }}
              onSave={() => { void saveField('isPrivate'); }}
              onCancel={() => { cancelEdit('isPrivate'); }}
            >
              <div className="grid gap-2.5">
                <div className="flex gap-2">
                  {(['public', 'private'] as const).map((value) => {
                    const active = value === 'private' ? drafts.isPrivate : !drafts.isPrivate;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => { setDrafts((prev) => ({ ...prev, isPrivate: value === 'private' })); }}
                        className="flex-1 rounded-lg border px-3 py-2.5 text-[13px] font-semibold transition-colors"
                        style={{
                          borderColor: active ? 'var(--accent)' : 'var(--border-medium)',
                          background: active ? 'var(--accent-dim)' : 'var(--bg-input)',
                          color: active ? 'var(--text-primary)' : 'var(--text-muted)'
                        }}
                      >
                        {value === 'public' ? 'Public' : 'Private'}
                      </button>
                    );
                  })}
                </div>
                {drafts.isPrivate && room.password == null && (
                  <input
                    className="input"
                    type="password"
                    placeholder="Set a password (required for private rooms)"
                    value={drafts.password}
                    onChange={(e) => { setDrafts((prev) => ({ ...prev, password: e.target.value })); }}
                    maxLength={64}
                    autoComplete="new-password"
                  />
                )}
              </div>
            </EditRow>

            {room.room_type === 'private' && (
              <EditRow
                label="Password"
                isEditing={editing.password}
                displayValue={room.password != null ? 'Password set' : 'No password'}
                canEdit={isOwner}
                saving={saving}
                onEdit={() => { startEdit('password'); }}
                onSave={() => { void saveField('password'); }}
                onCancel={() => { cancelEdit('password'); }}
              >
                <input
                  className="input"
                  type="password"
                  placeholder="Enter a new password"
                  value={drafts.password}
                  onChange={(e) => { setDrafts((prev) => ({ ...prev, password: e.target.value })); }}
                  maxLength={64}
                  autoComplete="new-password"
                  autoFocus
                />
              </EditRow>
            )}
          </EditRoomSection>

          <EditRoomSection
            title="Movie management"
            description="Switch to another ready video or upload a replacement file."
          >
            <EditRow
              label="Current movie"
              isEditing={editing.movieSelection}
              displayValue={room.movie_name ?? 'No movie attached'}
              canEdit={isOwner}
              saving={saving || ownedMoviesLoading}
              onEdit={() => { startEdit('movieSelection'); }}
              onSave={() => { void saveField('movieSelection'); }}
              onCancel={() => { cancelEdit('movieSelection'); }}
            >
              <div className="grid gap-2.5">
                {ownedMoviesError && <p className="m-0 text-xs text-red-400">{ownedMoviesError}</p>}
                {ownedMoviesLoading ? (
                  <p className="m-0 text-xs text-[var(--text-muted)]">Loading your videos…</p>
                ) : readyOwnedMovies.length > 0 ? (
                  <select
                    className="input"
                    value={selectedMovieId}
                    onChange={(e) => { setSelectedMovieId(e.target.value); }}
                    disabled={saving}
                  >
                    <option value="">Choose one of your videos</option>
                    {readyOwnedMovies.map((movie) => (
                      <option key={movie.id} value={movie.id}>
                        {movie.name}
                        {movie.file_uploaded_at
                          ? ` · ${formatMovieUploadAge(movie.file_uploaded_at) ?? 'uploaded recently'}`
                          : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="m-0 text-xs text-[var(--text-muted)]">You do not have any ready videos yet.</p>
                )}
                {selectedOwnedMovieAge && (
                  <p className="m-0 text-xs text-[var(--text-muted)]">{selectedOwnedMovieAge}</p>
                )}
              </div>
            </EditRow>

            {isOwner && (
              <EditRoomVideoUploadPanel
                roomHasMovie={room.movie != null}
                currentMovieName={room.movie_name}
                file={drafts.movieFile}
                fileError={movieFileError}
                saving={saving}
                uploadPercent={uploadPercent}
                processingPercent={processingPercent}
                uploadStep={uploadStep}
                onFileChange={(file, validationError) => {
                  setDrafts((prev) => ({
                    ...prev,
                    movieFile: file,
                    ...(file && !prev.movieName ? { movieName: file.name.replace(/\.[^.]+$/, '') } : {})
                  }));
                  setMovieFileError(validationError);
                }}
                onRemoveFile={() => {
                  setDrafts((prev) => ({ ...prev, movieFile: null }));
                  setMovieFileError(null);
                }}
                onUpload={() => { void handleVideoUpload(); }}
                onClearSelection={() => {
                  setDrafts((prev) => ({ ...prev, movieFile: null }));
                  setMovieFileError(null);
                }}
              />
            )}

            <EditRow
              label="Movie title"
              isEditing={editing.movieName}
              displayValue={room.movie_name ?? 'No movie set'}
              canEdit={isOwner}
              saving={saving}
              onEdit={() => { startEdit('movieName'); }}
              onSave={() => { void saveField('movieName'); }}
              onCancel={() => { cancelEdit('movieName'); }}
            >
              <input
                className="input"
                type="text"
                value={drafts.movieName}
                onChange={(e) => { setDrafts((prev) => ({ ...prev, movieName: e.target.value })); }}
                maxLength={120}
                autoFocus
              />
            </EditRow>

            <EditRow
              label="Movie description"
              isEditing={editing.movieDescription}
              displayValue={room.movie_description ?? 'No description'}
              canEdit={isOwner}
              saving={saving}
              onEdit={() => { startEdit('movieDescription'); }}
              onSave={() => { void saveField('movieDescription'); }}
              onCancel={() => { cancelEdit('movieDescription'); }}
            >
              <textarea
                className="input"
                value={drafts.movieDescription}
                onChange={(e) => { setDrafts((prev) => ({ ...prev, movieDescription: e.target.value })); }}
                maxLength={400}
                rows={3}
                autoFocus
              />
            </EditRow>
          </EditRoomSection>

          {isOwner && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
              <h4 className="m-0 mb-1.5 text-sm font-bold text-red-400">Danger zone</h4>
              <p className="mb-3.5 text-[13px] text-[var(--text-muted)]">
                Permanently delete this room and remove all participants. This cannot be undone.
              </p>
              {showDeleteConfirm ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-danger flex flex-1 items-center justify-center gap-1.5 opacity-100 disabled:opacity-70"
                    onClick={() => { void handleDeleteConfirmed(); }}
                    disabled={deleting}
                  >
                    <TrashIcon />
                    {deleting ? 'Deleting…' : 'Yes, delete room'}
                  </button>
                  <button
                    type="button"
                    className="btn-ghost flex-1"
                    onClick={() => { setShowDeleteConfirm(false); }}
                    disabled={deleting}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button type="button" className="btn-danger inline-flex items-center gap-1.5" onClick={() => { setShowDeleteConfirm(true); }}>
                  <TrashIcon />
                  Delete Room
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
