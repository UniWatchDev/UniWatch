import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRoomContract } from '@repo/contracts/rooms';
import { createMovieContract } from '@repo/contracts/movies';
import { API_BASE_URL } from '@repo/consts/api';

import { formatFetchError, readHttpErrorMessage } from '@/auth/auth-fetch-helpers';
import { useCookieAuth } from '@/auth/use-cookie-auth';
import type { MovieMetadataFormValues } from '@/movies/movie-metadata-fields';
import {
  MovieSourceSection,
  type MovieSourceMode,
} from '@/movies/movie-source-section';
import { resolveMovieForRoom } from '@/movies/prepare-movie-for-room';
import { isMovieLibraryReady } from '@/movies/selectable-owned-movies';
import { startRoomUpload } from '@/movies/room-upload-tracker';
import { useCatalogMovies } from '@/movies/use-catalog-movies';
import { RoomFormAlert } from '@/rooms/room-form-alert';
import { RoomFormBackLink } from '@/rooms/room-form-back-link';
import { RoomFormSection } from '@/rooms/room-form-section';
import { RoomFormShell } from '@/rooms/room-form-shell';
import { RoomVisibilityToggle } from '@/rooms/room-visibility-toggle';

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
  const catalogMovies = useCatalogMovies(true);
  const [form, setForm] = useState<FormState>({
    name: '',
    password: '',
    movieFile: null,
    movie: emptyMovieMetadata(),
    isPrivate: false,
  });
  const [movieSource, setMovieSource] = useState<MovieSourceMode>('none');
  const [selectedLibraryMovieId, setSelectedLibraryMovieId] = useState<string | null>(null);
  const [roomNameTouched, setRoomNameTouched] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<'roomName' | 'password' | 'movieFile' | 'libraryMovie' | keyof MovieMetadataFormValues, string>>>({});
  const [submitting, setSubmitting] = useState(false);
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
    if (movieSource === 'library') {
      if (selectedLibraryMovieId == null) {
        next.libraryMovie = 'Choose a title from the catalog.';
      } else {
        const selectedMovie = catalogMovies.movies.find((movie) => movie.id === selectedLibraryMovieId);
        if (selectedMovie == null || !isMovieLibraryReady(selectedMovie)) {
          next.libraryMovie = 'Choose a ready title from the catalog.';
        }
      }
    }
    if (movieSource === 'upload' && form.movieFile) {
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

    try {
      let movieId: string | undefined;
      let movieName = '';
      let movieDescription = '';
      const movieFile = movieSource === 'upload' ? form.movieFile : null;

      if (movieSource === 'library' && selectedLibraryMovieId != null) {
        const selectedMovie = catalogMovies.movies.find((movie) => movie.id === selectedLibraryMovieId);
        if (selectedMovie == null || !isMovieLibraryReady(selectedMovie)) {
          throw new Error('Selected title is not ready.');
        }
        movieId = selectedMovie.id;
        movieName = selectedMovie.name;
        movieDescription = selectedMovie.description ?? '';
      } else if (movieFile) {
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
        const movie = await resolveMovieForRoom(movieBody);
        movieId = movie.id;
        movieName = movie.name;
        movieDescription = movie.description ?? movieDescription;
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

      if (movieSource === 'upload' && movieFile && movieId !== undefined) {
        startRoomUpload(room.id, movieId, movieFile);
      }

      void navigate(`/room/${room.id}`);
    } catch (err: unknown) {
      setApiError(formatFetchError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <RoomFormShell
      backLink={(
        <RoomFormBackLink onClick={() => { void navigate('/rooms'); }}>
          Back to Lobby
        </RoomFormBackLink>
      )}
      title="Create a room"
      description="Set up your watch party, pick a catalog title, or upload your own video."
    >
      {apiError != null && <RoomFormAlert message={apiError} />}

      <form className="room-form-card card fade-up" onSubmit={(e) => { void handleSubmit(e); }}>
        <RoomFormSection
          eyebrow="Step 1"
          title="Room details"
          description="Name your room and choose who can join."
        >
          <div className="room-form-fields">
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

            <div className="room-form-field">
              <span className="room-form-field__label">Visibility</span>
              <RoomVisibilityToggle
                isPrivate={form.isPrivate}
                onChange={(isPrivate) => { set('isPrivate', isPrivate); }}
                disabled={submitting || !authInitialized}
              />
              <p className="room-form-field__hint">
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
          </div>
        </RoomFormSection>

        <RoomFormSection
          eyebrow="Step 2"
          title="Video"
          description="Optional — add a catalog title now or upload your own file."
        >
          <MovieSourceSection
            source={movieSource}
            onSourceChange={(source) => {
              setMovieSource(source);
              setErrors((prev) => {
                const next = { ...prev };
                delete next.libraryMovie;
                delete next.movieFile;
                return next;
              });
            }}
            selectedMovieId={selectedLibraryMovieId}
            onSelectedMovieIdChange={(movieId) => {
              setSelectedLibraryMovieId(movieId);
              setErrors((prev) => {
                const next = { ...prev };
                delete next.libraryMovie;
                return next;
              });
            }}
            movieFile={form.movieFile}
            onMovieFileChange={(file, validationError) => {
              set('movieFile', file);
              setErrors((prev) => ({
                ...prev,
                ...(validationError !== null ? { movieFile: validationError } : {}),
              }));
            }}
            onMovieFileRemove={clearMovieUpload}
            movieFileError={errors.movieFile}
            movieMetadata={form.movie}
            metadataErrors={errors}
            onMetadataChange={setMovie}
            catalogMovies={catalogMovies}
            disabled={submitting || !authInitialized}
          />
        </RoomFormSection>

        <div className="room-form-actions">
          <button
            className="btn-primary room-form-actions__submit"
            type="submit"
            disabled={submitting || !authInitialized}
          >
            {!authInitialized
              ? 'Waiting for session…'
              : submitting
                ? 'Creating…'
                : 'Create Room'}
          </button>
        </div>
      </form>
    </RoomFormShell>
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
    <div className="room-form-field">
      <label className="room-form-field__label">
        {label}
        {required && <span className="room-form-field__required">*</span>}
        {optional && <span className="room-form-field__optional">(optional)</span>}
      </label>
      <div className="room-form-field__control">{children}</div>
      {error != null && <p className="room-form-field-error">{error}</p>}
    </div>
  );
}
