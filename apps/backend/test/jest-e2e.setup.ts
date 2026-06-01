/** Ensure Zod env validation passes when e2e boots `AppModule` (no real `.env` in CI). */
process.env['JWT_SECRET'] =
  process.env['JWT_SECRET'] ?? '01234567890123456789012345678901';
process.env['JWT_ACCESS_EXPIRES_IN'] =
  process.env['JWT_ACCESS_EXPIRES_IN'] ?? '15m';
process.env['JWT_REFRESH_EXPIRES_IN'] =
  process.env['JWT_REFRESH_EXPIRES_IN'] ?? '7d';
process.env['AUTH_EMAIL_VERIFICATION_EXPIRES_IN'] =
  process.env['AUTH_EMAIL_VERIFICATION_EXPIRES_IN'] ?? '15m';
process.env['AUTH_PASSWORD_RESET_EXPIRES_IN'] =
  process.env['AUTH_PASSWORD_RESET_EXPIRES_IN'] ?? '1h';
process.env['AUTH_USE_REAL_EMAILS'] = process.env['AUTH_USE_REAL_EMAILS'] ?? 'false';
process.env['MONGODB_URI'] =
  process.env['MONGODB_URI'] ?? 'mongodb://127.0.0.1:27017/uniwatch_e2e';
process.env['AUTH_THROTTLE_LIMIT'] =
  process.env['AUTH_THROTTLE_LIMIT'] ?? '10000';
/** E2E uses in-memory storage; placeholders satisfy `S3StorageService` construction only. */
process.env['S3_REGION'] = process.env['S3_REGION'] ?? 'auto';
process.env['S3_BUCKET'] = process.env['S3_BUCKET'] ?? 'uniwatch-e2e';
process.env['S3_ENDPOINT'] =
  process.env['S3_ENDPOINT'] ??
  'https://00000000000000000000000000000000.r2.cloudflarestorage.com';
process.env['S3_ACCESS_KEY_ID'] = process.env['S3_ACCESS_KEY_ID'] ?? 'placeholder';
process.env['S3_SECRET_ACCESS_KEY'] = process.env['S3_SECRET_ACCESS_KEY'] ?? 'placeholder';
process.env['S3_FORCE_PATH_STYLE'] = process.env['S3_FORCE_PATH_STYLE'] ?? 'true';
