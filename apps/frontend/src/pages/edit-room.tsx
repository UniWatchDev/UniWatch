import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { API_BASE_URL } from '@repo/consts/api';
import { MOVIE_ALLOWED_FORMATS_LABEL } from '@repo/consts/movies';
import { createMovieContract, updateMovieContract } from '@repo/contracts/movies';
import { getRoomContract, updateRoomContract, deleteRoomContract } from '@repo/contracts/rooms';
import { getAuthMeContract } from '@repo/contracts/auth';
import type { RoomResponse } from '@repo/schemas/rooms';

import { MovieUploadField } from '@/movies/movie-upload-field';
import { MovieUploadProgress } from '@/movies/movie-upload-progress';
import { MovieLibraryGrid } from '@/movies/movie-library-grid';
import { MovieLibrarySummary } from '@/movies/movie-library-summary';
import { attachMovieToRoom } from '@/movies/attach-room-movie';
import { prepareMovieForRoom } from '@/movies/prepare-movie-for-room';
import { isMovieLibraryReady } from '@/movies/selectable-owned-movies';
import { useCatalogMovies } from '@/movies/use-catalog-movies';
import { validateMovieFile } from '@/movies/upload-movie-file';
import { formatFetchError } from '@/auth/auth-fetch-helpers';
import { useRoomSession } from '@/rooms/room-session-context';
import { RoomFormAlert } from '@/rooms/room-form-alert';
import { RoomFormBackLink } from '@/rooms/room-form-back-link';
import { RoomFormSection } from '@/rooms/room-form-section';
import { RoomFormShell } from '@/rooms/room-form-shell';
import { RoomVisibilityToggle } from '@/rooms/room-visibility-toggle';

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function isRoomLoaded(room: RoomResponse | null): room is RoomResponse {
  return room !== null;
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
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

type EditableField = 'name' | 'password' | 'movieSelection' | 'movieFile' | 'movieName' | 'movieDescription' | 'isPrivate';

interface DraftState {
  name: string;
  password: string;
  movieFile: File | null;
  movieName: string;
  movieDescription: string;
  isPrivate: boolean;
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
  const { syncSessionRoom } = useRoomSession();

  const [room, setRoom] = useState<RoomResponse | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [movieFileError, setMovieFileError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedMovieId, setSelectedMovieId] = useState('');

  const [drafts, setDrafts] = useState<DraftState>({
    name: '',
    password: '',
    movieFile: null,
    movieName: '',
    movieDescription: '',
    isPrivate: false,
  });
  const [editing, setEditing] = useState<Record<EditableField, boolean>>({
    name: false,
    password: false,
    movieSelection: false,
    movieFile: false,
    movieName: false,
    movieDescription: false,
    isPrivate: false,
  });
  const isOwner = currentUserId !== null && currentUserId === room?.creator;
  const catalogMoviesState = useCatalogMovies(isOwner);
  const { movies: catalogMovies, loading: catalogMoviesLoading, error: catalogMoviesError, reload: reloadCatalogMovies } = catalogMoviesState;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    Promise.all([fetchRoom(id), fetchCurrentUserId()])
      .then(([r, userId]) => {
        if (cancelled) return;
        setRoom(r);
        setCurrentUserId(userId);
        setDrafts({
          name: r.name,
          password: '',
          movieFile: null,
          movieName: r.movie_name ?? '',
          movieDescription: r.movie_description ?? '',
          isPrivate: r.room_type === 'private',
        });
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load room');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (room !== null) {
      syncSessionRoom(room);
    }
  }, [room, syncSessionRoom]);

  useEffect(() => {
    if (!loading && room && currentUserId !== null && currentUserId !== room.creator) {
      void navigate(`/room/${room.id}`, { replace: true });
    }
  }, [loading, room, currentUserId, navigate]);

  useEffect(() => {
    if (!isOwner || !isRoomLoaded(room)) return;
    const readyMovies = catalogMovies.filter((movie) => isMovieLibraryReady(movie));
    const fallbackMovieId = room.movie ?? readyMovies[0]?.id ?? '';
    if (selectedMovieId.length === 0 || !readyMovies.some((movie) => movie.id === selectedMovieId)) {
      setSelectedMovieId(fallbackMovieId);
    }
  }, [isOwner, catalogMovies, room, selectedMovieId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
      </div>
    );
  }

  if (loadError || !room) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', gap: 16 }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 18 }}>{loadError ?? 'Room not found.'}</p>
        <button className="btn-primary" onClick={() => { void navigate('/rooms'); }}>Back to Lobby</button>
      </div>
    );
  }

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
      password: '',
    }));
    if (field === 'movieSelection') {
      const readyMovies = catalogMovies.filter((movie) => isMovieLibraryReady(movie));
      setSelectedMovieId(room.movie ?? readyMovies[0]?.id ?? '');
    }
  };

  const saveField = async (field: EditableField) => {
    if (!id) return;
    setSaving(true);
    setApiError(null);
    setUploadPercent(null);
    try {
      if (field === 'movieFile') {
        if (!drafts.movieFile) {
          setApiError(`Choose a ${MOVIE_ALLOWED_FORMATS_LABEL} file before saving.`);
          setSaving(false);
          return;
        }
        const fileError = validateMovieFile(drafts.movieFile);
        if (fileError) {
          setApiError(fileError);
          setSaving(false);
          return;
        }
        const movieBody = createMovieContract.bodySchema.parse({
          name: drafts.movieName.trim() || drafts.movieFile.name.replace(/\.[^.]+$/, ''),
          language: 'english',
          ...(drafts.movieDescription.trim() && { description: drafts.movieDescription.trim() }),
        });
        setUploadPercent(0);
        const movie = await prepareMovieForRoom(movieBody, drafts.movieFile, {
          onProgress: (progress) => { setUploadPercent(progress.percent); },
        });
        const path = updateRoomContract.path.replace(':id', encodeURIComponent(id));
        const patchBody = updateRoomContract.bodySchema.parse({
          movie: movie.id,
          movie_name: movie.name,
          ...(movie.description != null
            ? { movie_description: movie.description }
            : drafts.movieDescription.trim()
              ? { movie_description: drafts.movieDescription.trim() }
              : {}),
        });
        const res = await fetch(`${API_BASE_URL}${path}`, {
          method: updateRoomContract.method,
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          credentials: 'include',
          body: JSON.stringify(patchBody),
        });
        if (!res.ok) {
          throw new Error(`HTTP ${String(res.status)}: ${await res.text()}`);
        }
        const updated = updateRoomContract.responseSchema.parse(await res.json());
        setRoom(updated);
        setDrafts((prev) => ({
          ...prev,
          movieFile: null,
          movieName: updated.movie_name ?? movie.name,
          movieDescription: updated.movie_description ?? '',
        }));
        setEditing((prev) => ({ ...prev, movieFile: false }));
        setUploadPercent(null);
        setSaving(false);
        return;
      }

      const path = updateRoomContract.path.replace(':id', encodeURIComponent(id));
      let patchBody: Record<string, unknown> = {};
      if (field === 'name') patchBody = { name: drafts.name };
      else if (field === 'isPrivate') {
        if (drafts.isPrivate && !room.password && !drafts.password.trim()) {
          setApiError('A password is required before making a room private.');
          setSaving(false);
          return;
        }
        patchBody = {
          room_type: drafts.isPrivate ? 'private' : 'public',
          ...(drafts.isPrivate && drafts.password.trim() ? { password: drafts.password.trim() } : {}),
        };
      }
      else if (field === 'password') {
        if (!drafts.password.trim()) {
          setApiError('Password cannot be empty for a private room.');
          setSaving(false);
          return;
        }
        patchBody = { password: drafts.password };
      }
      else if (field === 'movieSelection') {
        if (!selectedMovieId) {
          setApiError('Choose a movie before saving.');
          setSaving(false);
          return;
        }
        const selectedMovie = catalogMovies.find((movie) => movie.id === selectedMovieId);
        if (!selectedMovie) {
          setApiError('Choose a title from the catalog.');
          setSaving(false);
          return;
        }
        const updated = await attachMovieToRoom(id, selectedMovie);
        setRoom(updated);
        setDrafts((prev) => ({
          ...prev,
          movieName: updated.movie_name ?? selectedMovie.name,
          movieDescription: updated.movie_description ?? selectedMovie.description ?? '',
        }));
        setEditing((prev) => ({ ...prev, movieSelection: false }));
        setSaving(false);
        return;
      }
      else if (field === 'movieName') patchBody = drafts.movieName.trim() ? { movie_name: drafts.movieName.trim() } : {};
      else patchBody = drafts.movieDescription.trim() ? { movie_description: drafts.movieDescription.trim() } : {};

      const body = updateRoomContract.bodySchema.parse(patchBody);
      const res = await fetch(`${API_BASE_URL}${path}`, {
        method: updateRoomContract.method,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
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
          body: JSON.stringify(moviePatch),
        });
      }

      setEditing((prev) => ({ ...prev, [field]: false }));
    } catch (err: unknown) {
      setApiError(formatFetchError(err));
    } finally {
      setSaving(false);
      setUploadPercent(null);
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
        credentials: 'include',
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

  const movieFileDisplay = drafts.movieFile
    ? drafts.movieFile.name
    : room.movie
      ? 'Ready to replace the current file'
      : 'No video file uploaded yet';
  const attachedMovie = catalogMovies.find((movie) => movie.id === room.movie) ?? null;
  const roomTitleSummary = room.name;
  const movieTitleSummary = room.movie_name ?? 'No movie attached';
  const videoStateSummary = room.movie ? 'Video file attached' : 'No video file uploaded yet';

  return (
    <RoomFormShell
      backLink={(
        <RoomFormBackLink onClick={() => { void navigate(`/room/${room.id}`); }}>
          Back to Room
        </RoomFormBackLink>
      )}
      title="Edit Room"
      description={
        isOwner
          ? 'Update room details, switch catalog titles, or upload a replacement file.'
          : 'You can view this room\'s settings, but only the owner can edit them.'
      }
    >
      {apiError != null && <RoomFormAlert message={apiError} />}

      <div className="room-form-card card fade-up">
        <div className="room-settings-summary">
          <p className="room-settings-summary__label">Room summary</p>
          <div className="room-settings-summary__grid">
            <SummaryItem label="Room title" value={roomTitleSummary} />
            <SummaryItem label="Movie title" value={movieTitleSummary} />
            <SummaryItem label="Video file" value={videoStateSummary} />
            <SummaryItem label="Visibility" value={room.room_type === 'private' ? 'Private' : 'Public'} />
          </div>
        </div>

        <div className="room-settings-sections">
          <RoomFormSection
            title="Room details"
            description="Update the room title, visibility, and password."
          >
            <div className="room-settings-rows">
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
                  onChange={(e) => { setDrafts((p) => ({ ...p, name: e.target.value })); }}
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
                <div className="room-form-fields">
                  <RoomVisibilityToggle
                    isPrivate={drafts.isPrivate}
                    onChange={(isPrivate) => { setDrafts((p) => ({ ...p, isPrivate })); }}
                    disabled={saving}
                  />
                  {drafts.isPrivate && !room.password && (
                    <input
                      className="input"
                      type="password"
                      placeholder="Set a password (required for private rooms)"
                      value={drafts.password}
                      onChange={(e) => { setDrafts((p) => ({ ...p, password: e.target.value })); }}
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
                    onChange={(e) => { setDrafts((p) => ({ ...p, password: e.target.value })); }}
                    maxLength={64}
                    autoComplete="new-password"
                    autoFocus
                  />
                </EditRow>
              )}
            </div>
          </RoomFormSection>

          <RoomFormSection
            title="Video"
            description="Pick a catalog title, upload a replacement, or edit metadata."
          >
            <div className="room-settings-rows">
              <EditRow
                label="Current movie"
                isEditing={editing.movieSelection}
                displayValue={room.movie_name ?? 'No movie attached'}
                displayContent={
                  <MovieLibrarySummary
                    movie={attachedMovie}
                    fallbackTitle={room.movie_name ?? 'No movie attached'}
                  />
                }
                canEdit={isOwner}
                saving={saving || catalogMoviesLoading}
                onEdit={() => { startEdit('movieSelection'); }}
                onSave={() => { void saveField('movieSelection'); }}
                onCancel={() => { cancelEdit('movieSelection'); }}
              >
                <div className="room-form-fields">
                  <p className="room-form-field__hint">
                    Pick a ready title from the shared catalog. Playback starts immediately — no re-upload.
                  </p>
                  <MovieLibraryGrid
                    movies={catalogMovies}
                    loading={catalogMoviesLoading}
                    error={catalogMoviesError}
                    selectedMovieId={selectedMovieId || null}
                    onSelectedMovieIdChange={(movieId) => { setSelectedMovieId(movieId ?? ''); }}
                    onRetry={reloadCatalogMovies}
                    disabled={saving}
                    emptyHint="No catalog titles yet. Upload a new file below or ask an admin to publish titles."
                  />
                </div>
              </EditRow>

              <EditRow
                label="Replace video file"
                isEditing={editing.movieFile}
                displayValue={movieFileDisplay}
                canEdit={isOwner}
                saving={saving}
                onEdit={() => { startEdit('movieFile'); }}
                onSave={() => { void saveField('movieFile'); }}
                onCancel={() => {
                  setEditing((p) => ({ ...p, movieFile: false }));
                  setDrafts((p) => ({ ...p, movieFile: null }));
                  setMovieFileError(null);
                }}
              >
                <div className="room-form-fields">
                  <p className="room-form-field__hint">
                    {room.movie
                      ? `Current movie: ${room.movie_name ?? 'Untitled movie'}. Upload starts only after you press the button below.`
                      : 'No movie is attached yet. Uploading a file will attach it to this room.'}
                  </p>

                  <MovieUploadField
                    label="Video file"
                    file={drafts.movieFile}
                    error={movieFileError ?? undefined}
                    disabled={saving}
                    onFileChange={(file, validationError) => {
                      setDrafts((prev) => ({
                        ...prev,
                        movieFile: file,
                        ...(file && !prev.movieName ? { movieName: file.name.replace(/\.[^.]+$/, '') } : {}),
                      }));
                      setMovieFileError(validationError);
                    }}
                    onRemove={() => {
                      setDrafts((prev) => ({ ...prev, movieFile: null }));
                      setMovieFileError(null);
                    }}
                  />

                  <div className="room-form-inline-actions">
                    <button
                      type="button"
                      className="btn-primary room-form-inline-actions__primary"
                      disabled={saving || drafts.movieFile === null}
                      onClick={() => { void saveField('movieFile'); }}
                    >
                      {saving
                        ? uploadPercent !== null
                          ? `Uploading… ${String(uploadPercent)}%`
                          : 'Uploading…'
                        : room.movie
                          ? 'Replace video file'
                          : 'Upload video file'}
                    </button>
                    <button
                      type="button"
                      className="btn-ghost"
                      disabled={saving || drafts.movieFile === null}
                      onClick={() => {
                        setDrafts((prev) => ({ ...prev, movieFile: null }));
                        setMovieFileError(null);
                      }}
                    >
                      Clear file
                    </button>
                  </div>

                  <p className="room-form-field__hint">
                    {drafts.movieFile
                      ? 'The selected file will replace the current room movie after upload finishes.'
                      : `Supported formats: ${MOVIE_ALLOWED_FORMATS_LABEL}. Maximum size: 1 GB.`}
                  </p>

                  {uploadPercent !== null && (
                    <MovieUploadProgress percent={uploadPercent} label="Uploading video to this room" />
                  )}
                </div>
              </EditRow>

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
                  onChange={(e) => { setDrafts((p) => ({ ...p, movieName: e.target.value })); }}
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
                  onChange={(e) => { setDrafts((p) => ({ ...p, movieDescription: e.target.value })); }}
                  maxLength={400}
                  rows={3}
                  autoFocus
                />
              </EditRow>
            </div>
          </RoomFormSection>

          {isOwner && (
            <div className="room-settings-danger">
              <h4 className="room-settings-danger__title">Danger zone</h4>
              <p className="room-settings-danger__copy">
                Permanently delete this room and remove all participants. This cannot be undone.
              </p>
              {showDeleteConfirm ? (
                <div className="room-form-inline-actions">
                  <button
                    className="btn-danger room-form-inline-actions__primary"
                    onClick={() => { void handleDeleteConfirmed(); }}
                    disabled={deleting}
                  >
                    <TrashIcon />
                    {deleting ? 'Deleting…' : 'Yes, delete room'}
                  </button>
                  <button
                    className="btn-ghost room-form-inline-actions__primary"
                    onClick={() => { setShowDeleteConfirm(false); }}
                    disabled={deleting}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button className="btn-danger" onClick={() => { setShowDeleteConfirm(true); }}>
                  <TrashIcon />
                  Delete Room
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </RoomFormShell>
  );
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="room-settings-summary__item">
      <p className="room-settings-summary__item-label">{label}</p>
      <p className="room-settings-summary__item-value">{value}</p>
    </div>
  );
}

function EditRow({
  label,
  isEditing,
  displayValue,
  displayContent,
  canEdit,
  saving,
  onEdit,
  onSave,
  onCancel,
  children,
}: {
  label: string;
  isEditing: boolean;
  displayValue: string;
  displayContent?: React.ReactNode;
  canEdit: boolean;
  saving: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={`room-settings-row${isEditing ? ' is-editing' : ''}`}>
      <div className="room-settings-row__main">
        <p className="room-settings-row__label">{label}</p>
        {isEditing ? (
          <div className="room-settings-row__editor">{children}</div>
        ) : displayContent != null ? (
          <div className="room-settings-row__display">{displayContent}</div>
        ) : (
          <p
            className={`room-settings-row__value${
              displayValue === 'No description' ||
              displayValue === 'Not set' ||
              displayValue === 'No file uploaded' ||
              displayValue === 'No movie set'
                ? ' is-muted'
                : ''
            }`}
          >
            {displayValue}
          </p>
        )}
      </div>

      {canEdit && (
        <div className="room-settings-row__actions">
          {isEditing ? (
            <>
              <IconButton onClick={onSave} title="Save" disabled={saving}>
                <CheckIcon />
              </IconButton>
              <IconButton onClick={onCancel} title="Cancel" disabled={saving}>
                <XIcon />
              </IconButton>
            </>
          ) : (
            <IconButton onClick={onEdit} title={`Edit ${label}`}>
              <PencilIcon />
            </IconButton>
          )}
        </div>
      )}
    </div>
  );
}

function IconButton({
  onClick,
  title,
  disabled,
  children,
}: {
  onClick: () => void;
  title: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="room-settings-icon-button"
      title={title}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
