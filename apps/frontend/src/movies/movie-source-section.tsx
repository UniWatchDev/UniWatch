import { useEffect, useMemo } from 'react';
import type { MovieResponse } from '@repo/schemas/movies';

import {
  MovieMetadataFields,
  type MovieMetadataFormValues,
} from '@/movies/movie-metadata-fields';
import { MovieLibraryGrid } from '@/movies/movie-library-grid';
import { MovieUploadField } from '@/movies/movie-upload-field';
import { isMovieLibraryReady } from '@/movies/selectable-owned-movies';
import { useCatalogMovies } from '@/movies/use-catalog-movies';

export type MovieSourceMode = 'none' | 'library' | 'upload';

export interface CatalogMoviesSnapshot {
  movies: readonly MovieResponse[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

interface MovieSourceSectionProps {
  source: MovieSourceMode;
  onSourceChange: (source: MovieSourceMode) => void;
  selectedMovieId: string | null;
  onSelectedMovieIdChange: (movieId: string | null) => void;
  movieFile: File | null;
  onMovieFileChange: (file: File | null, validationError: string | null) => void;
  onMovieFileRemove: () => void;
  movieFileError?: string | undefined;
  movieMetadata: MovieMetadataFormValues;
  metadataErrors: Partial<Record<'movieFile' | 'libraryMovie' | keyof MovieMetadataFormValues, string>>;
  onMetadataChange: <K extends keyof MovieMetadataFormValues>(
    key: K,
    value: MovieMetadataFormValues[K]
  ) => void;
  catalogMovies?: CatalogMoviesSnapshot;
  disabled?: boolean;
}

export function MovieSourceSection({
  source,
  onSourceChange,
  selectedMovieId,
  onSelectedMovieIdChange,
  movieFile,
  onMovieFileChange,
  onMovieFileRemove,
  movieFileError,
  movieMetadata,
  metadataErrors,
  onMetadataChange,
  catalogMovies: catalogMoviesProp,
  disabled = false,
}: MovieSourceSectionProps) {
  const internalCatalogMovies = useCatalogMovies(catalogMoviesProp == null);
  const { movies, loading, error, reload } = catalogMoviesProp ?? internalCatalogMovies;
  const readyCount = useMemo(
    () => movies.filter((movie) => isMovieLibraryReady(movie)).length,
    [movies]
  );

  useEffect(() => {
    if (source !== 'none' || loading) {
      return;
    }
    if (readyCount > 0) {
      onSourceChange('library');
    }
  }, [loading, onSourceChange, readyCount, source]);

  return (
    <div className="movie-source-section">
      <div className="movie-source-section__intro">
        <p className="movie-source-section__label">
          Video
          <span className="movie-source-section__optional">(optional)</span>
        </p>
        <p className="movie-source-section__lede">
          Browse the shared catalog to start watching immediately, or upload your own file.
        </p>
      </div>

      <div className="movie-source-tabs" role="tablist" aria-label="Video source">
        <button
          type="button"
          role="tab"
          aria-selected={source === 'library'}
          className={`movie-source-tabs__tab${source === 'library' ? ' is-active' : ''}`}
          onClick={() => { onSourceChange('library'); }}
          disabled={disabled}
        >
          Browse catalog
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={source === 'upload'}
          className={`movie-source-tabs__tab${source === 'upload' ? ' is-active' : ''}`}
          onClick={() => { onSourceChange('upload'); }}
          disabled={disabled}
        >
          Upload new
        </button>
      </div>

      {source === 'library' ? (
        <div role="tabpanel" className="movie-source-panel">
          <MovieLibraryGrid
            movies={movies}
            loading={loading}
            error={error}
            selectedMovieId={selectedMovieId}
            onSelectedMovieIdChange={(movieId) => {
              onSelectedMovieIdChange(movieId);
              if (movieId != null) {
                onSourceChange('library');
              }
            }}
            onRetry={reload}
            disabled={disabled}
            emptyHint="No catalog titles yet. Switch to Upload new or ask an admin to publish titles."
          />
          {metadataErrors.libraryMovie != null && (
            <p className="room-form-field-error">{metadataErrors.libraryMovie}</p>
          )}
          {selectedMovieId != null && (
            <p className="movie-source-panel__note">
              This title is already on the server — the room will start playback immediately.
            </p>
          )}
        </div>
      ) : source === 'upload' ? (
        <div role="tabpanel" className="movie-source-panel">
          <MovieUploadField
            label="Video file"
            file={movieFile}
            error={movieFileError}
            disabled={disabled}
            onFileChange={(file, validationError) => {
              onMovieFileChange(file, validationError);
              if (file != null) {
                onSourceChange('upload');
                onSelectedMovieIdChange(null);
              }
            }}
            onRemove={() => {
              onMovieFileRemove();
              if (readyCount > 0) {
                onSourceChange('library');
              } else {
                onSourceChange('none');
              }
            }}
          />

          <MovieMetadataFields
            values={movieMetadata}
            errors={metadataErrors}
            onChange={onMetadataChange}
            requireCoreFields={movieFile !== null}
          />
        </div>
      ) : (
        <div role="tabpanel" className="movie-source-panel">
          <p className="movie-source-panel__note">
            Choose a source above, or leave this empty and add a video later from the room.
          </p>
        </div>
      )}
    </div>
  );
}
