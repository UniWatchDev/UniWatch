import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRoomContract } from '@repo/contracts/rooms';
import { createMovieContract } from '@repo/contracts/movies';
import { API_BASE_URL } from '@repo/consts/api';

import { formatFetchError, readHttpErrorMessage } from '@/auth/auth-fetch-helpers';
import { useCookieAuth } from '@/auth/use-cookie-auth';
import {
  MovieMetadataFields,
  type MovieMetadataFormValues,
} from '@/movies/movie-metadata-fields';
import { MovieUploadField } from '@/movies/movie-upload-field';
import { MovieUploadProgress } from '@/movies/movie-upload-progress';
import { prepareMovieForRoom } from '@/movies/prepare-movie-for-room';

interface FormState {
  name: string;
  password: string;
  movieFile: File | null;
  movie: MovieMetadataFormValues;
  isPrivate: boolean;
}

const emptyMovieMetadata = (): MovieMetadataFormValues => ({
  name: '',
  language: '',
  director: '',
  genre: '',
  length: '',
  rating: '',
  actors: '',
  description: '',
});

export function CreateRoom() {
  const navigate = useNavigate();
  const { sessionUser, authInitialized } = useCookieAuth();
  const [form, setForm] = useState<FormState>({
    name: '',
    password: '',
    movieFile: null,
    movie: emptyMovieMetadata(),
    isPrivate: false,
  });
  const [roomNameTouched, setRoomNameTouched] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<'roomName' | 'password' | 'movieFile' | keyof MovieMetadataFormValues, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (roomNameTouched || form.name.trim() !== '' || sessionUser?.userName == null) {
      return;
    }
    setForm((prev) => ({
      ...prev,
      name: `${sessionUser.userName}'s Room`,
    }));
  }, [form.name, roomNameTouched, sessionUser?.userName]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    if (key === 'name') {
      setRoomNameTouched(true);
    }
  };

  const setMovie = <K extends keyof MovieMetadataFormValues>(key: K, value: MovieMetadataFormValues[K]) => {
    setForm((prev) => ({ ...prev, movie: { ...prev.movie, [key]: value } }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const clearMovieUpload = () => {
    setForm((prev) => ({
      ...prev,
      movieFile: null,
      movie: emptyMovieMetadata(),
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.movieFile;
      delete next.name;
      delete next.language;
      delete next.director;
      delete next.genre;
      delete next.length;
      delete next.rating;
      delete next.actors;
      delete next.description;
      return next;
    });
  };

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!form.name.trim()) next.roomName = 'Room name is required.';
    if (form.isPrivate && !form.password.trim()) next.password = 'Password is required for private rooms.';
    if (form.movieFile) {
      if (!form.movie.name.trim()) next.name = 'Movie name is required when uploading a video.';
      if (!form.movie.language) next.language = 'Language is required when uploading a video.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!authInitialized) return;
    if (!validate()) return;
    setSubmitting(true);
    setApiError(null);
    setUploadPercent(null);

    try {
      let movieId: string | undefined;
      let movieName = form.movie.name.trim();
      let movieDescription = form.movie.description.trim();

      if (form.movieFile) {
        setUploadPercent(0);
        const movieBody = createMovieContract.bodySchema.parse({
          name: form.movie.name.trim(),
          language: form.movie.language,
          ...(form.movie.director.trim() && { director: form.movie.director.trim() }),
          ...(form.movie.genre && { genre: form.movie.genre }),
          ...(form.movie.length.trim() && { length: Number(form.movie.length) }),
          ...(form.movie.rating.trim() && { rating: Number(form.movie.rating) }),
          ...(form.movie.actors.trim() && {
            movie_actors: form.movie.actors.split(',').map((actor) => actor.trim()).filter((actor) => actor.length > 0),
          }),
          ...(form.movie.description.trim() && { description: form.movie.description.trim() }),
        });
        const movie = await prepareMovieForRoom(movieBody, form.movieFile, {
          onProgress: (progress) => { setUploadPercent(progress.percent); },
        });
        movieId = movie.id;
        movieName = movie.name;
        movieDescription = movie.description ?? movieDescription;
        setUploadPercent(null);
      }

      const body = createRoomContract.bodySchema.parse({
        name: form.name.trim(),
        room_type: form.isPrivate ? 'private' : 'public',
        ...(form.password.trim() && { password: form.password.trim() }),
        ...(movieId !== undefined && { movie: movieId }),
        ...(movieName && { movie_name: movieName }),
        ...(movieDescription && { movie_description: movieDescription }),
      });

      const res = await fetch(`${API_BASE_URL}${createRoomContract.path}`, {
        method: createRoomContract.method,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(await readHttpErrorMessage(res));
      }
      const room = createRoomContract.responseSchema.parse(await res.json());
      void navigate(`/room/${room.id}`);
    } catch (err: unknown) {
      setApiError(formatFetchError(err));
    } finally {
      setSubmitting(false);
      setUploadPercent(null);
    }
  };

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
      <div className="card fade-up" style={{ width: '100%', maxWidth: 520, padding: '32px' }}>
        <div style={{ marginBottom: 28 }}>
          <button
            onClick={() => { void navigate('/rooms'); }}
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
            Back to Lobby
          </button>
          <h1 className="display" style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Create a room
          </h1>
          <p style={{ marginTop: 6, fontSize: 14, color: 'var(--text-muted)' }}>
            Room name is the room title. Movie name is the video title. Video file is the uploaded file.
            Fields marked * are required. If you do not change it, the room name starts as your username&apos;s Room.
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

        {uploadPercent !== null && (
          <div
            style={{
              marginBottom: 16,
              padding: '14px 16px',
              borderRadius: 10,
              background: 'var(--accent-dim)',
              border: '1px solid rgba(124,58,237,0.25)',
            }}
          >
            <MovieUploadProgress percent={uploadPercent} label="Uploading your video" />
          </div>
        )}

        <form onSubmit={(e) => { void handleSubmit(e); }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <FormField label="Room name" error={errors.roomName} required>
            <input
              className="input"
              type="text"
              placeholder={sessionUser?.userName != null ? `${sessionUser.userName}'s Room` : 'Enter a room name'}
              value={form.name}
              onChange={(e) => { set('name', e.target.value); }}
              maxLength={60}
            />
          </FormField>

          <div>
            <label style={labelStyle}>Visibility</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <ToggleButton active={!form.isPrivate} onClick={() => { set('isPrivate', false); }} icon="🌐" label="Public" />
              <ToggleButton active={form.isPrivate} onClick={() => { set('isPrivate', true); }} icon="🔒" label="Private" />
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
              {form.isPrivate
                ? 'Only people with the password can join.'
                : 'Anyone can see and join this room from the lobby.'}
            </p>
          </div>

          {form.isPrivate && (
            <FormField label="Password" error={errors.password} required>
              <input
                className="input"
                type="password"
                placeholder="Enter a room password"
                value={form.password}
                onChange={(e) => { set('password', e.target.value); }}
                maxLength={64}
                autoComplete="new-password"
              />
            </FormField>
          )}

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '4px 0' }} />

          <MovieUploadField
            label="Video file"
            file={form.movieFile}
            error={errors.movieFile}
            onFileChange={(file, validationError) => {
              set('movieFile', file);
              setErrors((prev) => ({
                ...prev,
                ...(validationError !== null ? { movieFile: validationError } : {}),
              }));
            }}
            onRemove={clearMovieUpload}
          />

          <MovieMetadataFields
            values={form.movie}
            errors={errors}
            onChange={setMovie}
            requireCoreFields={form.movieFile !== null}
          />

          <button
            className="btn-primary"
            type="submit"
            disabled={submitting || !authInitialized}
            style={{ marginTop: 4, padding: '12px 24px', fontSize: 15, width: '100%', opacity: submitting || !authInitialized ? 0.7 : 1 }}
          >
            {!authInitialized
              ? 'Waiting for session…'
              : submitting
                ? uploadPercent !== null
                  ? `Uploading… ${String(uploadPercent)}%`
                  : 'Creating…'
                : 'Create Room'}
          </button>
        </form>
      </div>
    </div>
  );
}

function FormField({
  label,
  optional,
  required,
  error,
  children,
}: {
  label: string;
  optional?: boolean | undefined;
  required?: boolean | undefined;
  error?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label style={labelStyle}>
        {label}
        {required && <span style={{ color: '#f87171', marginLeft: 2 }}>*</span>}
        {optional && <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 4 }}>(optional)</span>}
      </label>
      <div style={{ marginTop: 6 }}>{children}</div>
      {error && <p style={{ marginTop: 4, fontSize: 12, color: '#f87171' }}>{error}</p>}
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: '10px 16px',
        border: active ? '2px solid var(--accent)' : '1px solid var(--border-medium)',
        borderRadius: 8,
        background: active ? 'var(--accent-dim)' : 'var(--bg-input)',
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontFamily: 'var(--font-body)',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        transition: 'all 200ms ease',
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--text-secondary)',
};
