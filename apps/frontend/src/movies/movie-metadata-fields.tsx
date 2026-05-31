import type { MovieGenre, MovieLanguage } from '@repo/schemas/movies';

const GENRES: { value: MovieGenre; label: string }[] = [
  { value: 'action', label: 'Action' },
  { value: 'comedy', label: 'Comedy' },
  { value: 'drama', label: 'Drama' },
  { value: 'horror', label: 'Horror' },
  { value: 'thriller', label: 'Thriller' },
  { value: 'sci-fi', label: 'Sci-Fi' },
  { value: 'documentary', label: 'Documentary' },
  { value: 'other', label: 'Other' },
];

const LANGUAGES: { value: MovieLanguage; label: string }[] = [
  { value: 'english', label: 'English' },
  { value: 'hebrew', label: 'Hebrew' },
  { value: 'arabic', label: 'Arabic' },
  { value: 'french', label: 'French' },
  { value: 'spanish', label: 'Spanish' },
  { value: 'other', label: 'Other' },
];

export interface MovieMetadataFormValues {
  name: string;
  language: MovieLanguage | '';
  director: string;
  genre: MovieGenre | '';
  length: string;
  rating: string;
  actors: string;
  description: string;
}

export function MovieMetadataFields({
  values,
  errors,
  onChange,
  requireCoreFields,
}: {
  values: MovieMetadataFormValues;
  errors: Partial<Record<keyof MovieMetadataFormValues, string>>;
  onChange: <K extends keyof MovieMetadataFormValues>(key: K, value: MovieMetadataFormValues[K]) => void;
  requireCoreFields: boolean;
}) {
  return (
    <>
      <FormField label="Movie name" error={errors.name} required={requireCoreFields}>
        <input
          className="input"
          type="text"
          placeholder="e.g. Inception (2010)"
          value={values.name}
          onChange={(e) => { onChange('name', e.target.value); }}
          maxLength={120}
        />
      </FormField>

      <FormField label="Language" error={errors.language} required={requireCoreFields}>
        <select
          className="input"
          value={values.language}
          onChange={(e) => { onChange('language', e.target.value as MovieLanguage | ''); }}
        >
          <option value="">Select language</option>
          {LANGUAGES.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </select>
      </FormField>

      <FormField label="Director" optional error={errors.director}>
        <input
          className="input"
          type="text"
          placeholder="Optional"
          value={values.director}
          onChange={(e) => { onChange('director', e.target.value); }}
          maxLength={120}
        />
      </FormField>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <FormField label="Genre" optional error={errors.genre}>
          <select
            className="input"
            value={values.genre}
            onChange={(e) => { onChange('genre', e.target.value as MovieGenre | ''); }}
          >
            <option value="">Optional</option>
            {GENRES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Length (min)" optional error={errors.length}>
          <input
            className="input"
            type="number"
            min={0}
            placeholder="120"
            value={values.length}
            onChange={(e) => { onChange('length', e.target.value); }}
          />
        </FormField>
      </div>

      <FormField label="Rating (0–10)" optional error={errors.rating}>
        <input
          className="input"
          type="number"
          min={0}
          max={10}
          step={0.1}
          placeholder="Optional"
          value={values.rating}
          onChange={(e) => { onChange('rating', e.target.value); }}
        />
      </FormField>

      <FormField label="Actors" optional error={errors.actors}>
        <input
          className="input"
          type="text"
          placeholder="Comma-separated names"
          value={values.actors}
          onChange={(e) => { onChange('actors', e.target.value); }}
          maxLength={200}
        />
      </FormField>

      <FormField label="Movie description" optional error={errors.description}>
        <textarea
          className="input"
          placeholder="A short description of what you're watching…"
          value={values.description}
          onChange={(e) => { onChange('description', e.target.value); }}
          maxLength={400}
          rows={3}
        />
      </FormField>
    </>
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

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--text-secondary)',
};
