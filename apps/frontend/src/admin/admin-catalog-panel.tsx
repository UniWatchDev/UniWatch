import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Film, Library, Shield, Upload } from 'lucide-react';
import type { MovieLanguage, MovieResponse } from '@repo/schemas/movies';

import {
  fetchAdminCatalogMovies,
  updateAdminCatalogMovie,
  uploadCatalogMovieFile
} from '@/admin/admin-catalog-api';
import { CinemaMovieCard } from '@/components/cinema-movie-card';
import { Button } from '@/components/ui/button';
import { MovieUploadField } from '@/movies/movie-upload-field';
import { MovieUploadProgress } from '@/movies/movie-upload-progress';
import type { UploadProgress } from '@/movies/upload-movie-file';

type AdminTab = 'library' | 'upload';

const LANGUAGES: { value: MovieLanguage; label: string }[] = [
  { value: 'english', label: 'English' },
  { value: 'hebrew', label: 'Hebrew' },
  { value: 'arabic', label: 'Arabic' },
  { value: 'french', label: 'French' },
  { value: 'spanish', label: 'Spanish' },
  { value: 'other', label: 'Other' }
];

export function AdminCatalogPanel() {
  const [expanded, setExpanded] = useState(true);
  const [tab, setTab] = useState<AdminTab>('library');
  const [movies, setMovies] = useState<MovieResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const messageTimerRef = useRef<number | null>(null);

  const loadMovies = useCallback(async (options?: { refresh?: boolean }) => {
    if (options?.refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const data = await fetchAdminCatalogMovies();
      setMovies(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load catalog');
    } finally {
      if (options?.refresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadMovies();
    return () => {
      if (messageTimerRef.current !== null) {
        window.clearTimeout(messageTimerRef.current);
      }
    };
  }, [loadMovies]);

  const showMessage = (message: string) => {
    if (messageTimerRef.current !== null) {
      window.clearTimeout(messageTimerRef.current);
    }
    setActionMessage(message);
    messageTimerRef.current = window.setTimeout(() => {
      setActionMessage(null);
      messageTimerRef.current = null;
    }, 4000);
  };

  const handleVisibilityToggle = async (movie: MovieResponse) => {
    try {
      const updated = await updateAdminCatalogMovie(movie.id, {
        in_catalog: !movie.in_catalog
      });
      setMovies((current) =>
        current.map((entry) => (entry.id === updated.id ? updated : entry))
      );
      showMessage(updated.in_catalog ? 'Movie published to catalog.' : 'Movie hidden from catalog.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update movie');
    }
  };

  const handleSaveMetadata = async (
    movieId: string,
    next: { name: string; description: string }
  ): Promise<void> => {
    const updated = await updateAdminCatalogMovie(movieId, {
      name: next.name.trim(),
      description: next.description.trim().length > 0 ? next.description.trim() : null
    });
    setMovies((current) =>
      current.map((entry) => (entry.id === updated.id ? updated : entry))
    );
    showMessage('Movie details saved.');
  };

  const handleUploaded = (movie: MovieResponse) => {
    setMovies((current) => {
      const without = current.filter((entry) => entry.id !== movie.id);
      return [movie, ...without];
    });
    setTab('library');
    showMessage(`"${movie.name}" added to the catalog.`);
  };

  return (
    <section className="admin-catalog-panel fade-up mb-8">
      <button
        type="button"
        className="admin-catalog-panel__header"
        onClick={() => { setExpanded((value) => !value); }}
        aria-expanded={expanded}
      >
        <div className="admin-catalog-panel__title-wrap">
          <span className="admin-catalog-panel__icon" aria-hidden="true">
            <Shield size={16} />
          </span>
          <div>
            <h2 className="admin-catalog-panel__title">Catalog admin</h2>
            <p className="admin-catalog-panel__subtitle">
              Manage the shared movie library visible in room pickers.
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {expanded ? (
        <div className="admin-catalog-panel__body">
          <div className="admin-catalog-panel__tabs">
            <button
              type="button"
              className={`admin-catalog-panel__tab${tab === 'library' ? ' is-active' : ''}`}
              onClick={() => { setTab('library'); }}
            >
              <Library size={14} />
              Library
            </button>
            <button
              type="button"
              className={`admin-catalog-panel__tab${tab === 'upload' ? ' is-active' : ''}`}
              onClick={() => { setTab('upload'); }}
            >
              <Upload size={14} />
              Upload new
            </button>
          </div>

          {actionMessage !== null ? (
            <p className="admin-catalog-panel__message">{actionMessage}</p>
          ) : null}
          {error !== null ? (
            <p className="admin-catalog-panel__error">{error}</p>
          ) : null}

          {tab === 'library' ? (
            <AdminCatalogLibrary
              movies={movies}
              loading={loading}
              refreshing={refreshing}
              onRefresh={() => { void loadMovies({ refresh: true }); }}
              onToggleVisibility={(movie) => { void handleVisibilityToggle(movie); }}
              onSaveMetadata={(movieId, next) => handleSaveMetadata(movieId, next)}
            />
          ) : (
            <AdminCatalogUploadForm onUploaded={handleUploaded} />
          )}
        </div>
      ) : null}
    </section>
  );
}

function AdminCatalogLibrary({
  movies,
  loading,
  refreshing,
  onRefresh,
  onToggleVisibility,
  onSaveMetadata
}: {
  movies: MovieResponse[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onToggleVisibility: (movie: MovieResponse) => void;
  onSaveMetadata: (
    movieId: string,
    next: { name: string; description: string }
  ) => Promise<void>;
}) {
  if (loading) {
    return (
      <div className="admin-catalog-panel__empty">
        <p>Loading catalog…</p>
      </div>
    );
  }

  return (
    <div className="admin-catalog-panel__library">
      <div className="admin-catalog-panel__library-toolbar">
        <p className="admin-catalog-panel__count">
          {movies.length} title{movies.length === 1 ? '' : 's'}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      {movies.length === 0 ? (
        <div className="admin-catalog-panel__empty">
          <Film size={28} />
          <p>No catalog movies yet. Upload one to get started.</p>
        </div>
      ) : (
        <div className="admin-catalog-panel__grid">
          {movies.map((movie) => (
            <AdminCatalogMovieCard
              key={movie.id}
              movie={movie}
              onToggleVisibility={() => { onToggleVisibility(movie); }}
              onSaveMetadata={(next) => onSaveMetadata(movie.id, next)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AdminCatalogMovieCard({
  movie,
  onToggleVisibility,
  onSaveMetadata
}: {
  movie: MovieResponse;
  onToggleVisibility: () => void;
  onSaveMetadata: (next: { name: string; description: string }) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(movie.name);
  const [description, setDescription] = useState(movie.description ?? '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const openEdit = () => {
    setName(movie.name);
    setDescription(movie.description ?? '');
    setSaveError(null);
    setEditing(true);
  };

  const saveEdits = async () => {
    if (name.trim().length === 0) {
      setSaveError('Movie name is required.');
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      await onSaveMetadata({ name: name.trim(), description });
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save movie');
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="admin-catalog-card">
      <CinemaMovieCard
        movie={movie}
        interactive={false}
        hoverLabel={null}
      />

      <div className="admin-catalog-card__body">
        {editing ? (
          <div className="admin-catalog-card__edit">
            <input
              className="input"
              value={name}
              onChange={(e) => { setName(e.target.value); }}
              maxLength={120}
            />
            <textarea
              className="input"
              value={description}
              onChange={(e) => { setDescription(e.target.value); }}
              maxLength={400}
              rows={3}
              placeholder="Description (optional)"
            />
            <div className="admin-catalog-card__actions">
              <Button type="button" size="sm" disabled={saving} onClick={() => { void saveEdits(); }}>
                Save
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditing(false);
                  setName(movie.name);
                  setDescription(movie.description ?? '');
                }}
              >
                Cancel
              </Button>
            </div>
            {saveError !== null ? (
              <p className="admin-catalog-panel__error">{saveError}</p>
            ) : null}
          </div>
        ) : (
          <>
            {movie.description ? (
              <p className="admin-catalog-card__description">{movie.description}</p>
            ) : null}
            <div className="admin-catalog-card__actions">
              <Button type="button" variant="outline" size="sm" onClick={openEdit}>
                Edit
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={onToggleVisibility}>
                {movie.in_catalog ? 'Hide' : 'Publish'}
              </Button>
            </div>
          </>
        )}
      </div>
    </article>
  );
}

function AdminCatalogUploadForm({
  onUploaded
}: {
  onUploaded: (movie: MovieResponse) => void;
}) {
  const [name, setName] = useState('');
  const [language, setLanguage] = useState<MovieLanguage | ''>('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);

  const submit = async () => {
    setFormError(null);

    if (name.trim().length === 0) {
      setFormError('Movie name is required.');
      return;
    }
    if (language === '') {
      setFormError('Language is required.');
      return;
    }
    if (file === null) {
      setFormError('Choose a video file to upload.');
      return;
    }
    if (fileError !== null) {
      setFormError(fileError);
      return;
    }

    setUploading(true);
    setProgress(null);
    try {
      const movie = await uploadCatalogMovieFile(
        {
          name: name.trim(),
          language,
          description: description.trim().length > 0 ? description.trim() : undefined
        },
        file,
        { onProgress: setProgress }
      );
      setName('');
      setLanguage('');
      setDescription('');
      setFile(null);
      setFileError(null);
      setProgress(null);
      onUploaded(movie);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="admin-catalog-panel__upload">
      <div className="admin-catalog-panel__upload-grid">
        <label className="admin-catalog-panel__field">
          <span>Movie name</span>
          <input
            className="input"
            value={name}
            onChange={(e) => { setName(e.target.value); }}
            placeholder="e.g. Big Buck Bunny"
            maxLength={120}
            disabled={uploading}
          />
        </label>

        <label className="admin-catalog-panel__field">
          <span>Language</span>
          <select
            className="input"
            value={language}
            onChange={(e) => { setLanguage(e.target.value as MovieLanguage | ''); }}
            disabled={uploading}
          >
            <option value="">Select language</option>
            {LANGUAGES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="admin-catalog-panel__field admin-catalog-panel__field--full">
          <span>Description (optional)</span>
          <textarea
            className="input"
            value={description}
            onChange={(e) => { setDescription(e.target.value); }}
            maxLength={400}
            rows={3}
            disabled={uploading}
          />
        </label>

        <div className="admin-catalog-panel__field admin-catalog-panel__field--full">
          <MovieUploadField
            label="Video file"
            required
            file={file}
            error={fileError ?? undefined}
            disabled={uploading}
            onFileChange={(next, validationError) => {
              setFile(next);
              setFileError(validationError);
            }}
            onRemove={() => {
              setFile(null);
              setFileError(null);
            }}
          />
        </div>
      </div>

      {progress !== null ? <MovieUploadProgress percent={progress.percent} /> : null}
      {formError !== null ? <p className="admin-catalog-panel__error">{formError}</p> : null}

      <div className="admin-catalog-panel__upload-actions">
        <Button type="button" disabled={uploading} onClick={() => { void submit(); }}>
          {uploading ? 'Uploading…' : 'Publish to catalog'}
        </Button>
      </div>
    </div>
  );
}
