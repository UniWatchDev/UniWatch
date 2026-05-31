import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { API_BASE_URL } from '@repo/consts/api';
import { MOVIE_ALLOWED_FORMATS_LABEL } from '@repo/consts/movies';
import { createMovieContract, updateMovieContract } from '@repo/contracts/movies';
import { getRoomContract, updateRoomContract, deleteRoomContract } from '@repo/contracts/rooms';
import { getAuthMeContract } from '@repo/contracts/auth';
import type { MovieResponse } from '@repo/schemas/movies';
import type { RoomResponse } from '@repo/schemas/rooms';

import { MovieUploadField } from '@/movies/movie-upload-field';
import { MovieUploadProgress } from '@/movies/movie-upload-progress';
import { attachMovieToRoom } from '@/movies/attach-room-movie';
import { formatMovieUploadAge } from '@/movies/format-movie-upload-age';
import { fetchOwnedMovies } from '@/movies/fetch-owned-movies';
import { prepareMovieForRoom } from '@/movies/prepare-movie-for-room';
import { validateMovieFile } from '@/movies/upload-movie-file';
import { formatFetchError } from '@/auth/auth-fetch-helpers';

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
        if (!cancelled) {
          setOwnedMovies(movies);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setOwnedMoviesError(formatFetchError(err));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setOwnedMoviesLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOwner]);

  useEffect(() => {
    if (!isOwner || !isRoomLoaded(room)) return;
    const readyMovies = ownedMovies.filter((movie) => movie.has_file && movie.upload_status === 'ready');
    const fallbackMovieId = room.movie ?? readyMovies[0]?.id ?? '';
    if (selectedMovieId.length === 0 || !readyMovies.some((movie) => movie.id === selectedMovieId)) {
      setSelectedMovieId(fallbackMovieId);
    }
  }, [isOwner, ownedMovies, room, selectedMovieId]);

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
      const readyMovies = ownedMovies.filter((movie) => movie.has_file && movie.upload_status === 'ready');
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
    : 'No new file selected';
  const readyOwnedMovies = ownedMovies.filter((movie) => movie.has_file && movie.upload_status === 'ready');
  const selectedOwnedMovieAge = formatMovieUploadAge(ownedMovies.find((movie) => movie.id === selectedMovieId)?.file_uploaded_at);
  const roomTitleSummary = room.name;
  const movieTitleSummary = room.movie_name ?? 'No movie attached';
  const videoStateSummary = room.movie ? 'Video file attached' : 'No video file uploaded yet';

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--bg-primary)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '48px 16px',
      }}
    >
      <div className="card fade-up" style={{ width: '100%', maxWidth: 720, padding: '32px' }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <button
            onClick={() => { void navigate(`/room/${room.id}`); }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 20,
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: 13,
              cursor: 'pointer',
              padding: 0,
              fontFamily: 'var(--font-body)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Back to Room
          </button>
          <h1 className="display" style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Edit Room
          </h1>
          <p style={{ marginTop: 6, fontSize: 14, color: 'var(--text-muted)' }}>
            {isOwner
              ? 'Update room details and movie settings in clean, separate sections.'
              : 'You can view this room\'s settings, but only the owner can edit them.'}
          </p>
        </div>

        {apiError && (
          <div
            style={{
              marginBottom: 16,
              padding: '10px 14px',
              borderRadius: 8,
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              fontSize: 13,
              color: '#f87171',
            }}
          >
            {apiError}
          </div>
        )}

        <div
          style={{
            marginBottom: 16,
            padding: '12px 14px',
            borderRadius: 12,
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-primary)',
          }}
        >
          <p
            style={{
              margin: '0 0 8px',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.06em',
              color: 'var(--text-muted)',
            }}
          >
            Room summary
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            <SummaryItem label="Room title" value={roomTitleSummary} />
            <SummaryItem label="Movie title" value={movieTitleSummary} />
            <SummaryItem label="Video file" value={videoStateSummary} />
            <SummaryItem label="Visibility" value={room.room_type === 'private' ? 'Private' : 'Public'} />
          </div>
        </div>

        <div style={{ display: 'grid', gap: 24 }}>
          <SettingsSection
            title="Room details"
            description="Update the room title, visibility, and password."
          >
            <div style={{ display: 'grid', gap: 14 }}>
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
                displayValue={room.room_type === 'private' ? '🔒 Private' : '🌐 Public'}
                canEdit={isOwner}
                saving={saving}
                onEdit={() => { startEdit('isPrivate'); }}
                onSave={() => { void saveField('isPrivate'); }}
                onCancel={() => { cancelEdit('isPrivate'); }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['public', 'private'] as const).map((v) => {
                      const isActive = v === 'private' ? drafts.isPrivate : !drafts.isPrivate;
                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => { setDrafts((p) => ({ ...p, isPrivate: v === 'private' })); }}
                          style={{
                            flex: 1,
                            padding: '9px 12px',
                            border: isActive ? '2px solid var(--accent)' : '1px solid var(--border-medium)',
                            borderRadius: 8,
                            background: isActive ? 'var(--accent-dim)' : 'var(--bg-input)',
                            color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                            fontFamily: 'var(--font-body)',
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 200ms ease',
                          }}
                        >
                          {v === 'public' ? '🌐 Public' : '🔒 Private'}
                        </button>
                      );
                    })}
                  </div>
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

              {room.room_type === 'private' && <EditRow
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
              </EditRow>}
            </div>
          </SettingsSection>

          <SettingsSection
            title="Movie management"
            description="Choose the current movie, replace the file, and edit metadata."
          >
            <div style={{ display: 'grid', gap: 14 }}>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                    Current room movie: <span style={{ color: 'var(--text-primary)' }}>{room.movie_name ?? 'No movie attached'}</span>
                    {' '}
                    Update the room title and movie title if you switch it.
                  </p>
                  {ownedMoviesError && (
                    <p style={{ margin: 0, fontSize: 12, color: '#f87171' }}>{ownedMoviesError}</p>
                  )}
                  {ownedMoviesLoading ? (
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Loading your videos…</p>
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
                          {movie.file_uploaded_at ? ` · ${formatMovieUploadAge(movie.file_uploaded_at) ?? 'uploaded recently'}` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                      You do not have any ready videos yet.
                    </p>
                  )}
                  {selectedOwnedMovieAge && (
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                      {selectedOwnedMovieAge}
                    </p>
                  )}
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                    Only your own ready videos are shown here. You can switch to another one or upload a new file below.
                  </p>
                </div>
              </EditRow>

              <EditRow
                label="Video file"
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
                <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                  {drafts.movieFile
                    ? 'This is the replacement file currently selected for upload. Remove it to pick a different one.'
                    : `Upload a new file to replace the current room movie (${MOVIE_ALLOWED_FORMATS_LABEL}, up to 1 GB). The video file is separate from the room title and movie title.`}
                </p>
                {uploadPercent !== null && <MovieUploadProgress percent={uploadPercent} />}
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
          </SettingsSection>

          {isOwner && (
            <div
              style={{
                padding: '20px',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 12,
                background: 'rgba(239,68,68,0.04)',
              }}
            >
              <h4 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700, color: '#f87171' }}>
                Danger zone
              </h4>
              <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-muted)' }}>
                Permanently delete this room and remove all participants. This cannot be undone.
              </p>
              {showDeleteConfirm ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn-danger"
                    onClick={() => { void handleDeleteConfirmed(); }}
                    disabled={deleting}
                    style={{ flex: 1, opacity: deleting ? 0.7 : 1 }}
                  >
                    <TrashIcon />
                    {deleting ? 'Deleting…' : 'Yes, delete room'}
                  </button>
                  <button
                    className="btn-ghost"
                    onClick={() => { setShowDeleteConfirm(false); }}
                    disabled={deleting}
                    style={{ flex: 1 }}
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
    </div>
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
    <div
      style={{
        padding: '10px 12px',
        borderRadius: 10,
        border: '1px solid var(--border-subtle)',
        background: 'var(--bg-primary)',
      }}
    >
      <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: 14, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {value}
      </p>
    </div>
  );
}

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'grid', gap: 4 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h2>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>{description}</p>
      </div>
      <div style={{ display: 'grid', gap: 16 }}>{children}</div>
    </section>
  );
}

