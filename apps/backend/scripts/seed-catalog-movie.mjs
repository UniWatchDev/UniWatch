#!/usr/bin/env node
/**
 * Seed a curated catalog movie after uploading files to R2 manually.
 *
 * Usage (from repo root):
 *   pnpm --filter backend seed:catalog-movie -- \
 *     --mongodb-uri "$MONGODB_URI" \
 *     --owner-id "<24-char hex user id>" \
 *     --name "Movie title" \
 *     --language english \
 *     --storage-key "movies/<ownerId>/<movieId>/source.mp4" \
 *     --thumbnail-key "movies/<ownerId>/<movieId>/thumb.svg" \
 *     --mime-type video/mp4 \
 *     --size-bytes 12345678 \
 *     [--description "Optional description"] \
 *     [--duration-seconds 3600] \
 *     [--dry-run]
 */


import mongoose from 'mongoose';

const VALID_LANGUAGES = new Set([
  'english',
  'hebrew',
  'arabic',
  'french',
  'spanish',
  'other'
]);

function parseArgs(argv) {
  const options = {
    dryRun: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (!arg.startsWith('--')) {
      throw new Error(`Unexpected argument: ${arg}`);
    }
    const key = arg.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    const value = argv[index + 1];
    if (value == null || value.startsWith('--')) {
      throw new Error(`Missing value for ${arg}`);
    }
    options[key] = value;
    index += 1;
  }

  const required = [
    'mongodbUri',
    'ownerId',
    'name',
    'language',
    'storageKey',
    'thumbnailKey',
    'mimeType',
    'sizeBytes'
  ];
  for (const field of required) {
    if (options[field] == null || String(options[field]).length === 0) {
      throw new Error(`Missing required flag: --${field.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`);
    }
  }

  if (!/^[a-f0-9]{24}$/u.test(options.ownerId)) {
    throw new Error('--owner-id must be a 24-character hex Mongo ObjectId');
  }

  if (!VALID_LANGUAGES.has(options.language)) {
    throw new Error(`--language must be one of: ${[...VALID_LANGUAGES].join(', ')}`);
  }

  options.sizeBytes = Number.parseInt(String(options.sizeBytes), 10);
  if (!Number.isFinite(options.sizeBytes) || options.sizeBytes <= 0) {
    throw new Error('--size-bytes must be a positive integer');
  }

  if (options.durationSeconds != null) {
    options.durationSeconds = Number.parseInt(String(options.durationSeconds), 10);
    if (!Number.isFinite(options.durationSeconds) || options.durationSeconds <= 0) {
      throw new Error('--duration-seconds must be a positive integer');
    }
  }

  return options;
}

const movieSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    movie_actors: { type: [String], default: [] },
    director: { type: String, default: 'Unknown' },
    rating: { type: Number, default: 0 },
    length: { type: Number, default: 0 },
    genre: { type: String, default: 'other' },
    language: { type: String, required: true },
    description: { type: String, default: null },
    upload_status: { type: String, required: true },
    storage_key: { type: String, default: null },
    thumbnail_key: { type: String, default: null },
    mime_type: { type: String, default: null },
    size_bytes: { type: Number, default: null },
    duration_seconds: { type: Number, default: null },
    file_purge_at: { type: Date, default: null },
    file_uploaded_at: { type: Date, default: null },
    file_deleted_at: { type: Date, default: null },
    deleted_at: { type: Date, default: null },
    in_catalog: { type: Boolean, default: false },
    is_catalog_entry: { type: Boolean, default: false }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'movies'
  }
);

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const movieId = new mongoose.Types.ObjectId();
  const now = new Date();

  const doc = {
    _id: movieId,
    ownerId: new mongoose.Types.ObjectId(options.ownerId),
    name: options.name.trim(),
    movie_actors: [],
    director: 'Unknown',
    rating: 0,
    length: options.durationSeconds ?? 0,
    genre: 'other',
    language: options.language,
    description: options.description ?? null,
    upload_status: 'ready',
    storage_key: options.storageKey,
    thumbnail_key: options.thumbnailKey,
    mime_type: options.mimeType,
    size_bytes: options.sizeBytes,
    duration_seconds: options.durationSeconds ?? null,
    file_uploaded_at: now,
    file_deleted_at: null,
    file_purge_at: null,
    deleted_at: null,
    in_catalog: true,
    is_catalog_entry: true
  };

  if (options.dryRun) {
    console.log(JSON.stringify({ dryRun: true, movie: { ...doc, _id: movieId.toString(), ownerId: options.ownerId } }, null, 2));
    return;
  }

  await mongoose.connect(options.mongodbUri);
  try {
    const Movie = mongoose.model('CatalogSeedMovie', movieSchema);
    await Movie.create(doc);
    console.log(`Catalog movie seeded: ${movieId.toString()}`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