function EditRow({
  label,
  isEditing,
  displayValue,
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
  canEdit: boolean;
  saving: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: '14px 16px',
        borderRadius: 10,
        border: isEditing ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
        background: isEditing ? 'rgba(124,58,237,0.04)' : 'var(--bg-elevated)',
        transition: 'border-color 200ms ease, background 200ms ease',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: isEditing ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              margin: '0 0 4px',
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--text-muted)',
            }}
          >
            {label}
          </p>
          {isEditing ? (
            <div style={{ marginTop: 8 }}>{children}</div>
          ) : (
            <p
              style={{
                margin: 0,
                fontSize: 14,
                color:
                  displayValue === 'No description' ||
                  displayValue === 'Not set' ||
                  displayValue === 'No file uploaded' ||
                  displayValue === 'No movie set'
                    ? 'var(--text-muted)'
                    : 'var(--text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {displayValue}
            </p>
          )}
        </div>

        {canEdit && (
          <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginTop: isEditing ? 2 : 0 }}>
            {isEditing ? (
              <>
                <IconButton onClick={onSave} title="Save" color="var(--accent-hover)" hoverBg="var(--accent-dim)" disabled={saving}>
                  <CheckIcon />
                </IconButton>
                <IconButton onClick={onCancel} title="Cancel" color="var(--text-muted)" hoverBg="var(--border-subtle)" disabled={saving}>
                  <XIcon />
                </IconButton>
              </>
            ) : (
              <IconButton onClick={onEdit} title={`Edit ${label}`} color="var(--text-muted)" hoverBg="var(--border-subtle)">
                <PencilIcon />
              </IconButton>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function IconButton({
  onClick,
  title,
  color,
  hoverBg,
  disabled,
  children,
}: {
  onClick: () => void;
  title: string;
  color: string;
  hoverBg: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => { setHovered(true); }}
      onMouseLeave={() => { setHovered(false); }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 30,
        height: 30,
        borderRadius: 7,
        border: '1px solid var(--border-medium)',
        background: hovered ? hoverBg : 'transparent',
        color,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'all 150ms ease',
        padding: 0,
      }}
    >
      {children}
    </button>
  );
}
